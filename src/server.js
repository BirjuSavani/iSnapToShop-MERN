require("dotenv").config();
// IMPORTANT: Make sure to import `instrument.js` at the top of your file.
// If you're using ECMAScript Modules (ESM) syntax, use `import "./instrument.js";`
// require("./utils/instrument");
const { logger } = require("./utils/logger");
// const Sentry = require('./src/utils/instrument');
const connectDB = require("./config/db");

const port = process.env.BACKEND_PORT || 8080;

// The error handler must be registered before any other error middleware and after all controllers
// Sentry.setupExpressErrorHandler(app);

/**
 * Connect to MongoDB
 */
try {
  connectDB();
  logger.info("Connected to MongoDB");
} catch (error) {
  logger.error("MongoDB connection error:", error);
  process.exit(1);
}

const app = require("./app");

app.listen(port,'127.0.0.1', () => {
  console.log(`Server is running on port ${port}`);
  logger.info(`🚀 Server listening at http://localhost:${port}`);
});
