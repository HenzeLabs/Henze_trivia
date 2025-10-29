# Server Monitoring Guide

Automated monitoring and management for the Henze Trivia game server.

## Quick Start

The easiest way to start your server with monitoring:

```bash
./start-monitored.sh
```

This will automatically choose the best monitoring script and start your server.

## Features

✅ **Automatic Server Start** - Starts `npm run dev` in the web-app directory
✅ **Real-time Error Detection** - Monitors console output for errors, warnings, and issues
✅ **Smart Suggestions** - Provides automatic fix suggestions for common errors
✅ **Auto-Restart** - Automatically restarts the server if it crashes
✅ **Health Checks** - Periodic health reports every 3 minutes
✅ **Connection Monitoring** - Tracks active connections and HTTP status
✅ **Crash Protection** - Maximum restart attempts with cooldown periods
✅ **Detailed Logging** - All output saved to `logs/` directory

## Available Monitoring Scripts

### 1. Node.js Monitor (Recommended)

```bash
node monitor.js
```

**Best for:**
- Better integration with the Node.js server
- Colored console output
- Real-time error analysis
- Easier to customize

**Features:**
- Detects 8+ types of common errors
- Automatic fix suggestions
- HTTP health checks
- Database size monitoring
- Graceful shutdown handling

### 2. Bash Monitor (Alternative)

```bash
./monitor-server.sh
```

**Best for:**
- Systems without Node.js
- Shell script preference
- Minimal dependencies

## Monitored Error Types

The monitor automatically detects and suggests fixes for:

| Error Type | Detection | Auto-Fix Suggestion |
|------------|-----------|---------------------|
| **Port in Use** | `EADDRINUSE` | Kills process on port 3000 |
| **Module Not Found** | `Cannot find module` | Suggests `npm install` |
| **Connection Refused** | `ECONNREFUSED` | Check database accessibility |
| **Syntax Errors** | `SyntaxError` | Review recent code changes |
| **Type Errors** | `TypeError` | Debug type mismatches |
| **Callback Errors** | `cb is not a function` | Fix socket handler callbacks |
| **Disconnects** | `disconnect` | Log and monitor |
| **General Warnings** | `warning/Warning` | Display and log |

## Health Check Reports

Every 3 minutes, you'll see a report like this:

```
==================================================
[2025-10-27 18:30:45] INFO: SERVER HEALTH CHECK
==================================================
[2025-10-27 18:30:45] INFO: Uptime: 0h 15m 32s
[2025-10-27 18:30:45] INFO: Restart count: 0
[2025-10-27 18:30:45] SUCCESS: Status: RUNNING (PID: 12345)
[2025-10-27 18:30:45] SUCCESS: HTTP health check: PASSED
[2025-10-27 18:30:45] INFO: Database size: 0.12 MB
==================================================
```

## Configuration

### Node.js Monitor (`monitor.js`)

Edit the `CONFIG` object at the top of the file:

```javascript
const CONFIG = {
  webAppDir: path.join(__dirname, 'web-app'),
  logDir: path.join(__dirname, 'logs'),
  healthCheckInterval: 180000, // 3 minutes in ms
  restartCooldown: 10000, // 10 seconds
  maxRestartAttempts: 5,
  port: 3000,
};
```

### Bash Monitor (`monitor-server.sh`)

Edit these variables at the top:

```bash
readonly HEALTH_CHECK_INTERVAL=180  # seconds
readonly MAX_RESTART_ATTEMPTS=5
readonly RESTART_COOLDOWN=10  # seconds
```

## Logs

All logs are saved to the `logs/` directory:

- **`monitor.log`** - Monitor activity and decisions
- **`server-output.log`** - Complete server console output
- **`error.log`** - Server errors (from your app)

### View Logs

```bash
# Watch monitor activity
tail -f logs/monitor.log

# Watch server output
tail -f logs/server-output.log

# View recent errors
tail -50 logs/error.log
```

## Manual Control

### Start Server with Monitoring
```bash
node monitor.js
# or
./monitor-server.sh
# or
./start-monitored.sh
```

### Stop Server
Press `Ctrl+C` - The monitor will gracefully shutdown the server

