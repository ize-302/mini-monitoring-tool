const std = @import("std");

const cpuCollector = @import("./cpu.zig");
const memoryCollector = @import("./memory.zig");
const batteryCollector = @import("./battery.zig");
const temperatureCollector = @import("./temperature.zig");

pub fn main() !void {
    var da = std.heap.DebugAllocator(.{}).init;
    defer _ = da.deinit();
    const allocator = da.allocator();

    while (true) {
        const now_ms: u64 = @intCast(std.time.milliTimestamp());
        const next_tick_ms = (now_ms / 250 + 1) * 250;
        std.Thread.sleep((next_tick_ms - now_ms) * std.time.ns_per_ms);

        try cpuCollector.cpuCollector(allocator);
        try memoryCollector.memoryCollector(allocator);
        try batteryCollector.batteryCollector(allocator);
        try temperatureCollector.temperatureCollector(allocator);
    }
}
