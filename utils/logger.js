import fs from "fs";
import path from "path";

const LOG_DIR = "logs";

// Create logs directory if it doesn't exist
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

function formatDate() {
  return new Date().toISOString();
}

function getLogFile() {
  const date = new Date().toISOString().split("T")[0];
  return path.join(LOG_DIR, `${date}.log`);
}

function writeLog(level, message, data = null) {
  const logEntry = {
    timestamp: formatDate(),
    level,
    message,
    ...(data && { data }),
  };

  const logLine = JSON.stringify(logEntry) + "\n";

  // Console output
  if (level === "ERROR") {
    console.error(`[${level}] ${message}`, data || "");
  } else {
    console.log(`[${level}] ${message}`, data || "");
  }

  // File output
  fs.appendFileSync(getLogFile(), logLine);
}

const logger = {
  info: (message, data) => writeLog("INFO", message, data),
  error: (message, data) => writeLog("ERROR", message, data),
  warn: (message, data) => writeLog("WARN", message, data),
  debug: (message, data) => {
    if (process.env.NODE_ENV === "development") {
      writeLog("DEBUG", message, data);
    }
  },
};

export default logger;