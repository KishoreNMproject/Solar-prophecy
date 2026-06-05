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

  const rawMax = Math.max(...points.map((point) => point.value), 0);
  const max = rawMax > 0 ? rawMax : 1;
  const barWidth = Math.max(2, (box.width / points.length) - 2);
  
  points.forEach((point, index) => {
    const height = Math.max(2, (point.value / max) * box.height);
    const x = box.left + index * (box.width / points.length);
    const y = box.bottom - height;
    ctx.fillStyle = COLORS[point.kind] || COLORS.actual;
    ctx.globalAlpha = point.kind === "estimated" ? 0.65 : 0.9;
    ctx.fillRect(x, y, Math.min(barWidth, box.width / points.length), height);
  });
  ctx.globalAlpha = 1;
  drawTitle(ctx, options.label || `${rawMax.toFixed(1)} kWh max`, box);
  drawLegend(ctx, canvas, ["actual", "estimated", "forecast"]);
}

export function renderLineChart(canvas, points, options = {}) {
  const ctx = setup(canvas);
  const box = chartBox(canvas);
  drawAxes(ctx, box);
  if (points.length < 1) return drawEmpty(ctx, canvas, "Not enough data yet");

  const rawMax = Math.max(...points.map((point) => point.value), 0);
  const rawMin = Math.min(...points.map((point) => point.value), 0);
  const max = rawMax > 0 ? rawMax : 1;
  const min = Math.min(rawMin, max * 0.9);
  const span = max - min || 1;

  const locate = (point, index) => ({
    x: box.left + (points.length <= 1 ? box.width / 2 : (index / (points.length - 1)) * box.width),
    y: box.bottom - ((point.value - min) / span) * box.height
  });

  ctx.lineWidth = 2.5;
  if (points.length > 1) {
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
  }

  ctx.setLineDash([]);
  points.forEach((point, index) => {
    const pos = locate(point, index);
    ctx.fillStyle = COLORS[point.kind] || options.color || COLORS.actual;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 4, 0, Math.PI * 2);
    ctx.fill();
    if (points.length < 10) {
      ctx.fillStyle = COLORS.text;
      ctx.fillText(point.value.toFixed(1), pos.x - 10, pos.y - 10);
    }
  });
  
  drawTitle(ctx, options.label || `${rawMax.toFixed(1)} peak`, box);
  if (options.legend !== false) drawLegend(ctx, canvas, ["actual", "estimated", "forecast"]);
}

function setup(canvas) {
  const ratio = window.devicePixelRatio || 1;
  const width = canvas.clientWidth || 320;
  const height = canvas.clientHeight || 260;
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  const ctx = canvas.getContext("2d");
  ctx.scale(ratio, ratio);
  ctx.clearRect(0, 0, width, height);
  ctx.font = "12px Inter, ui-sans-serif, system-ui, sans-serif";
  return ctx;
}

function chartBox(canvas) {
  const width = canvas.clientWidth || 320;
  const height = canvas.clientHeight || 260;
  return { 
    left: 44, 
    top: 30, 
    right: width - 18, 
    bottom: height - 44, 
    width: width - 62, 
    height: height - 74 
  };
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
