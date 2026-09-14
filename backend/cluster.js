/**
 * Velora Production Cluster Manager
 * Spawns multiple worker processes sharing the same port using Node.js cluster module.
 * Provides self-healing workers and cross-process Socket.IO communication.
 */

require('dotenv').config();
const cluster = require('cluster');
const http = require('http');
const os = require('os');

// Number of workers to spawn (defaults to CPU cores or 2)
const numCPUs = Math.min(os.cpus().length, parseInt(process.env.WEB_CONCURRENCY, 10) || 2);

if (cluster.isPrimary || cluster.isMaster) {
  console.log(`\n======================================================`);
  console.log(`⚡ Velora Cluster Master Process PID: ${process.pid}`);
  console.log(`💻 Detected ${os.cpus().length} CPU core(s). Spawning ${numCPUs} worker(s)...`);
  console.log(`🔄 Zero-downtime auto-healing enabled`);
  console.log(`======================================================\n`);

  // Try to bind Socket.IO cluster primary adapter if available
  try {
    const { setupMaster } = require('@socket.io/cluster-adapter');
    setupMaster();
    console.log(`📡 [Cluster Master] Socket.IO cross-worker cluster adapter active.`);
  } catch {
    console.log(`ℹ️ [Cluster Master] Running standard Node.js OS socket load-balancing.`);
  }

  // Fork workers
  for (let i = 0; i < numCPUs; i++) {
    const worker = cluster.fork();
    console.log(`  └─ Spawned Worker #${worker.id} (PID: ${worker.process.pid})`);
  }

  // Self-healing: Respawn worker if one exits unexpectedly
  cluster.on('exit', (worker, code, signal) => {
    console.warn(`\n⚠️ [Cluster Warning] Worker #${worker.id} (PID: ${worker.process.pid}) died (code: ${code}, signal: ${signal}).`);
    console.log(`🚀 [Cluster Auto-Healing] Launching replacement worker...`);
    const newWorker = cluster.fork();
    console.log(`  └─ New Worker #${newWorker.id} (PID: ${newWorker.process.pid}) online.\n`);
  });

  // Graceful shutdown
  const shutdown = () => {
    console.log('\n[Cluster Master] Terminating all workers gracefully...');
    for (const id in cluster.workers) {
      cluster.workers[id].kill('SIGINT');
    }
    setTimeout(() => {
      process.exit(0);
    }, 2000);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
} else {
  // Worker process: runs the Express + Socket.IO server
  require('./server');
}
