const std = @import("std");
const sendUsage = @import("./send_usage.zig").sendUsage;
const Metric = @import("./send_usage.zig").Metric;
const parse = std.fmt.parseInt;

const CpuTimes = struct {
    user: u64,
    nice: u64,
    system: u64,
    idle: u64,
    iowait: u64,
    irq: u64,
    softirq: u64,
    steal: u64,
    guest: u64,
    guest_nice: u64,

    pub fn total(self: CpuTimes) u64 {
        return self.user + self.nice + self.system + self.idle +
            self.iowait + self.irq + self.softirq + self.steal +
            self.guest + self.guest_nice;
    }

    pub fn active(self: CpuTimes) u64 {
        return self.total() - self.idle;
    }
};

var prev: ?CpuTimes = null;

pub fn cpuCollector(allocator: std.mem.Allocator) !void {
    const curr = try readCpuTimes();
    defer prev = curr;

    const p = prev orelse return;

    const delta_total = curr.total() - p.total();
    const delta_active = curr.active() - p.active();

    const usage_percent_f64 = @as(f64, @floatFromInt(delta_active)) / @as(f64, @floatFromInt(delta_total)) * 100.0;
    const usage_percent = @as(u8, @intFromFloat(usage_percent_f64));

    const res = try sendUsage(allocator, Metric.cpu, usage_percent);
    defer allocator.free(res);
}

fn readCpuTimes() !CpuTimes {
    const path = "/proc/stat";
    var file = try std.fs.openFileAbsolute(path, .{});
    defer file.close();

    var buffer: [256]u8 = undefined;
    const bytes_read = try file.readAll(&buffer);
    const content = buffer[0..bytes_read];

    var lines = std.mem.splitAny(u8, content, "\n");

    const cpu_line = lines.next() orelse return error.MissingCpuLine;

    if (!std.mem.startsWith(u8, cpu_line, "cpu ")) {
        return error.UnexpectedFormat;
    }

    var it = std.mem.tokenizeAny(u8, cpu_line[4..], " ");

    return CpuTimes{
        .user = try parse(u64, it.next() orelse return error.Parse, 10),
        .nice = try parse(u64, it.next() orelse return error.Parse, 10),
        .system = try parse(u64, it.next() orelse return error.Parse, 10),
        .idle = try parse(u64, it.next() orelse return error.Parse, 10),
        .iowait = try parse(u64, it.next() orelse return error.Parse, 10),
        .irq = try parse(u64, it.next() orelse return error.Parse, 10),
        .softirq = try parse(u64, it.next() orelse return error.Parse, 10),
        .steal = try parse(u64, it.next() orelse return error.Parse, 10),
        .guest = try parse(u64, it.next() orelse return error.Parse, 10),
        .guest_nice = try parse(u64, it.next() orelse return error.Parse, 10),
    };
}
