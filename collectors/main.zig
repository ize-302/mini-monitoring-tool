const std = @import("std");

const cpuCollector = @import("./cpu.zig");
const memoryCollector = @import("./memory.zig");
const batteryCollector = @import("./battery.zig");
const temperatureCollector = @import("./temperature.zig");

pub fn main(init: std.process.Init) !void {
    var da = std.heap.DebugAllocator(.{}).init;
    defer _ = da.deinit();
    const allocator = da.allocator();

    while (true) {
        const now_ms: u64 = @intCast(std.time.ms_per_min);
        const next_tick_ms = (now_ms / 1000 + 1) * 1000;
        // try std.Io.sleep(init.io, (next_tick_ms - now_ms) * std.time.ns_per_ms, .awake);

        try std.Io.sleep(init.io, std.Io.Duration{ .nanoseconds = (next_tick_ms - now_ms) * std.time.ns_per_ms }, .awake); // 500ms

        try cpuCollector.cpuCollector(init, allocator);
        try memoryCollector.memoryCollector(init, allocator);
        try batteryCollector.batteryCollector(init, allocator);
        try temperatureCollector.temperatureCollector(init, allocator);
    }
}
