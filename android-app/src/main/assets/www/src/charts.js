function getThemeColors() {
  const styles = getComputedStyle(document.documentElement);
  return {
    actual: styles.getPropertyValue("--chart-actual").trim() || "#2ecc71",
    estimated: styles.getPropertyValue("--chart-estimated").trim() || "#f39c12",
    forecast: styles.getPropertyValue("--chart-forecast").trim() || "#3498db",
    grid: styles.getPropertyValue("--chart-grid").trim() || "rgba(255, 255, 255, 0.05)",
    text: styles.getPropertyValue("--chart-text").trim() || "#8ca5a0",
    trend: "#9b59b6",
    tooltipBg: styles.getPropertyValue("--chart-tooltip-bg").trim() || "rgba(20, 26, 25, 0.95)",
    tooltipBorder: styles.getPropertyValue("--chart-tooltip-border").trim() || "rgba(255, 255, 255, 0.1)",
    ink: styles.getPropertyValue("--ink").trim() || "#fff"
  };
}

// Store chart data for interaction
const chartRegistry = new Map();

// Listen for theme changes to re-render all charts
window.addEventListener("themeChanged", () => {
  chartRegistry.forEach((entry, canvas) => {
    if (entry.type === "bar") renderBarChart(canvas, entry.points, entry.options);
    else renderLineChart(canvas, entry.points, entry.options);
  });
});

