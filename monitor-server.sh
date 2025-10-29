#!/bin/bash

# Henze Trivia Server Monitor
# Automatically starts, monitors, and restarts the game server with health checks

set -o pipefail

# Configuration
readonly WEB_APP_DIR="/Users/laurenadmin/Projects/henze-trivia/web-app"
readonly LOG_DIR="/Users/laurenadmin/Projects/henze-trivia/logs"
readonly MONITOR_LOG="${LOG_DIR}/monitor.log"
readonly SERVER_LOG="${LOG_DIR}/server-output.log"
readonly ERROR_PATTERNS="(error|Error|ERROR|warning|Warning|WARNING|disconnect|crash|EADDRINUSE|ECONNREFUSED|Cannot|Failed)"
readonly HEALTH_CHECK_INTERVAL=180  # 3 minutes
readonly MAX_RESTART_ATTEMPTS=5
readonly RESTART_COOLDOWN=10  # seconds between restart attempts

# Colors for output
readonly RED='\033[0;31m'
readonly YELLOW='\033[1;33m'
readonly GREEN='\033[0;32m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m' # No Color

# Global variables
SERVER_PID=""
RESTART_COUNT=0
LAST_HEALTH_CHECK=0
START_TIME=$(date +%s)

# Logging functions
log_info() {
    local msg="[$(date '+%Y-%m-%d %H:%M:%S')] INFO: $1"
    echo -e "${BLUE}${msg}${NC}"
    echo "$msg" >> "$MONITOR_LOG"
}

log_warning() {
    local msg="[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: $1"
    echo -e "${YELLOW}${msg}${NC}"
    echo "$msg" >> "$MONITOR_LOG"
}

log_error() {
    local msg="[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1"
    echo -e "${RED}${msg}${NC}"
    echo "$msg" >> "$MONITOR_LOG"
}

log_success() {
    local msg="[$(date '+%Y-%m-%d %H:%M:%S')] SUCCESS: $1"
    echo -e "${GREEN}${msg}${NC}"
    echo "$msg" >> "$MONITOR_LOG"
}

