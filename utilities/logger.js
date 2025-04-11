const fs = require('fs');
const path = require('path');
const pino = require('pino');

// Define colors for pretty-printing
const colors = {
  trace: '\x1b[37m',
  debug: '\x1b[36m',
  info: '\x1b[32m',
  warn: '\x1b[33m',
  error: '\x1b[31m',
  fatal: '\x1b[35m',
  reset: '\x1b[0m'
};

function prettyPrint(log) {
  const timestamp = new Date(log.time).toISOString();
  const level = log.level;
  const color = colors[level] || colors.info;
  return `${timestamp} ${color}[${log.name}] ${level}: ${log.msg}${colors.reset}`;
}

const prettyStream = {
  write: (chunk) => {
    const log = JSON.parse(chunk);
    console.log(prettyPrint(log));
  }
};

const jsonlStream = (filePath) => fs.createWriteStream(filePath, { flags: 'a' });

function getCurrentDate() {
  return new Date().toISOString().split('T')[0];
}

function createLogger(moduleName, format = 'plain') {
  const logDir = 'logs';

  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  const date = getCurrentDate();
  const fileExtension = format === 'jsonl' ? 'jsonl' : 'log';
  const fileName = `${moduleName}-${date}.${fileExtension}`;
  const logFilePath = path.join(logDir, fileName);

  const logFileStream = format === 'jsonl'
    ? jsonlStream(logFilePath)
    : fs.createWriteStream(logFilePath, { flags: 'a' });

  return pino({
    formatters: {
      level(label) {
        return { level: label };
      },
    },
    base: { name: moduleName },
  }, pino.multistream([
    { stream: prettyStream }, 
    { stream: logFileStream } 
  ]));
}

module.exports = createLogger;