export function renderBarChart(canvas, points, options = {}) {
  chartRegistry.set(canvas, { type: "bar", points, options });
  const ctx = setup(canvas);
  const box = chartBox(canvas);
  const COLORS = getThemeColors();
  
  const interaction = chartRegistry.get(canvas).interaction;
  const hoverIndex = interaction ? interaction.index : -1;

  drawAxes(ctx, box, points, options);
  
  if (!points || points.length < 2) {
    return drawEmpty(ctx, canvas, "Learning from observations...");
  }

  const rawMax = Math.max(...points.map((point) => point.value), 0);
  const max = rawMax > 0 ? rawMax * 1.15 : 1;
  const barWidth = Math.max(1, (box.width / points.length) - 2);
  
  // 1. Draw bars
  points.forEach((point, index) => {
    const height = Math.max(2, (point.value / max) * box.height);
    const x = box.left + index * (box.width / points.length);
    const y = box.bottom - height;
    
    if (point.kind === "today" || point.forecastValue !== undefined) {
      const isToday = point.kind === "today";
      const actualVal = isToday ? (point.actualValue || 0) : point.value;
      const forecastVal = isToday ? point.value : point.forecastValue;
      
      const actualHeight = Math.max(2, (actualVal / max) * box.height);
      const forecastFullHeight = Math.max(2, (forecastVal / max) * box.height);
      
      const actualY = box.bottom - actualHeight;
      const forecastY = box.bottom - forecastFullHeight;
      
      // Draw actual as solid base
      ctx.globalAlpha = 1;
      ctx.fillStyle = COLORS.actual;
      ctx.fillRect(x, actualY, Math.min(barWidth, box.width / points.length), actualHeight);
      
      // If forecast is higher, draw the extra bit on top
      if (forecastVal > actualVal) {
        const extraHeight = forecastFullHeight - actualHeight;
        ctx.fillStyle = COLORS.forecast;
        ctx.globalAlpha = 0.7;
        ctx.fillRect(x, forecastY, Math.min(barWidth, box.width / points.length), extraHeight);
      } else if (forecastVal < actualVal && forecastVal > 0) {
        // If forecast was lower, draw a marker line
        ctx.fillStyle = COLORS.forecast;
        ctx.globalAlpha = 1;
        ctx.fillRect(x, forecastY, Math.min(barWidth, box.width / points.length), 3);
      }
    } else {
      ctx.fillStyle = COLORS[point.kind] || COLORS.actual;
      ctx.globalAlpha = point.kind === "estimated" ? 0.4 : point.kind === "forecast" ? 0.6 : 1;
      if (index === hoverIndex) ctx.globalAlpha = 1;
      
      ctx.fillRect(x, y, Math.min(barWidth, box.width / points.length), height);
    }
  });

  // 2. Draw labels
  points.forEach((point, index) => {
    if (point.value > 0) {
      const height = Math.max(2, (point.value / max) * box.height);
      const x = box.left + index * (box.width / points.length);
      const y = box.bottom - height;
      const cx = x + barWidth / 2;
      
      ctx.globalAlpha = 1;
      ctx.fillStyle = COLORS.ink;
      
      if (point.kind === "today" || point.forecastValue !== undefined) {
        const isToday = point.kind === "today";
        const actualVal = isToday ? (point.actualValue || 0) : point.value;
        const forecastVal = isToday ? point.value : point.forecastValue;
        
        const actualHeight = Math.max(2, (actualVal / max) * box.height);
        const actualY = box.bottom - actualHeight;
        const forecastFullHeight = Math.max(2, (forecastVal / max) * box.height);
        const forecastY = box.bottom - forecastFullHeight;

        if (barWidth < 14) {
          // Narrow bars (vertical text)
          ctx.save();
          if (forecastVal > actualVal) {
             ctx.translate(cx, forecastY - 4);
          } else {
             ctx.translate(cx, actualY - 4);
          }
          ctx.rotate(-Math.PI / 2);
          ctx.textAlign = "left";
          ctx.textBaseline = "middle";
          ctx.font = "800 9px Inter, sans-serif";
          ctx.fillText((forecastVal > actualVal ? "est " : "act ") + Math.max(forecastVal, actualVal).toFixed(1), 0, 0);
          ctx.restore();
          
          const lowerVal = forecastVal > actualVal ? actualVal : forecastVal;
          const lowerHeight = forecastVal > actualVal ? actualHeight : forecastFullHeight;
          const lowerY = forecastVal > actualVal ? actualY : forecastY;
          const lowerPrefix = forecastVal > actualVal ? "act " : "est ";
          
          if (lowerVal > 0 && lowerHeight > 24) {
            ctx.save();
            ctx.translate(cx, lowerY + 4);
            ctx.rotate(-Math.PI / 2);
            ctx.textAlign = "right";
            ctx.textBaseline = "middle";
            ctx.font = "800 9px Inter, sans-serif";
            ctx.fillStyle = "rgba(255,255,255,0.9)";
            ctx.fillText(lowerPrefix + lowerVal.toFixed(1), 0, 0);
            ctx.restore();
          }
        } else {
          // Wide bars (horizontal text)
          ctx.textAlign = "center";
          ctx.font = "800 9px Inter, sans-serif";
          
          if (forecastVal > actualVal) {
             ctx.fillStyle = COLORS.ink;
             ctx.fillText("est " + forecastVal.toFixed(1), cx, forecastY - 4);
             if (actualVal > 0 && actualHeight > 14) {
               ctx.fillStyle = "rgba(255,255,255,0.9)";
               ctx.fillText("act " + actualVal.toFixed(1), cx, actualY + 10);
             }
          } else {
             ctx.fillStyle = COLORS.ink;
             ctx.fillText("act " + actualVal.toFixed(1), cx, actualY - 4);
             if (forecastVal > 0 && forecastFullHeight > 14) {
               ctx.fillStyle = "rgba(255,255,255,0.9)";
               ctx.fillText("est " + forecastVal.toFixed(1), cx, forecastY + 10);
             }
          }
        }
      } else {
        if (barWidth < 14) {
          ctx.save();
          ctx.translate(cx, y - 4);
          ctx.rotate(-Math.PI / 2);
          ctx.textAlign = "left";
          ctx.textBaseline = "middle";
          ctx.font = "800 9px Inter, sans-serif";
          ctx.fillText(point.value.toFixed(1), 0, 0);
          ctx.restore();
        } else {
          ctx.textAlign = "center";
          ctx.font = "800 9px Inter, sans-serif";
          ctx.fillText(point.value.toFixed(1), cx, y - 4);
        }
      }
    }
  });
  
  ctx.globalAlpha = 1;
  drawTitle(ctx, options.label || `${rawMax.toFixed(1)} kWh max`, box);
  
  const presentKinds = [...new Set(points.map(p => p.kind))].filter(k => COLORS[k]);
  drawLegend(ctx, canvas, presentKinds);
  
  if (hoverIndex !== -1) {
    drawTooltip(ctx, canvas, box, points[hoverIndex], interaction);
  }
}

