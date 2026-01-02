const winston = require('winston');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
require('winston-daily-rotate-file');
const cls = require('cls-hooked');

// Setup CLS context
const namespace = cls.createNamespace('logger');
const runWithRequestId = (reqId, fn) => {
  namespace.run(() => {
    namespace.set('requestId', reqId);
    fn();
  });
};
const getRequestId = () => namespace.get('requestId') || 'no-req-id';

// DayJS config
dayjs.extend(utc);
dayjs.extend(timezone);

const baseLogsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(baseLogsDir)) {
  fs.mkdirSync(baseLogsDir);
}

const today = dayjs().tz('Asia/Kolkata').format('YYYY-MM-DD');
const datedLogDir = path.join(baseLogsDir, today);
if (!fs.existsSync(datedLogDir)) {
  fs.mkdirSync(datedLogDir, { recursive: true });
}

const timestampFormat = () => dayjs().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');

const sanitizeLogs = winston.format(info => {
  if (typeof info.message === 'string') {
    info.message = info.message.replace(/Bearer\s+[A-Za-z0-9-_]+/g, 'Bearer [REDACTED]');
  }
  return info;
});

const jsonFormatter = winston.format.combine(
  sanitizeLogs(),
  winston.format.timestamp({ format: timestampFormat }),
  winston.format.json()
);

const stringifySafe = input => {
  try {
    if (typeof input === 'object' && input !== null) {
      return JSON.stringify(input, null, 2);
    }
    return String(input);
  } catch (err) {
    console.error('Error stringifying input for logger:', err);
    return '[Unserializable input]';
  }
};

const consoleFormat = winston.format.combine(
  sanitizeLogs(),
  winston.format.timestamp({ format: timestampFormat }),
  winston.format.printf(({ level, message, timestamp, ...meta }) => {
    const safeMessage = stringifySafe(message);
    const safeTimestamp = stringifySafe(timestamp);
    const extraMeta =
      Object.keys(meta).length > 0 ? `\nMeta: ${JSON.stringify(meta, null, 2)}` : '';

    return `${safeTimestamp} [${level}] [${getRequestId()}] - ${safeMessage}${extraMeta}`;
  })
);
const errorTransport = new winston.transports.DailyRotateFile({
  filename: path.join(datedLogDir, 'error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '50m',
  maxFiles: '5d',
  level: 'error',
  format: jsonFormatter,
});

const combinedTransport = new winston.transports.DailyRotateFile({
  filename: path.join(datedLogDir, 'combined-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d',
  format: jsonFormatter,
});

const accessTransport = new winston.transports.DailyRotateFile({
  filename: path.join(datedLogDir, 'access-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d',
  level: 'http',
  format: jsonFormatter,
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'product-search-service' },
  transports: [
    errorTransport,
    combinedTransport,
    accessTransport,
    new winston.transports.Console({ format: consoleFormat }),
  ],
  exitOnError: false,
});

// Handle exceptions and unhandled rejections
logger.exceptions.handle(
  new winston.transports.DailyRotateFile({
    filename: path.join(datedLogDir, 'exceptions-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d',
    format: jsonFormatter,
  })
);

process.on('unhandledRejection', err => {
  logger.error('Unhandled Rejection', { error: err });
});

// Middleware to log requests
const requestLogger = (req, res, next) => {
  const requestId = uuidv4();
  req.requestId = requestId;
  req.startTime = Date.now();

  namespace.bindEmitter(req);
  namespace.bindEmitter(res);

  runWithRequestId(requestId, () => {
    logger.http({
      method: req.method,
      path: req.originalUrl,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      message: `Incoming request: ${req.method} ${req.originalUrl}`,
    });

    const originalEnd = res.end;
    res.end = function (...args) {
      const responseTime = Date.now() - req.startTime;
      const level = res.statusCode >= 400 ? 'warn' : 'http';

      logger[level]({
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        responseTime: `${responseTime}ms`,
        message: `${req.method} ${req.originalUrl} ${res.statusCode} ${responseTime}ms`,
      });

      originalEnd.apply(res, args);
    };

    next();
  });
};

module.exports = {
  logger,
  requestLogger,
  runWithRequestId,
  getRequestId,
};
