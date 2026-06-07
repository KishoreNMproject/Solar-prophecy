const COLORS = {
  actual: "#2ecc71",
  estimated: "#f39c12",
  forecast: "#3498db",
  grid: "rgba(255, 255, 255, 0.05)",
  text: "#8ca5a0",
  trend: "#9b59b6"
};

export function renderBarChart(canvas, points, options = {}) {
  const ctx = setup(canvas);
  const box = chartBox(canvas);
  drawAxes(ctx, box);
  
  if (points.length < 2) {
    return drawEmpty(ctx, canvas, "Learning from observations...");
  }

  const rawMax = Math.max(...points.map((point) => point.value), 0);
  const max = rawMax > 0 ? rawMax : 1;
  const barWidth = Math.max(2, (box.width / points.length) - 2);
  
  points.forEach((point, index) => {
    const height = Math.max(2, (point.value / max) * box.height);
    const x = box.left + index * (box.width / points.length);
    const y = box.bottom - height;
    
    ctx.fillStyle = COLORS[point.kind] || COLORS.actual;
    ctx.globalAlpha = point.kind === "estimated" ? 0.4 : point.kind === "forecast" ? 0.6 : 1;
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
  
  if (points.length < 2) {
    return drawEmpty(ctx, canvas, "More data needed for trends");
  }

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
      ctx.globalAlpha = point.kind === "estimated" ? 0.5 : point.kind === "forecast" ? 0.7 : 1;
      ctx.setLineDash(point.kind === "forecast" ? [8, 6] : point.kind === "estimated" ? [4, 4] : []);
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(next.x, next.y);
      ctx.stroke();
    });
  }

  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
  points.forEach((point, index) => {
    if (points.length > 50 && index % Math.floor(points.length / 10) !== 0) return;
    const pos = locate(point, index);
    ctx.fillStyle = COLORS[point.kind] || options.color || COLORS.actual;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 4, 0, Math.PI * 2);
    ctx.fill();
  });
  
  drawTitle(ctx, options.label || `${rawMax.toFixed(1)} peak`, box);
  if (options.legend !== false) drawLegend(ctx, canvas, ["actual", "estimated", "forecast"]);
}

function setup(canvas) {
  const ratio = window.devicePixelRatio || 1;
  const width = canvas.clientWidth || 320;
  const height = canvas.clientHeight || 180;
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  const ctx = canvas.getContext("2d");
  ctx.scale(ratio, ratio);
  ctx.clearRect(0, 0, width, height);
  ctx.font = "600 11px Inter, ui-sans-serif, system-ui, sans-serif";
  return ctx;
}

function chartBox(canvas) {
  const width = canvas.clientWidth || 320;
  const height = canvas.clientHeight || 180;
  return { 
    left: 40, 
    top: 20, 
    right: width - 12, 
    bottom: height - 32, 
    width: width - 52, 
    height: height - 52 
  };
}

function drawAxes(ctx, box) {
  ctx.strokeStyle = COLORS.grid;
  ctx.lineWidth = 1;
  for (let i = 0; i <= 3; i += 1) {
    const y = box.top + (box.height / 3) * i;
    ctx.beginPath();
    ctx.moveTo(box.left, y);
    ctx.lineTo(box.right, y);
    ctx.stroke();
  }
}

function drawEmpty(ctx, canvas, text) {
  ctx.fillStyle = COLORS.text;
  ctx.textAlign = "center";
  ctx.fillText(text, (canvas.getBoundingClientRect().width || 320) / 2, (canvas.getBoundingClientRect().height || 180) / 2);
}

function drawTitle(ctx, text, box) {
  ctx.fillStyle = COLORS.text;
  ctx.textAlign = "left";
  ctx.fillText(text, box.left, box.bottom + 18);
}

function drawLegend(ctx, canvas, kinds) {
  const width = canvas.getBoundingClientRect().width || 320;
  let x = width - 190;
  const y = 14;
  kinds.forEach((kind) => {
    ctx.fillStyle = COLORS[kind];
    ctx.fillRect(x, y - 7, 8, 8);
    ctx.fillStyle = COLORS.text;
    ctx.font = "600 10px Inter, sans-serif";
    ctx.fillText(kind, x + 12, y);
    x += 62;
  });
}