export function renderLineChart(canvas, points, options = {}) {
  chartRegistry.set(canvas, { type: "line", points, options });
  const ctx = setup(canvas);
  const box = chartBox(canvas);
  const COLORS = getThemeColors();
  
  const interaction = chartRegistry.get(canvas).interaction;
  const hoverIndex = interaction ? interaction.index : -1;

  drawAxes(ctx, box, points, options);
  
  if (!points || points.length < 2) {
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
    const isHovered = index === hoverIndex;
    const shouldDraw = isHovered || (points.length <= 50) || (index % Math.floor(points.length / 10) === 0);
    
    if (shouldDraw) {
      const pos = locate(point, index);
      ctx.fillStyle = COLORS[point.kind] || options.color || COLORS.actual;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, isHovered ? 6 : 4, 0, Math.PI * 2);
      ctx.fill();
      if (isHovered) {
        ctx.strokeStyle = COLORS.ink;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
  });
  
  drawTitle(ctx, options.label || `${rawMax.toFixed(1)} peak`, box);
  if (options.legend !== false) {
    const presentKinds = [...new Set(points.map(p => p.kind))].filter(k => COLORS[k]);
    drawLegend(ctx, canvas, presentKinds);
  }
  
  if (hoverIndex !== -1) {
    drawTooltip(ctx, canvas, box, points[hoverIndex], interaction);
  }
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
  
  if (!canvas.dataset.interactive) {
    const handleEvent = (e) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      
      const entry = chartRegistry.get(canvas);
      if (!entry) return;
      
      const box = chartBox(canvas);
      let index = -1;
      
      if (x >= box.left && x <= box.right) {
        if (entry.type === "bar") {
          index = Math.floor(((x - box.left) / box.width) * entry.points.length);
        } else {
          index = Math.round(((x - box.left) / box.width) * (entry.points.length - 1));
        }
      }
      
      index = Math.max(0, Math.min(index, entry.points.length - 1));
      
      if (index !== -1) {
        entry.interaction = { index, x, y };
        if (entry.type === "bar") renderBarChart(canvas, entry.points, entry.options);
        else renderLineChart(canvas, entry.points, entry.options);
      }
    };
    
    canvas.addEventListener("mousemove", handleEvent);
    canvas.addEventListener("touchstart", handleEvent, { passive: true });
    canvas.addEventListener("mouseleave", () => {
      const entry = chartRegistry.get(canvas);
      if (entry) {
        entry.interaction = null;
        if (entry.type === "bar") renderBarChart(canvas, entry.points, entry.options);
        else renderLineChart(canvas, entry.points, entry.options);
      }
    });
    canvas.dataset.interactive = "true";
  }
  
  return ctx;
}

function chartBox(canvas) {
  const width = canvas.clientWidth || 320;
  const height = canvas.clientHeight || 180;
  return { 
    left: 40, 
    top: 25, 
    right: width - 12, 
    bottom: height - 35, 
    width: width - 52, 
    height: height - 60 
  };
}

