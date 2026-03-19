const std = @import("std");
const sendUsage = @import("./send_usage.zig").sendUsage;
const Metric = @import("./send_usage.zig").Metric;

pub fn temperatureCollector(allocator: std.mem.Allocator) !void {
    const path = "/sys/class/thermal/thermal_zone0/temp";
    var file = try std.fs.openFileAbsolute(path, .{});
    defer file.close();

    var buffer: [2048]u8 = undefined;
    const bytes_read = try file.readAll(&buffer);
    const content = buffer[0..bytes_read];
    const trimmed = std.mem.trim(u8, content, "\n");

    const trimmed_to_int = try std.fmt.parseInt(u64, trimmed, 10);
    const result: u64 = trimmed_to_int / 1000;
    const temp: u8 = @intCast(result);

    const res = try sendUsage(allocator, Metric.temperature, temp);
    defer allocator.free(res);
}
