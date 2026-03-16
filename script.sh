#!/bin/bash

(cd service && bun --hot index.ts) &
API_PID=$!

# when this script exits for any reason, run kill $API_PID to avoid orphan processes
trap "kill $API_PID" EXIT

echo "Waiting for API..."

until curl -s http://localhost:2697 >/dev/null; do
	sleep 1
done

echo "API ready. Starting collectors..."

exec zig run ./collectors/cpu.zig &

sleep 1

exec zig run ./collectors/memory.zig &

sleep 1

exec zig run ./collectors/temperature.zig