function drawAxes(ctx, box, points, options) {
  const COLORS = getThemeColors();
  const rawMax = points && points.length > 0 ? Math.max(...points.map((p) => p.value), 0) : 10;
  const max = rawMax > 0 ? rawMax : 10;
  
  ctx.strokeStyle = COLORS.grid;
  ctx.lineWidth = 1;
  ctx.textAlign = "right";
  ctx.fillStyle = COLORS.ink;
  ctx.font = "700 9px Inter, sans-serif";

  // Y-axis grid and labels
  for (let i = 0; i <= 3; i += 1) {
    const y = box.top + (box.height / 3) * i;
    const val = max - (max / 3) * i;
    
    ctx.beginPath();
    ctx.moveTo(box.left, y);
    ctx.lineTo(box.right, y);
    ctx.stroke();
    
    // Y-axis value labels
    ctx.fillText(val.toFixed(1), box.left - 6, y + 3);
  }

  // X-axis labels
  if (points && points.length > 0) {
    ctx.textAlign = "center";
    // Show labels every 3-7 points depending on total points
    const skip = Math.max(1, Math.floor(points.length / 6));
    points.forEach((point, index) => {
      if (index % skip === 0 || index === points.length - 1) {
        const x = box.left + (index / (points.length - 1 || 1)) * box.width;
        let label = point.date || "";
        // Format YYYY-MM-DD to MM/DD
        if (label.includes("-")) {
          const parts = label.split("-");
          label = parts.length > 2 ? `${parts[1]}/${parts[2]}` : label;
        }
        ctx.fillText(label, x, box.bottom + 12);
      }
    });
  }
  
  // Y-axis Unit
  ctx.save();
  ctx.translate(10, box.top + box.height / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = "center";
  ctx.fillStyle = COLORS.text;
  ctx.fillText("UNIT: kWh", 0, 0);
  ctx.restore();
}

function drawEmpty(ctx, canvas, text) {
  const COLORS = getThemeColors();
  ctx.fillStyle = COLORS.ink;
  ctx.textAlign = "center";
  ctx.font = "600 12px Inter, sans-serif";
  const lines = text.split("\n");
  const x = (canvas.clientWidth) / 2;
  const y = (canvas.clientHeight) / 2 - (lines.length * 8);
  lines.forEach((line, i) => {
    ctx.fillText(line, x, y + i * 18);
  });
}

function drawTitle(ctx, text, box) {
  const COLORS = getThemeColors();
  ctx.fillStyle = COLORS.text;
  ctx.textAlign = "left";
  ctx.font = "600 10px Inter, sans-serif";
  ctx.fillText(text.toUpperCase(), box.left, box.top - 10);
}

function drawLegend(ctx, canvas, kinds) {
  const COLORS = getThemeColors();
  const width = canvas.getBoundingClientRect().width || 320;
  let x = width - 160;
  const y = 14;
  kinds.forEach((kind) => {
    ctx.fillStyle = COLORS[kind];
    ctx.fillRect(x, y - 7, 8, 8);
    ctx.fillStyle = COLORS.text;
    ctx.font = "600 9px Inter, sans-serif";
    ctx.fillText(kind, x + 12, y);
    x += 52;
  });
}

function drawTooltip(ctx, canvas, box, point, interaction) {
  const COLORS = getThemeColors();
  const { x, y } = interaction;
  const padding = 8;
  const lineHeight = 14;
  
  const lines = [
    point.date ? `Date: ${point.date}` : null,
    point.kind === "today" ? `Target: ${point.value.toFixed(2)} kWh` : `Value: ${point.value.toFixed(2)} kWh`,
    point.kind === "today" ? `Actual: ${(point.actualValue || 0).toFixed(2)} kWh` : null,
    point.kind ? `Type: ${point.kind}` : null,
    point.confidence ? `Confidence: ${Math.round(point.confidence * 100)}%` : null
  ].filter(Boolean);

  ctx.font = "600 10px Inter, sans-serif";
  const maxWidth = Math.max(...lines.map(l => ctx.measureText(l).width)) + padding * 2;
  const height = lines.length * lineHeight + padding * 2;
  
  let tx = x + 10;
  let ty = y - height - 10;
  
  if (tx + maxWidth > canvas.clientWidth) tx = x - maxWidth - 10;
  if (ty < 0) ty = y + 10;
  
  ctx.fillStyle = COLORS.chartTooltipBg;
  ctx.strokeStyle = COLORS.chartTooltipBorder;
  ctx.lineWidth = 1;
  
  // Draw tooltip box
  ctx.beginPath();
  ctx.roundRect(tx, ty, maxWidth, height, 4);
  ctx.fill();
  ctx.stroke();
  
  // Draw text
  ctx.fillStyle = COLORS.ink;
  ctx.textAlign = "left";
  lines.forEach((line, i) => {
    ctx.fillText(line, tx + padding, ty + padding + 10 + i * lineHeight);
  });
}
