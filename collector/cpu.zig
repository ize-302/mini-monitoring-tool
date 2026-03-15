const std = @import("std");

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

pub fn main() !void {
    while (true) {
        const cpu1 = try readCpuTimes();
        std.Thread.sleep(1000 * std.time.ns_per_ms);

        const cpu2 = try readCpuTimes();

        const delta_total = cpu2.total() - cpu1.total();
        const delta_active = cpu2.active() - cpu1.active();

        const usage_percent_f64 = @as(f64, @floatFromInt(delta_active)) / @as(f64, @floatFromInt(delta_total)) * 100.0;
        const usage_percent = @as(u8, @intFromFloat(usage_percent_f64));

        try sendCpuUsage(usage_percent);
    }
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
    const parse = std.fmt.parseInt;

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

fn sendCpuUsage(cpu: u8) !void {
    var da = std.heap.DebugAllocator(.{}).init;
    defer _ = da.deinit();
    const allocator = da.allocator();

    var client: std.http.Client = .{
        .allocator = allocator,
    };
    defer client.deinit();

    var result_body = std.Io.Writer.Allocating.init(allocator);
    defer result_body.deinit();

    const uri = try std.Uri.parse("http://localhost:2697/api/metrics/cpu");
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