# Cleanup function
cleanup() {
    log_info "Shutting down monitor..."
    if [ -n "$SERVER_PID" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
        log_info "Stopping server (PID: $SERVER_PID)..."
        kill "$SERVER_PID" 2>/dev/null
        sleep 2
        if kill -0 "$SERVER_PID" 2>/dev/null; then
            log_warning "Server didn't stop gracefully, forcing..."
            kill -9 "$SERVER_PID" 2>/dev/null
        fi
    fi
    log_info "Monitor stopped."
    exit 0
}

trap cleanup SIGINT SIGTERM EXIT

# Check if port 3000 is already in use
check_port() {
    if lsof -ti:3000 >/dev/null 2>&1; then
        log_warning "Port 3000 is already in use"
        log_info "Killing existing process on port 3000..."
        lsof -ti:3000 | xargs kill -9 2>/dev/null
        sleep 2
    fi
}

# Start the server
start_server() {
    log_info "Starting game server..."

    # Check and clean port
    check_port

    # Ensure we're in the correct directory
    cd "$WEB_APP_DIR" || {
        log_error "Cannot change to web-app directory: $WEB_APP_DIR"
        return 1
    }

    # Start server in background and capture output
    npm run dev >> "$SERVER_LOG" 2>&1 &
    SERVER_PID=$!

    # Wait a moment to see if it starts successfully
    sleep 3

    if kill -0 "$SERVER_PID" 2>/dev/null; then
        log_success "Server started successfully (PID: $SERVER_PID)"
        RESTART_COUNT=0
        return 0
    else
        log_error "Server failed to start"
        SERVER_PID=""
        return 1
    fi
}

# Check if server is running
is_server_running() {
    if [ -n "$SERVER_PID" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
        return 0
    else
        return 1
    fi
}

# Attempt to restart server
restart_server() {
    local reason="$1"

    RESTART_COUNT=$((RESTART_COUNT + 1))

    log_warning "Server restart attempt $RESTART_COUNT/$MAX_RESTART_ATTEMPTS"
    log_warning "Reason: $reason"

    if [ $RESTART_COUNT -gt $MAX_RESTART_ATTEMPTS ]; then
        log_error "Maximum restart attempts reached. Manual intervention required."
        return 1
    fi

    # Stop existing server if running
    if [ -n "$SERVER_PID" ]; then
        kill "$SERVER_PID" 2>/dev/null || true
        sleep 2
    fi

    log_info "Waiting $RESTART_COOLDOWN seconds before restart..."
    sleep $RESTART_COOLDOWN

    start_server
    return $?
}

# Monitor server output for errors/warnings
monitor_output() {
    # Check last 50 lines of server output for issues
    if [ -f "$SERVER_LOG" ]; then
        local recent_output=$(tail -50 "$SERVER_LOG")

        # Check for critical errors
        if echo "$recent_output" | grep -iE "EADDRINUSE|port.*already in use" >/dev/null; then
            log_error "Port conflict detected!"
            log_info "Suggested fix: Another process is using port 3000. Attempting to clear..."
            return 1
        fi

        # Check for connection errors
        if echo "$recent_output" | grep -iE "ECONNREFUSED|connection refused" >/dev/null; then
            log_warning "Connection refused errors detected"
            log_info "Suggested fix: Check if database file is accessible and not locked"
        fi

        # Check for module errors
        if echo "$recent_output" | grep -iE "Cannot find module|MODULE_NOT_FOUND" >/dev/null; then
            log_error "Missing module detected!"
            log_info "Suggested fix: Run 'npm install' in $WEB_APP_DIR"
        fi

        # Check for syntax errors
        if echo "$recent_output" | grep -iE "SyntaxError|Unexpected token" >/dev/null; then
            log_error "Syntax error detected in code!"
            log_info "Suggested fix: Check recent code changes for syntax issues"
        fi

        # Display recent errors/warnings (last 5 unique ones)
        local issues=$(echo "$recent_output" | grep -iE "$ERROR_PATTERNS" | tail -5)
        if [ -n "$issues" ]; then
            echo -e "\n${YELLOW}Recent issues detected:${NC}"
            echo "$issues" | while IFS= read -r line; do
                echo -e "${YELLOW}  → ${line}${NC}"
            done
            echo ""
        fi
    fi

    return 0
}

# Health check and status report
health_check() {
    local current_time=$(date +%s)
    local elapsed=$((current_time - LAST_HEALTH_CHECK))

    if [ $elapsed -lt $HEALTH_CHECK_INTERVAL ]; then
        return 0
    fi

    LAST_HEALTH_CHECK=$current_time
    local uptime=$((current_time - START_TIME))
    local uptime_formatted=$(printf '%02d:%02d:%02d' $((uptime/3600)) $((uptime%3600/60)) $((uptime%60)))

    echo ""
    echo "=================================="
    log_info "SERVER HEALTH CHECK"
    echo "=================================="
    log_info "Uptime: $uptime_formatted"
    log_info "Restart count: $RESTART_COUNT"

    if is_server_running; then
        log_success "Status: RUNNING (PID: $SERVER_PID)"

        # Check active connections on port 3000
        local connections=$(lsof -ti:3000 | wc -l | tr -d ' ')
        log_info "Active connections: $connections"

        # Check if server is responding
        if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200\|301\|302"; then
            log_success "HTTP health check: PASSED"
        else
            log_warning "HTTP health check: Server not responding on http://localhost:3000"
        fi
    else
        log_error "Status: NOT RUNNING"
    fi

    # Database check
    if [ -f "$WEB_APP_DIR/../data/henze_trivia.db" ]; then
        local db_size=$(ls -lh "$WEB_APP_DIR/../data/henze_trivia.db" | awk '{print $5}')
        log_info "Database size: $db_size"
    fi

    echo "=================================="
    echo ""
}

# Main monitoring loop
main() {
    log_info "Henze Trivia Server Monitor started"
    log_info "Web app directory: $WEB_APP_DIR"
    log_info "Logs directory: $LOG_DIR"
    log_info "Server output: $SERVER_LOG"
    log_info "Monitor log: $MONITOR_LOG"
    echo ""

    # Create log directory if needed
    mkdir -p "$LOG_DIR"

    # Start the server
    if ! start_server; then
        log_error "Initial server start failed. Exiting."
        exit 1
    fi

    # Main monitoring loop
    while true; do
        sleep 5  # Check every 5 seconds

        # Check if server is still running
        if ! is_server_running; then
            log_error "Server has stopped unexpectedly!"

            # Try to determine why
            local last_error=$(tail -20 "$SERVER_LOG" | grep -iE "$ERROR_PATTERNS" | tail -1)
            if [ -n "$last_error" ]; then
                log_error "Last error: $last_error"
            fi

            # Attempt restart
            if ! restart_server "Server crashed"; then
                log_error "Failed to restart server. Exiting monitor."
                exit 1
            fi
        fi

        # Monitor for errors in output
        monitor_output

        # Periodic health check
        health_check
    done
}

# Run main function
main
