// middleware/securityMiddleware.js
const sendSecurityAlert = require('../utils/sendAlert');

const suspiciousPatterns = [/select.+from/i, /<script>/i, /union.+select/i, /(\%27)|(\')|(\-\-)|(\%23)|(#)/i];

let requestLog = {}; // { ip: { count, timestamp } }

const securityMiddleware = async (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const route = req.originalUrl;
  const userAgent = req.headers['user-agent'] || '';

  // 1. Check for known malicious patterns
  const payload = JSON.stringify(req.body || {}) + JSON.stringify(req.query || {});
  const isSuspicious = suspiciousPatterns.some((pattern) => pattern.test(payload));

  if (isSuspicious) {
    await sendSecurityAlert({
      subject: '🚨 SQL/XSS Attempt Detected',
      message: `Payload: ${payload}`,
      ip,
      route
    });
    return res.status(400).json({ error: 'Suspicious activity detected.' });
  }

  // 2. Track IP abuse (basic DDoS/rate limit detection)
  if (!requestLog[ip]) {
    requestLog[ip] = { count: 1, timestamp: Date.now() };
  } else {
    requestLog[ip].count += 1;
    const timeWindow = Date.now() - requestLog[ip].timestamp;

    if (timeWindow < 10000 && requestLog[ip].count > 50) {
      await sendSecurityAlert({
        subject: '🚨 Potential DDoS Attack Detected',
        message: `50+ requests in ${timeWindow / 1000}s\nUser-Agent: ${userAgent}`,
        ip,
        route
      });
      return res.status(429).json({ error: 'Too many requests. You are blocked temporarily.' });
    }
  }

  // 3. Detect suspicious user agents
  if (/curl|python|wget|scrapy|node-fetch/i.test(userAgent)) {
    await sendSecurityAlert({
      subject: '🕵️ Suspicious User-Agent Detected',
      message: `User-Agent: ${userAgent}`,
      ip,
      route
    });
  }

  next();
};

module.exports = securityMiddleware;
// utils/sendAlert.js