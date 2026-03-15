const std = @import("std");

pub fn main() !void {
    while (true) {
        const path = "/sys/class/thermal/thermal_zone0/temp";
        var file = try std.fs.openFileAbsolute(path, .{});
        defer file.close();

        var buffer: [2048]u8 = undefined;
        const bytes_read = try file.readAll(&buffer);
        const content = buffer[0..bytes_read];
        const trimmed = std.mem.trim(u8, content, "\n");

        const trimmed_to_int = try std.fmt.parseInt(u64, trimmed, 10);
        const result: u64 = trimmed_to_int / 1000;
        const temp_percentage: u8 = @intCast(result);

        std.Thread.sleep(1000 * std.time.ns_per_ms);

        try sendTemperatureUsage(temp_percentage);
    }
}

fn sendTemperatureUsage(cpu: u8) !void {
    var da = std.heap.DebugAllocator(.{}).init;
    defer _ = da.deinit();
    const allocator = da.allocator();

    var client: std.http.Client = .{
        .allocator = allocator,
    };
    defer client.deinit();

    var result_body = std.Io.Writer.Allocating.init(allocator);
    defer result_body.deinit();

    const uri = try std.Uri.parse("http://localhost:2697/api/metrics/temperature");
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
