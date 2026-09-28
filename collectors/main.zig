const std = @import("std");

const cpuCollector = @import("./cpu.zig");
const memoryCollector = @import("./memory.zig");
const batteryCollector = @import("./battery.zig");
const temperatureCollector = @import("./temperature.zig");
const Metric = @import("./send_usage.zig").Metric;

pub fn main(init: std.process.Init) !void {
    var da = std.heap.DebugAllocator(.{}).init;
    defer _ = da.deinit();
    const allocator = da.allocator();

    while (true) {
        const now_ms: u64 = @intCast(std.time.ms_per_min);
        const next_tick_ms = (now_ms / 1000 + 1) * 1000;
        // try std.Io.sleep(init.io, (next_tick_ms - now_ms) * std.time.ns_per_ms, .awake);

        try std.Io.sleep(init.io, std.Io.Duration{ .nanoseconds = (next_tick_ms - now_ms) * std.time.ns_per_ms }, .awake); // 500ms

        try collect(.cpu, cpuCollector.cpuCollector(init, allocator));
        try collect(.memory, memoryCollector.memoryCollector(init, allocator));
        try collect(.battery, batteryCollector.batteryCollector(init, allocator));
        try collect(.temperature, temperatureCollector.temperatureCollector(init, allocator));
    }
}

// metrics already flagged as unavailable on the machine
var skipped = std.EnumSet(Metric).initEmpty();

// only collects metrics the machine supports. skips unsupported metrics e.g
// not all machines have batteries
fn collect(metric: Metric, result: anyerror!void) !void {
    result catch |err| switch (err) {
        error.FileNotFound, error.AccessDenied => {
            if (!skipped.contains(metric)) {
                std.log.warn("{t}: source unavailable ({t}), skipping", .{ metric, err });
                skipped.insert(metric);
            }
        },
        else => return err,
    };
}
