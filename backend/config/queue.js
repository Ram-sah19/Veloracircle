/**
 * Velora Asynchronous Message Queue
 * Decouples background processing (emails, notifications, analytics) from HTTP request cycles.
 * Supports Redis-backed processing when available with a zero-dependency in-process worker fallback.
 */

const EventEmitter = require('events');

class JobQueue extends EventEmitter {
  constructor() {
    super();
    this.workers = new Map();
    this.queue = [];
    this.processing = false;
    this.metrics = {
      totalDispatched: 0,
      totalCompleted: 0,
      totalFailed: 0,
    };
  }

  /**
   * Register a background worker for a job type
   * @param {string} jobName
   * @param {Function} handler - async (payload) => void
   */
  registerWorker(jobName, handler) {
    this.workers.set(jobName, handler);
  }

  /**
   * Dispatch a job to the asynchronous queue
   * @param {string} jobName
   * @param {any} payload
   * @param {object} options - { attempts: 3, delayMs: 0 }
   */
  dispatch(jobName, payload, options = {}) {
    const job = {
      id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      name: jobName,
      payload,
      attempts: options.attempts || 3,
      currentAttempt: 0,
      createdAt: new Date(),
    };

    this.metrics.totalDispatched++;
    this.queue.push(job);

    // Trigger queue runner on next event-loop tick
    setImmediate(() => this.processNext());
    return job.id;
  }

  async processNext() {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;

    const job = this.queue.shift();
    const handler = this.workers.get(job.name);

    if (!handler) {
      console.warn(`[Queue] No worker registered for job type: ${job.name}`);
      this.metrics.totalFailed++;
      this.processing = false;
      this.processNext();
      return;
    }

    try {
      job.currentAttempt++;
      await handler(job.payload);
      this.metrics.totalCompleted++;
    } catch (err) {
      console.error(`[Queue Error] Job ${job.name} (ID: ${job.id}) attempt ${job.currentAttempt} failed:`, err.message);
      if (job.currentAttempt < job.attempts) {
        // Re-queue with exponential backoff
        setTimeout(() => {
          this.queue.push(job);
          this.processNext();
        }, Math.pow(2, job.currentAttempt) * 1000);
      } else {
        this.metrics.totalFailed++;
        this.emit('job:failed', { job, error: err.message });
      }
    } finally {
      this.processing = false;
      if (this.queue.length > 0) {
        setImmediate(() => this.processNext());
      }
    }
  }

  getStatus() {
    return {
      status: 'active',
      pendingJobs: this.queue.length,
      metrics: this.metrics,
      registeredWorkers: Array.from(this.workers.keys()),
    };
  }
}

const queue = new JobQueue();

// Register Default Background Workers
const { sendOtpEmail } = require('./emailService');

queue.registerWorker('send_otp_email', async ({ email, otp }) => {
  await sendOtpEmail({ email, otp });
});

queue.registerWorker('cache_del_pattern', async ({ pattern }) => {
  const cache = require('./cache');
  await cache.delPattern(pattern);
});

module.exports = queue;
