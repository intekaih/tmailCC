#!/bin/bash
# ============================================================
# TMail System Status Check Script
# ============================================================

echo "=============================================="
echo " TMail System Status Check"
echo "=============================================="
echo ""

check_service() {
    local name="$1"
    local cmd="$2"
    echo -n "  $name: "
    if eval "$cmd" &>/dev/null; then
        echo "OK"
        return 0
    else
        echo "DOWN"
        return 1
    fi
}

check_port() {
    local name="$1"
    local port="$2"
    echo -n "  $name (port $port): "
    if command -v nc &>/dev/null; then
        if nc -z localhost "$port" 2>/dev/null; then
            echo "LISTENING"
            return 0
        fi
    fi
    if command -v curl &>/dev/null; then
        if curl -sf "http://localhost:$port/api/health" &>/dev/null; then
            echo "OK"
            return 0
        fi
    fi
    echo "NOT REACHABLE"
    return 1
}

echo "[Services]"
check_service "cloudflared" "pgrep -f cloudflared"

echo ""
echo "[Ports]"
check_port "tmail-app" 3000

echo ""
echo "[PM2 Status]"
if command -v pm2 &>/dev/null; then
    pm2 list 2>/dev/null || echo "  PM2 not running"
else
    echo "  PM2 not installed"
fi

echo ""
echo "[Recent Errors]"
if [ -d "./logs" ]; then
    find ./logs -name "*.log" -mmin -30 -exec tail -n 3 {} \; 2>/dev/null | tail -20 || echo "  No recent logs"
else
    echo "  No logs directory"
fi

echo ""
echo "=============================================="