### Kill Stuck Server
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or kill all node processes
killall -9 node
```

### Restart Server
The monitor handles this automatically, but you can manually:

1. Stop the monitor (`Ctrl+C`)
2. Wait 2-3 seconds
3. Restart: `node monitor.js`

## Troubleshooting

### Monitor won't start

**Problem:** `Permission denied`
**Solution:**
```bash
chmod +x monitor.js monitor-server.sh start-monitored.sh
```

**Problem:** Port 3000 already in use
**Solution:** The monitor auto-kills the process, but if it fails:
```bash
lsof -ti:3000 | xargs kill -9
```

### Server keeps crashing

Check the logs for patterns:

```bash
# See what's causing restarts
grep "restart attempt" logs/monitor.log

# See actual errors
tail -100 logs/server-output.log | grep -i error
```

### Too many restarts

The monitor will exit after 5 restart attempts. This means there's a persistent issue:

1. Check `logs/server-output.log` for the root cause
2. Check `logs/error.log` for application errors
3. Verify dependencies: `cd web-app && npm install`
4. Check database: `ls -lh data/henze_trivia.db`

### Health checks failing

**Problem:** HTTP check fails but server is running
**Causes:**
- Server started but not listening on port 3000
- Firewall blocking localhost connections
- Server crashed during startup

**Solution:**
```bash
# Verify server is actually listening
lsof -i:3000

# Test manually
curl http://localhost:3000
```

## Advanced Usage

### Run in Background (detached)

```bash
# Using nohup
nohup node monitor.js > /dev/null 2>&1 &

# Using screen
screen -dmS trivia-monitor node monitor.js

# Reattach to screen
screen -r trivia-monitor
```

### Monitor Multiple Instances

Edit the port and directory in the config, then run multiple monitors:

```bash
# Instance 1 (port 3000)
node monitor.js &

# Instance 2 (port 3001) - requires config changes
# Edit monitor.js CONFIG.port = 3001
node monitor.js &
```

### Custom Error Patterns

Add to `errorPatterns` array in `monitor.js`:

```javascript
{
  pattern: /YOUR_REGEX_HERE/,
  type: 'YOUR_ERROR_TYPE',
  severity: 'critical', // or 'high', 'medium'
  fix: 'Your suggested fix here'
}
```

## Integration with systemd (Linux)

Create `/etc/systemd/system/henze-trivia.service`:

```ini
[Unit]
Description=Henze Trivia Game Server Monitor
After=network.target

[Service]
Type=simple
User=yourusername
WorkingDirectory=/path/to/henze-trivia
ExecStart=/usr/bin/node /path/to/henze-trivia/monitor.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable henze-trivia
sudo systemctl start henze-trivia
sudo systemctl status henze-trivia
```

## Integration with launchd (macOS)

Create `~/Library/LaunchAgents/com.henze.trivia.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.henze.trivia</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/node</string>
        <string>/Users/laurenadmin/Projects/henze-trivia/monitor.js</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/Users/laurenadmin/Projects/henze-trivia/logs/launchd-stdout.log</string>
    <key>StandardErrorPath</key>
    <string>/Users/laurenadmin/Projects/henze-trivia/logs/launchd-stderr.log</string>
</dict>
</plist>
```

Load the service:
```bash
launchctl load ~/Library/LaunchAgents/com.henze.trivia.plist
launchctl start com.henze.trivia
```

## Tips

1. **Use the Node.js monitor** - It has better error detection and suggestions
2. **Check logs regularly** - Even with auto-restart, review logs for patterns
3. **Monitor database growth** - The health check shows DB size
4. **Test restart behavior** - Kill the server manually to verify auto-restart works
5. **Adjust intervals** - Tune health check frequency based on your needs

## Support

For issues with the monitoring scripts:
1. Check the logs in `logs/`
2. Verify file permissions (`chmod +x`)
3. Test server manually: `cd web-app && npm run dev`
4. Check port availability: `lsof -ti:3000`

## Next Steps

Once monitoring is stable, consider:
- Setting up email/SMS alerts for crashes
- Integrating with monitoring services (PM2, New Relic, etc.)
- Adding performance metrics (CPU, memory usage)
- Implementing log rotation for large log files
