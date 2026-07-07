// src/lib/logger.ts

const isProd = process.env.NODE_ENV === 'production';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const colors = {
  debug: '\x1b[36m',
  info:  '\x1b[32m',
  warn:  '\x1b[33m',
  error: '\x1b[31m',
  reset: '\x1b[0m',
};

function write(level: LogLevel, message: string, meta?: unknown) {
  const timestamp = new Date().toISOString();

  if (isProd) {
    console.log(JSON.stringify({
      timestamp, level, message,
      ...(meta ? { meta } : {}),
    }));
    return;
  }

  const color = colors[level];
  console.log(
    `${timestamp} ${color}[${level.toUpperCase()}]${colors.reset} ${message}`,
    meta ?? ''
  );
}
export const logger = {
  debug: (message: string, meta?: unknown) => write('debug', message, meta),
  info:  (message: string, meta?: unknown) => write('info',  message, meta),
  warn:  (message: string, meta?: unknown) => write('warn',  message, meta),
  error: (message: string, meta?: unknown) => write('error', message, meta),
};