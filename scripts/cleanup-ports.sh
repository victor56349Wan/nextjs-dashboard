#!/bin/bash

# 清理Next.js开发服务器占用的端口
echo "Checking for processes on ports 3000, 3001, 3002..."

# 检查并终止占用常用端口的Next.js进程
for port in 3000 3001 3002; do
    pids=$(lsof -ti :$port)
    if [ -n "$pids" ]; then
        echo "Killing processes on port $port: $pids"
        kill -9 "$pids"
    else
        echo "Port $port is free"
    fi
done

echo "Port cleanup complete!"
