#!/bin/bash

bun --hot ./service/index.ts &

API_PID=$!

echo "Waiting for API..."

until curl -s http://localhost:2697 >/dev/null; do
	sleep 1
done

echo "API ready. Starting Zig program..."

exec zig run ./collector/cpu.zig &

sleep 1

exec zig run ./collector/memory.zig &

sleep 1

exec zig run ./collector/temperature.zig
