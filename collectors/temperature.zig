const std = @import("std");
const sendUsage = @import("./send_usage.zig").sendUsage;
const Metric = @import("./send_usage.zig").Metric;

pub fn temperatureCollector(init: std.process.Init, allocator: std.mem.Allocator) !void {
    const path = "/sys/class/thermal/thermal_zone0/temp";
    var file = try std.Io.Dir.openFileAbsolute(init.io, path, .{});
    defer file.close(init.io);

    var read_buffer: [64]u8 = undefined;
    var bytes_read = std.Io.File.reader(file, init.io, &read_buffer);

    var content_buffer: [2048]u8 = undefined;
    const bytes_read_size = try bytes_read.interface.readSliceShort(&content_buffer);
    const content = content_buffer[0..bytes_read_size];
    const trimmed = std.mem.trim(u8, content, "\n");

    const trimmed_to_int = try std.fmt.parseInt(u64, trimmed, 10);
    const result: u64 = trimmed_to_int / 1000;
    const temp: u8 = @intCast(result);

    const res = try sendUsage(init, allocator, Metric.temperature, temp);
    defer allocator.free(res);
}
