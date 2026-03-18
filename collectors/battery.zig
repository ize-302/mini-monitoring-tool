const std = @import("std");
const sendUsage = @import("./send_usage.zig").sendUsage;
const Metric = @import("./send_usage.zig").Metric;

pub fn batteryCollector(allocator: std.mem.Allocator) !void {
    const path = "/sys/class/power_supply/BAT0/capacity";

    var file = try std.fs.openFileAbsolute(path, .{});
    defer file.close();

    var buffer: [32]u8 = undefined;
    const bytes_read = try file.readAll(&buffer);
    const trimmed = std.mem.trim(u8, buffer[0..bytes_read], "\n");

    const batt_capacity_u64 = try std.fmt.parseInt(u64, trimmed, 10);
    const batt_capacity: u8 = @as(u8, @intCast(batt_capacity_u64)); // cast to u8

    const res = try sendUsage(allocator, Metric.battery, batt_capacity);
    defer allocator.free(res);
}
