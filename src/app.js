const express = require("express");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const path = require("path");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");
const cors = require("cors");
const { logger, requestLogger } = require("./utils/logger");

dayjs.extend(utc);
dayjs.extend(timezone);

const scanRoutes = require("./routes/scanRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");

const app = express();

// Middleware
app.use(cookieParser("ext.session"));
app.use(express.json());
app.use(bodyParser.json({ limit: "2mb" }));
app.use("/generated", express.static(path.join(__dirname, "public/generated")));
app.use(requestLogger);

app.use(
  cors({
    origin: process.env.FRONTEND_URL, // frontend
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
// Enable CORS
app.options("*", cors());

app.use("/api/platform/scan", scanRoutes);
app.use("/api/analytics", analyticsRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  try {
    logger.info("Health check accessed");
    res.json({ success: true, message: "Server is running" });
  } catch (error) {
    logger.error("Error in health check", { error });
    // Sentry.captureException("Error in health check function", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = app;
