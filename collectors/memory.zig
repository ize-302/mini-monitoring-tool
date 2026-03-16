const std = @import("std");
const sendUsage = @import("./send_usage.zig").sendUsage;
const Metric = @import("./send_usage.zig").Metric;

pub fn main() !void {
    var da = std.heap.DebugAllocator(.{}).init;
    defer _ = da.deinit();
    const allocator = da.allocator();

    while (true) {
        const path = "/proc/meminfo";
        var file = try std.fs.openFileAbsolute(path, .{});
        defer file.close();

        var buffer: [2048]u8 = undefined;
        const bytes_read = try file.readAll(&buffer);
        const content = buffer[0..bytes_read];

        const total = readMemInfoValue(content, "MemTotal:") orelse return error.MissingMemTotal;
        const available = readMemInfoValue(content, "MemAvailable:") orelse return error.MissingMemAvailable;

        const used = total - available;
        const usage_percent_f64 = @as(f64, @floatFromInt(used)) / @as(f64, @floatFromInt(total)) * 100.0;
        const usage_percent = @as(u8, @intFromFloat(usage_percent_f64));

        std.Thread.sleep(1000 * std.time.ns_per_ms);

        const res = try sendUsage(allocator, Metric.memory, usage_percent);
        defer allocator.free(res);
    }
}

fn readMemInfoValue(content: []const u8, key: []const u8) ?u64 {
    var lines = std.mem.splitAny(u8, content, "\n");
    while (lines.next()) |line| {
        if (std.mem.startsWith(u8, line, key)) {
            var tokens = std.mem.tokenizeAny(u8, line, " ");
            _ = tokens.next(); // skip key itself
            const value_str = tokens.next() orelse return null;
            return std.fmt.parseInt(u64, value_str, 10) catch null;
        }
    }
    return null;
}
