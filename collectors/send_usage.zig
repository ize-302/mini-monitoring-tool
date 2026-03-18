const std = @import("std");

pub const Metric = enum { cpu, memory, temperature, battery };

pub fn sendUsage(allocator: std.mem.Allocator, metric: Metric, metric_value: u8) ![]u8 {
    var client: std.http.Client = .{
        .allocator = allocator,
    };
    defer client.deinit();

    var result_body = std.Io.Writer.Allocating.init(allocator);
    defer result_body.deinit();

    const metric_type = switch (metric) {
        .cpu => "cpu",
        .memory => "memory",
        .temperature => "temperature",
        .battery => "battery",
    };

    const url = try std.fmt.allocPrint(allocator, "{s}/{s}", .{ "http://localhost:2697/api/metrics", metric_type });
    defer allocator.free(url);
    const uri = try std.Uri.parse(url);
    var req = try client.request(.POST, uri, .{ .extra_headers = &.{.{ .name = "Content-Type", .value = "application/json" }} });
    defer req.deinit();

    var list = try std.ArrayListUnmanaged(u8).initCapacity(allocator, 0);
    defer list.deinit(allocator);

    const numAsString = try std.fmt.allocPrint(allocator, "{}", .{metric_value});
    defer allocator.free(numAsString);
    try list.append(allocator, '[');
    try list.appendSlice(allocator, numAsString);
    try list.append(allocator, ']');

    try req.sendBodyComplete(list.items);
    var buf: [1024]u8 = undefined;
    const response = try req.receiveHead(&buf);

    if (response.head.status != .ok) {
        return error.BadStatus;
    }

    return try list.toOwnedSlice(allocator);
}
