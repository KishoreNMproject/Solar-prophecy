const COLORS = {
  actual: "#14805e",
  estimated: "#c79024",
  forecast: "#3b6bdc",
  grid: "#d9dfd7",
  text: "#26332f",
  trend: "#8b3d88"
};

export function renderBarChart(canvas, points, options = {}) {
  const ctx = setup(canvas);
  const box = chartBox(canvas);
  drawAxes(ctx, box);
  if (!points.length) return drawEmpty(ctx, canvas, "Add readings to build this chart");

  const max = Math.max(...points.map((point) => point.value), 1);
  const barWidth = Math.max(3, box.width / points.length - 3);
  points.forEach((point, index) => {
    const height = (point.value / max) * box.height;
    const x = box.left + index * (box.width / points.length);
    const y = box.bottom - height;
    ctx.fillStyle = COLORS[point.kind] || COLORS.actual;
    ctx.globalAlpha = point.kind === "estimated" ? 0.65 : 0.9;
    ctx.fillRect(x, y, barWidth, height);
  });
  ctx.globalAlpha = 1;
  drawTitle(ctx, options.label || `${max.toFixed(1)} kWh max`, box);
  drawLegend(ctx, canvas, ["actual", "estimated", "forecast"]);
}

export function renderLineChart(canvas, points, options = {}) {
  const ctx = setup(canvas);
  const box = chartBox(canvas);
  drawAxes(ctx, box);
  if (!points.length) return drawEmpty(ctx, canvas, "Not enough data yet");

  const max = Math.max(...points.map((point) => point.value), 1);
  const min = Math.min(...points.map((point) => point.value), 0);
  const span = max - min || 1;
  const locate = (point, index) => ({
    x: box.left + (points.length === 1 ? 0 : (index / (points.length - 1)) * box.width),
    y: box.bottom - ((point.value - min) / span) * box.height
  });

  ctx.lineWidth = 2.5;
  points.forEach((point, index) => {
    if (index === 0) return;
    const prev = locate(points[index - 1], index - 1);
    const next = locate(point, index);
    ctx.strokeStyle = COLORS[point.kind] || options.color || COLORS.actual;
    ctx.setLineDash(point.kind === "forecast" ? [7, 5] : point.kind === "estimated" ? [3, 4] : []);
    ctx.beginPath();
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(next.x, next.y);
    ctx.stroke();
  });
  ctx.setLineDash([]);
  points.forEach((point, index) => {
    const pos = locate(point, index);
    ctx.fillStyle = COLORS[point.kind] || options.color || COLORS.actual;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 3, 0, Math.PI * 2);
    ctx.fill();
  });
  drawTitle(ctx, options.label || `${max.toFixed(1)} kWh peak`, box);
  if (options.legend !== false) drawLegend(ctx, canvas, ["actual", "estimated", "forecast"]);
}

function setup(canvas) {
  const ratio = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.max(320, rect.width) * ratio;
  canvas.height = Number(canvas.getAttribute("height")) * ratio;
  const ctx = canvas.getContext("2d");
  ctx.scale(ratio, ratio);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = "12px Inter, system-ui, sans-serif";
  return ctx;
}

function chartBox(canvas) {
  const width = canvas.getBoundingClientRect().width || 320;
  const height = Number(canvas.getAttribute("height"));
  return { left: 38, top: 18, right: width - 14, bottom: height - 34, width: width - 52, height: height - 52 };
}

function drawAxes(ctx, box) {
  ctx.strokeStyle = COLORS.grid;
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i += 1) {
    const y = box.top + (box.height / 4) * i;
    ctx.beginPath();
    ctx.moveTo(box.left, y);
    ctx.lineTo(box.right, y);
    ctx.stroke();
  }
}

function drawEmpty(ctx, canvas, text) {
  ctx.fillStyle = COLORS.text;
  ctx.textAlign = "center";
  ctx.fillText(text, (canvas.getBoundingClientRect().width || 320) / 2, Number(canvas.getAttribute("height")) / 2);
}

function drawTitle(ctx, text, box) {
  ctx.fillStyle = COLORS.text;
  ctx.textAlign = "left";
  ctx.fillText(text, box.left, box.bottom + 24);
}

function drawLegend(ctx, canvas, kinds) {
  let x = (canvas.getBoundingClientRect().width || 320) - 238;
  const y = 18;
  kinds.forEach((kind) => {
    ctx.fillStyle = COLORS[kind];
    ctx.fillRect(x, y - 8, 10, 10);
    ctx.fillStyle = COLORS.text;
    ctx.fillText(kind, x + 15, y);
    x += 78;
  });
}
