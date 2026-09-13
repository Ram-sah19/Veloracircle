const tls = require('tls');
const net = require('net');

/**
 * Lightweight SMTP client using Node.js built-in net and tls sockets.
 * Does not require external packages. Works with Gmail SMTP, Outlook, SendGrid, Mailgun, or custom SMTP servers.
 */
class SimpleSmtpClient {
  constructor(options = {}) {
    this.host = (options.host || process.env.SMTP_HOST || 'smtp.gmail.com').trim();
    this.port = parseInt(options.port || process.env.SMTP_PORT || '465', 10);
    this.secure = options.secure !== undefined ? options.secure : this.port === 465;
    this.user = (options.user || process.env.SMTP_USER || '').trim().replace(/^["']|["']$/g, '');
    this.pass = (options.pass || process.env.SMTP_PASS || '').trim().replace(/\s+/g, '').replace(/^["']|["']$/g, '');
    this.from = options.from || process.env.SMTP_FROM || `"Velora Circle" <${this.user || 'noreply@veloracircle.com'}>`;
  }

  isConfigured() {
    return Boolean(this.user && this.pass);
  }

  async sendMail({ to, subject, html, text }) {
    if (!this.isConfigured()) {
      return {
        sent: false,
        reason: 'SMTP credentials not configured in backend/.env',
      };
    }

    return new Promise((resolve, reject) => {
      let socket;
      const timeout = 15000;

      const finish = (err, result) => {
        if (socket && !socket.destroyed) {
          try {
            socket.write('QUIT\r\n');
            socket.end();
          } catch {}
        }
        if (err) reject(err);
        else resolve(result);
      };

      const connectSocket = () => {
        if (this.secure) {
          return tls.connect({
            host: this.host,
            port: this.port,
            rejectUnauthorized: false, // Prevents self-signed or proxy TLS issues in local dev
          });
        } else {
          return net.connect({
            host: this.host,
            port: this.port,
          });
        }
      };

      try {
        socket = connectSocket();
      } catch (e) {
        return finish(e);
      }

      socket.setTimeout(timeout, () => {
        finish(new Error(`SMTP connection timed out after ${timeout}ms`));
      });

      let step = 0;
      let buffer = '';

      const sendLine = (line) => {
        socket.write(`${line}\r\n`);
      };

      socket.on('data', (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split('\r\n');
        buffer = lines.pop(); // keep partial

        for (const line of lines) {
          if (!line) continue;
          const code = parseInt(line.substring(0, 3), 10);
          const isMultiline = line[3] === '-';
          if (isMultiline) continue;

          if (code >= 400) {
            return finish(new Error(`SMTP Error [${code}]: ${line}`));
          }

          // State Machine
          if (step === 0 && (code === 220 || code === 250)) {
            // Connected, say EHLO
            step = 1;
            sendLine(`EHLO veloracircle.local`);
          } else if (step === 1 && code === 250) {
            // Start AUTH LOGIN
            step = 2;
            sendLine(`AUTH LOGIN`);
          } else if (step === 2 && code === 334) {
            // Send Base64 Username
            step = 3;
            sendLine(Buffer.from(this.user).toString('base64'));
          } else if (step === 3 && code === 334) {
            // Send Base64 Password
            step = 4;
            sendLine(Buffer.from(this.pass).toString('base64'));
          } else if (step === 4 && (code === 235 || code === 250)) {
            // Auth successful, set MAIL FROM
            step = 5;
            sendLine(`MAIL FROM:<${this.user}>`);
          } else if (step === 5 && code === 250) {
            // RCPT TO
            step = 6;
            sendLine(`RCPT TO:<${to}>`);
          } else if (step === 6 && (code === 250 || code === 251)) {
            // DATA
            step = 7;
            sendLine(`DATA`);
          } else if (step === 7 && code === 354) {
            // Send body
            step = 8;
            const messageDate = new Date().toUTCString();
            const boundary = `----=_Part_${Date.now()}`;
            const messageId = `<${Date.now()}@velora.app>`;

            const rawEmail = [
              `From: ${this.from}`,
              `To: <${to}>`,
              `Subject: ${subject}`,
              `Date: ${messageDate}`,
              `Message-ID: ${messageId}`,
              `MIME-Version: 1.0`,
              `Content-Type: multipart/alternative; boundary="${boundary}"`,
              ``,
              `--${boundary}`,
              `Content-Type: text/plain; charset=UTF-8`,
              `Content-Transfer-Encoding: 7bit`,
              ``,
              text || '',
              ``,
              `--${boundary}`,
              `Content-Type: text/html; charset=UTF-8`,
              `Content-Transfer-Encoding: 7bit`,
              ``,
              html || text || '',
              ``,
              `--${boundary}--`,
              `.`,
            ].join('\r\n');

            sendLine(rawEmail);
          } else if (step === 8 && code === 250) {
            finish(null, { sent: true, response: line });
          }
        }
      });

      socket.on('error', (err) => {
        finish(err);
      });
    });
  }
}

/**
 * Sends a clean, modern HTML email containing the verification code.
 */
async function sendOtpEmail({ email, otp }) {
  const client = new SimpleSmtpClient();

  if (!client.isConfigured()) {
    return {
      sent: false,
      reason: 'SMTP_USER or SMTP_PASS not set in backend/.env',
    };
  }

  const subject = `Your Velora Circle Verification Code: ${otp}`;
  const text = `Your Velora Circle verification code is: ${otp}\n\nThis code will expire in 10 minutes. If you did not request this code, please ignore this email.`;

  const html = `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Velora Circle Verification Code</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f3f4f6;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0b0f19; padding: 40px 10px;">
        <tr>
          <td align="center">
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 520px; background: linear-gradient(180deg, #131b2e 0%, #0d121f 100%); border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.08); overflow: hidden; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);">
              
              <!-- Header with Logo -->
              <tr>
                <td style="padding: 36px 36px 20px 36px; text-align: center;">
                  <div style="display: inline-flex; align-items: center; justify-content: center;">
                    <div style="width: 44px; height: 44px; border-radius: 50%; background: linear-gradient(135deg, #6366f1, #a855f7); display: inline-block; vertical-align: middle; line-height: 44px; color: #ffffff; font-weight: bold; font-size: 20px;">
                      V
                    </div>
                    <span style="font-size: 22px; font-weight: 700; color: #ffffff; margin-left: 12px; letter-spacing: -0.5px; vertical-align: middle;">
                      Velora Circle
                    </span>
                  </div>
                </td>
              </tr>

              <!-- Body -->
              <tr>
                <td style="padding: 10px 36px 30px 36px; text-align: center;">
                  <h1 style="font-size: 20px; font-weight: 600; color: #ffffff; margin: 0 0 12px 0;">
                    Your Verification Code
                  </h1>
                  <p style="font-size: 14px; line-height: 1.6; color: #9ca3af; margin: 0 0 28px 0;">
                    Use the 6-digit code below to securely sign in to your Velora Circle workspace.
                  </p>

                  <!-- OTP Code Box -->
                  <div style="background: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 12px; padding: 18px 24px; display: inline-block; margin-bottom: 24px;">
                    <span style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #818cf8; font-family: 'Courier New', Courier, monospace;">
                      ${otp}
                    </span>
                  </div>

                  <p style="font-size: 13px; color: #6b7280; margin: 0 0 8px 0;">
                    ⏱️ This code will expire in <strong style="color: #9ca3af;">10 minutes</strong>.
                  </p>
                  <p style="font-size: 12px; color: #4b5563; margin: 0;">
                    If you didn't request this verification email, you can safely ignore it.
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="padding: 20px 36px; background-color: rgba(0, 0, 0, 0.2); border-top: 1px solid rgba(255, 255, 255, 0.05); text-align: center;">
                  <p style="font-size: 12px; color: #6b7280; margin: 0;">
                    Velora Circle &bull; Private, Peer-to-Peer Realtime Collaboration
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>
  `;

  return await client.sendMail({
    to: email,
    subject,
    text,
    html,
  });
}

module.exports = {
  SimpleSmtpClient,
  sendOtpEmail,
};
