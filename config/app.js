module.exports = {
  title: process.env.APP_TITLE || 'AI Comparison Platform',
  siteUrl: process.env.SITE_URL || 'http://localhost:3000',
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 30000, // 30 seconds default
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1 // 1 request per window
  }
};