import * as CanvasJS from "./canvasjs.min.js";

type TDataPoint = { x: Date; y: number };

// cpu
var cpu_dataPoints: TDataPoint[] = [];
var cpuChart = new CanvasJS.Chart("cpuChartContainer", {
  title: { text: "CPU Usage" },
  data: [
    {
      type: "area",
      dataPoints: cpu_dataPoints,
      color: "#7dd3fc",
    },
  ],
  axisY: {
    minimum: 0,
    maximum: 100,
  },
});

// memory
var memory_dataPoints: TDataPoint[] = [];
var memoryChart = new CanvasJS.Chart("memoryChartContainer", {
  title: { text: "Memory Usage" },
  data: [
    {
      type: "splineArea",
      dataPoints: memory_dataPoints,
      color: "#a78bfa",
    },
  ],
  axisY: {
    minimum: 0,
    maximum: 100,
  },
});

// temperature
var temperature_dataPoints: TDataPoint[] = [];
var temperatureChart = new CanvasJS.Chart("temperatureChartContainer", {
  title: { text: "Temperature" },
  data: [
    {
      type: "splineArea",
      dataPoints: temperature_dataPoints,
      color: "#fb923c",
    },
  ],
  axisY: {
    minimum: 0,
    maximum: 100,
  },
});

// battery
var battery_dataPoints: TDataPoint[] = [];
var batteryChart = new CanvasJS.Chart("batteryChartContainer", {
  title: { text: "Battery" },
  data: [
    {
      type: "column",
      dataPoints: battery_dataPoints,
    },
  ],
  axisY: {
    minimum: 0,
    maximum: 100,
  },
});

function changeColorBattery(chart: typeof batteryChart) {
  for (var i = 0; i < chart.options.data.length; i++) {
    for (var j = 0; j < chart.options.data[i].dataPoints.length; j++) {
      var y = chart.options.data[i].dataPoints[j].y;
      if (y < 10) chart.options.data[i].dataPoints[j].color = "#FF0000";
      if (y < 30) chart.options.data[i].dataPoints[j].color = "#ff8000";
      if (y < 50) chart.options.data[i].dataPoints[j].color = "#ffff00";
      if (y < 80) chart.options.data[i].dataPoints[j].color = "#bfff00";
      if (y < 100) chart.options.data[i].dataPoints[j].color = "#00FF00";
      else chart.options.data[i].dataPoints[j].color = "#7dd3fc";
    }
  }
}

(async function () {
  await connectToServer();

  async function connectToServer() {
    const ws = new WebSocket("ws://localhost:2697/ws");

    ws.onmessage = (websocketMessage) => {
      const messageBody = JSON.parse(websocketMessage.data);
      if (messageBody.metric === "cpu") {
        cpu_dataPoints.push({
          x: new Date(messageBody.ts),
          y: messageBody.value,
        });
        if (cpu_dataPoints.length > 20) cpu_dataPoints.shift();
      }
      cpuChart.render();

      if (messageBody.metric === "memory") {
        memory_dataPoints.push({
          x: new Date(messageBody.ts),
          y: messageBody.value,
        });
        if (memory_dataPoints.length > 20) memory_dataPoints.shift();
      }
      memoryChart.render();

      if (messageBody.metric === "temperature") {
        temperature_dataPoints.push({
          x: new Date(messageBody.ts),
          y: messageBody.value,
        });
        if (temperature_dataPoints.length > 40) temperature_dataPoints.shift();
      }
      temperatureChart.render();

      if (messageBody.metric === "battery") {
        battery_dataPoints.push({
          x: new Date(messageBody.ts),
          y: messageBody.value,
        });
        if (battery_dataPoints.length > 40) battery_dataPoints.shift();
      }
      changeColorBattery(batteryChart);
      batteryChart.render();
    };

    return new Promise(function (resolve, reject) {
      if (ws.readyState === 1) {
        resolve(ws);
      }
      if (ws.readyState === 3) {
        reject(ws);
      }
    });
  }
})();
