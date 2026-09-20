const std = @import("std");
const sendUsage = @import("./send_usage.zig").sendUsage;
const Metric = @import("./send_usage.zig").Metric;

pub fn memoryCollector(init: std.process.Init, allocator: std.mem.Allocator) !void {
    const path = "/proc/meminfo";
    var file = try std.Io.Dir.openFileAbsolute(init.io, path, .{});
    defer file.close(init.io);

    var buffer: [256]u8 = undefined;
    var bytes_read = std.Io.File.reader(file, init.io, &buffer);

    var content_buffer: [2048]u8 = undefined;
    const bytes_read_size = try bytes_read.interface.readSliceShort(&content_buffer);
    const content = content_buffer[0..bytes_read_size];

    const total = readMemInfoValue(content, "MemTotal:") orelse return error.MissingMemTotal;
    const available = readMemInfoValue(content, "MemAvailable:") orelse return error.MissingMemAvailable;

    const used = total - available;
    const usage_percent_f64 = @as(f64, @floatFromInt(used)) / @as(f64, @floatFromInt(total)) * 100.0;
    const usage_percent = @as(u8, @intFromFloat(usage_percent_f64));

    const res = try sendUsage(init, allocator, Metric.memory, usage_percent);
    defer allocator.free(res);
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
