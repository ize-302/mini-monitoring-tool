const std = @import("std");
const sendUsage = @import("./send_usage.zig").sendUsage;
const Metric = @import("./send_usage.zig").Metric;

pub fn batteryCollector(init: std.process.Init, allocator: std.mem.Allocator) !void {
    const path = "/sys/class/power_supply/BAT0/capacity";

    var file = try std.Io.Dir.openFileAbsolute(init.io, path, .{});
    defer file.close(init.io);

    var buffer: [32]u8 = undefined;
    var bytes_read = std.Io.File.reader(file, init.io, &buffer);

    var content_buffer: [2048]u8 = undefined;
    const bytes_read_size = try bytes_read.interface.readSliceShort(&content_buffer);
    const content = content_buffer[0..bytes_read_size];
    const trimmed = std.mem.trim(u8, content, "\n");

    const batt_capacity_u64 = try std.fmt.parseInt(u64, trimmed, 10);
    const batt_capacity: u8 = @as(u8, @intCast(batt_capacity_u64)); // cast to u8

    const res = try sendUsage(init, allocator, Metric.battery, batt_capacity);
    defer allocator.free(res);
}
