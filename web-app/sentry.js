// Sentry/LogRocket integration example (Node.js, minimal)
// To use Sentry, set SENTRY_DSN in your .env file
const Sentry = require("@sentry/node");

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 1.0,
    environment: process.env.NODE_ENV || "development",
  });
}

module.exports = Sentry;
