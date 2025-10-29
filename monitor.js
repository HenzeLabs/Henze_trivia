#!/usr/bin/env node

/**
 * Henze Trivia Server Monitor
 * Automatically starts, monitors, and restarts the game server
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

// Configuration
const CONFIG = {
  webAppDir: path.join(__dirname, 'web-app'),
  logDir: path.join(__dirname, 'logs'),
  healthCheckInterval: 180000, // 3 minutes
  restartCooldown: 10000, // 10 seconds
  maxRestartAttempts: 5,
  port: 3000,
};

// State
let serverProcess = null;
let restartCount = 0;
let startTime = Date.now();
let lastHealthCheck = 0;

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Logging functions
function log(level, message, color = colors.reset) {
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const logMessage = `[${timestamp}] ${level}: ${message}`;
  console.log(`${color}${logMessage}${colors.reset}`);

  // Write to log file
  const logFile = path.join(CONFIG.logDir, 'monitor.log');
  fs.appendFileSync(logFile, logMessage + '\n');
}

const logInfo = (msg) => log('INFO', msg, colors.blue);
const logSuccess = (msg) => log('SUCCESS', msg, colors.green);
const logWarning = (msg) => log('WARNING', msg, colors.yellow);
const logError = (msg) => log('ERROR', msg, colors.red);

// Error patterns to detect
const errorPatterns = [
  { pattern: /error/i, type: 'ERROR', severity: 'high' },
  { pattern: /warning/i, type: 'WARNING', severity: 'medium' },
  { pattern: /disconnect/i, type: 'DISCONNECT', severity: 'medium' },
  { pattern: /EADDRINUSE/, type: 'PORT_IN_USE', severity: 'critical', fix: 'Port 3000 is already in use. Kill the process using: lsof -ti:3000 | xargs kill -9' },
  { pattern: /ECONNREFUSED/, type: 'CONNECTION_REFUSED', severity: 'high', fix: 'Connection refused. Check if database is accessible.' },
  { pattern: /Cannot find module/, type: 'MODULE_NOT_FOUND', severity: 'critical', fix: 'Run: cd web-app && npm install' },
  { pattern: /SyntaxError/, type: 'SYNTAX_ERROR', severity: 'critical', fix: 'Check recent code changes for syntax errors.' },
  { pattern: /TypeError/, type: 'TYPE_ERROR', severity: 'high' },
  { pattern: /cb is not a function/, type: 'CALLBACK_ERROR', severity: 'high', fix: 'Check callback handling in socket event handlers.' },
];

// Check if port is in use
function isPortInUse(port) {
  return new Promise((resolve) => {
    const server = http.createServer();
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(true);
      } else {
        resolve(false);
      }
    });
    server.once('listening', () => {
      server.close();
      resolve(false);
    });
    server.listen(port);
  });
}

// Kill process on port
async function killProcessOnPort(port) {
  return new Promise((resolve) => {
    const cmd = spawn('lsof', ['-ti', `:${port}`]);
    let pids = '';

    cmd.stdout.on('data', (data) => {
      pids += data.toString();
    });

    cmd.on('close', (code) => {
      if (pids.trim()) {
        const pidList = pids.trim().split('\n');
        pidList.forEach((pid) => {
          try {
            process.kill(parseInt(pid), 'SIGKILL');
            logInfo(`Killed process ${pid} on port ${port}`);
          } catch (err) {
            // Process might already be dead
          }
        });
      }
      resolve();
    });
  });
}

// Analyze output for issues
function analyzeOutput(data) {
  const lines = data.toString().split('\n');

  lines.forEach((line) => {
    if (!line.trim()) return;

    // Check against error patterns
    errorPatterns.forEach((pattern) => {
      if (pattern.pattern.test(line)) {
        const severity = pattern.severity;
        const type = pattern.type;

        if (severity === 'critical') {
          logError(`${type}: ${line.trim()}`);
          if (pattern.fix) {
            logInfo(`💡 Suggested fix: ${pattern.fix}`);
          }
        } else if (severity === 'high') {
          logError(`${type}: ${line.trim()}`);
          if (pattern.fix) {
            logInfo(`💡 Suggested fix: ${pattern.fix}`);
          }
        } else if (severity === 'medium') {
          logWarning(`${type}: ${line.trim()}`);
        }
      }
    });
  });
}

// Start the server
async function startServer() {
  logInfo('Starting game server...');

  // Check if port is in use
  if (await isPortInUse(CONFIG.port)) {
    logWarning(`Port ${CONFIG.port} is already in use`);
    logInfo('Attempting to clear port...');
    await killProcessOnPort(CONFIG.port);
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  return new Promise((resolve) => {
    // Ensure log directory exists
    if (!fs.existsSync(CONFIG.logDir)) {
      fs.mkdirSync(CONFIG.logDir, { recursive: true });
    }

    const serverLogPath = path.join(CONFIG.logDir, 'server-output.log');
    const serverLogStream = fs.createWriteStream(serverLogPath, { flags: 'a' });

    // Start npm run dev
    serverProcess = spawn('npm', ['run', 'dev'], {
      cwd: CONFIG.webAppDir,
      env: { ...process.env },
      shell: true,
    });

    // Capture stdout
    serverProcess.stdout.on('data', (data) => {
      const output = data.toString();
      process.stdout.write(colors.cyan + output + colors.reset);
      serverLogStream.write(output);
      analyzeOutput(data);
    });

    // Capture stderr
    serverProcess.stderr.on('data', (data) => {
      const output = data.toString();
      process.stderr.write(colors.yellow + output + colors.reset);
      serverLogStream.write(output);
      analyzeOutput(data);
    });

    // Handle process exit
    serverProcess.on('close', (code) => {
      serverLogStream.end();
      if (code !== 0 && code !== null) {
        logError(`Server exited with code ${code}`);
        handleServerCrash(`Exited with code ${code}`);
      }
    });

    serverProcess.on('error', (err) => {
      logError(`Failed to start server: ${err.message}`);
      serverLogStream.end();
      resolve(false);
    });

    // Wait a bit to see if it starts successfully
    setTimeout(() => {
      if (serverProcess && !serverProcess.killed) {
        logSuccess(`Server started successfully (PID: ${serverProcess.pid})`);
        restartCount = 0;
        startTime = Date.now();
        resolve(true);
      } else {
        logError('Server failed to start');
        resolve(false);
      }
    }, 3000);
  });
}

// Handle server crash
async function handleServerCrash(reason) {
  restartCount++;

  logWarning(`Server restart attempt ${restartCount}/${CONFIG.maxRestartAttempts}`);
  logWarning(`Reason: ${reason}`);

  if (restartCount > CONFIG.maxRestartAttempts) {
    logError('Maximum restart attempts reached. Manual intervention required.');
    logError('Exiting monitor. Please check logs and restart manually.');
    process.exit(1);
  }

  logInfo(`Waiting ${CONFIG.restartCooldown / 1000} seconds before restart...`);
  await new Promise((resolve) => setTimeout(resolve, CONFIG.restartCooldown));

  const started = await startServer();
  if (!started) {
    logError('Failed to restart server');
    process.exit(1);
  }
}

// Health check
async function healthCheck() {
  const now = Date.now();
  const elapsed = now - lastHealthCheck;

  if (elapsed < CONFIG.healthCheckInterval) {
    return;
  }

  lastHealthCheck = now;
  const uptime = now - startTime;
  const hours = Math.floor(uptime / 3600000);
  const minutes = Math.floor((uptime % 3600000) / 60000);
  const seconds = Math.floor((uptime % 60000) / 1000);

  console.log('\n' + '='.repeat(50));
  logInfo('SERVER HEALTH CHECK');
  console.log('='.repeat(50));
  logInfo(`Uptime: ${hours}h ${minutes}m ${seconds}s`);
  logInfo(`Restart count: ${restartCount}`);

  if (serverProcess && !serverProcess.killed) {
    logSuccess(`Status: RUNNING (PID: ${serverProcess.pid})`);

    // HTTP health check
    const options = {
      hostname: 'localhost',
      port: CONFIG.port,
      path: '/',
      method: 'GET',
      timeout: 5000,
    };

    const req = http.request(options, (res) => {
      if (res.statusCode >= 200 && res.statusCode < 400) {
        logSuccess('HTTP health check: PASSED');
      } else {
        logWarning(`HTTP health check: Server returned status ${res.statusCode}`);
      }
    });

    req.on('error', (err) => {
      logWarning(`HTTP health check: FAILED - ${err.message}`);
    });

    req.on('timeout', () => {
      logWarning('HTTP health check: TIMEOUT');
      req.destroy();
    });

    req.end();
  } else {
    logError('Status: NOT RUNNING');
    await handleServerCrash('Process not found during health check');
  }

  // Database check
  const dbPath = path.join(__dirname, 'data', 'henze_trivia.db');
  if (fs.existsSync(dbPath)) {
    const stats = fs.statSync(dbPath);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
    logInfo(`Database size: ${sizeMB} MB`);
  } else {
    logWarning('Database file not found');
  }

  console.log('='.repeat(50) + '\n');
}

// Cleanup on exit
function cleanup() {
  logInfo('Shutting down monitor...');

  if (serverProcess && !serverProcess.killed) {
    logInfo(`Stopping server (PID: ${serverProcess.pid})...`);
    serverProcess.kill('SIGTERM');

    setTimeout(() => {
      if (serverProcess && !serverProcess.killed) {
        logWarning('Server did not stop gracefully, forcing...');
        serverProcess.kill('SIGKILL');
      }
    }, 5000);
  }

  logInfo('Monitor stopped.');
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Main function
async function main() {
  console.log('\n' + '='.repeat(50));
  logInfo('🎮 Henze Trivia Server Monitor Started');
  console.log('='.repeat(50));
  logInfo(`Web app directory: ${CONFIG.webAppDir}`);
  logInfo(`Logs directory: ${CONFIG.logDir}`);
  logInfo(`Server port: ${CONFIG.port}`);
  logInfo(`Health check interval: ${CONFIG.healthCheckInterval / 1000}s`);
  console.log('='.repeat(50) + '\n');

  // Ensure directories exist
  if (!fs.existsSync(CONFIG.logDir)) {
    fs.mkdirSync(CONFIG.logDir, { recursive: true });
  }

  // Start the server
  const started = await startServer();
  if (!started) {
    logError('Initial server start failed. Exiting.');
    process.exit(1);
  }

  // Set up periodic health checks
  setInterval(() => {
    healthCheck();
  }, 30000); // Check every 30 seconds

  logInfo('Monitor is running. Press Ctrl+C to stop.');
}

// Run
main().catch((err) => {
  logError(`Fatal error: ${err.message}`);
  console.error(err);
  process.exit(1);
});
