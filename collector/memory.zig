const std = @import("std");

pub fn main() !void {
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

        try sendMemoryUsage(usage_percent);
    }
}

fn sendMemoryUsage(cpu: u8) !void {
    var da = std.heap.DebugAllocator(.{}).init;
    defer _ = da.deinit();
    const allocator = da.allocator();

    var client: std.http.Client = .{
        .allocator = allocator,
    };
    defer client.deinit();

    var result_body = std.Io.Writer.Allocating.init(allocator);
    defer result_body.deinit();

    const uri = try std.Uri.parse("http://localhost:2697/api/metrics/memory");
    var req = try client.request(.POST, uri, .{ .extra_headers = &.{.{ .name = "Content-Type", .value = "application/json" }} });
    defer req.deinit();

    var list = try std.ArrayList(u8).initCapacity(allocator, 0);
    defer list.deinit(allocator);

    const numAsString = try std.fmt.allocPrint(allocator, "{}", .{cpu});
    defer allocator.free(numAsString);
    try list.append(allocator, '[');
    try list.appendSlice(allocator, numAsString);
    try list.append(allocator, ']');

    try req.sendBodyComplete(list.items);
    var buf: [1024]u8 = undefined;
    var response = try req.receiveHead(&buf);

    if (response.head.status != .ok) {
        return;
    }

    const body = try response.reader(&.{}).allocRemaining(allocator, .unlimited);
    defer allocator.free(body);
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
