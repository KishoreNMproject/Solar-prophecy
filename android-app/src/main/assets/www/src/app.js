import { buildSolarModel } from "./analytics.js";
import { renderBarChart, renderLineChart } from "./charts.js";
import {
  deleteReading,
  exportBackup,
  getReadings,
  getSettings,
  importBackup,
  openDatabase,
  saveReading,
  saveSettings
} from "./db.js";

let db;
let readings = [];
let settings = {};
let model;

const els = {
  form: document.querySelector("#readingForm"),
  readingId: document.querySelector("#readingId"),
  readingValue: document.querySelector("#readingValue"),
  useCustomTimestamp: document.querySelector("#useCustomTimestamp"),
  timestampField: document.querySelector("#timestampField"),
  autoTimestampLabel: document.querySelector("#autoTimestampLabel"),
  readingTimestamp: document.querySelector("#readingTimestamp"),
  cancelEdit: document.querySelector("#cancelEdit"),
  entryMessage: document.querySelector("#entryMessage"),
  settingsForm: document.querySelector("#settingsForm"),
  installationDate: document.querySelector("#installationDate"),
  metricsGrid: document.querySelector("#metricsGrid"),
  readingsTable: document.querySelector("#readingsTable"),
  readingCount: document.querySelector("#readingCount"),
  forecastList: document.querySelector("#forecastList"),
  forecastConfidence: document.querySelector("#forecastConfidence"),
  qualityWarning: document.querySelector("#qualityWarning"),
  modelStatus: document.querySelector("#modelStatus"),
  exportData: document.querySelector("#exportData"),
  importData: document.querySelector("#importData")
};

init();

async function init() {
  db = await openDatabase();
  readings = await getReadings(db);
  settings = await getSettings(db);
  els.readingTimestamp.value = localDateTimeValue(new Date());
  setCustomTimestampMode(false);
  els.installationDate.value = settings.installationDate || "";
  bindEvents();
  await refresh();
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("./service-worker.js").catch(() => {});
}

function bindEvents() {
  els.form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const readingValue = els.readingValue.value;
    const readingId = els.readingId.value || undefined;
    const timestamp = els.useCustomTimestamp.checked ? els.readingTimestamp.value : new Date().toISOString();
    
    console.log("Saving reading:", { readingId, readingValue, timestamp });

    await saveReading(db, {
      id: readingId,
      value: readingValue,
      timestamp
    });
    resetForm();
    await refresh("Reading saved.");
  });

  els.cancelEdit.addEventListener("click", resetForm);

  els.useCustomTimestamp.addEventListener("change", () => {
    setCustomTimestampMode(els.useCustomTimestamp.checked);
    if (els.useCustomTimestamp.checked && !els.readingTimestamp.value) {
      els.readingTimestamp.value = localDateTimeValue(new Date());
    }
  });

  els.settingsForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    settings.installationDate = els.installationDate.value;
    await saveSettings(db, settings);
    await refresh("Settings saved.");
  });

  els.exportData.addEventListener("click", async () => {
    const backup = await exportBackup(db);
    const json = JSON.stringify(backup, null, 2);
    if (window.SolarAndroid?.saveBackup) {
      window.SolarAndroid.saveBackup(json);
      return;
    }
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `solar-prophecy-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  });

  els.importData.addEventListener("change", async () => {
    const file = els.importData.files[0];
    if (!file) return;
    const backup = JSON.parse(await file.text());
    await importBackup(db, backup);
    readings = await getReadings(db);
    settings = await getSettings(db);
    els.installationDate.value = settings.installationDate || "";
    await refresh("Backup restored.");
    els.importData.value = "";
  });

  window.addEventListener("resize", () => renderCharts());
}

async function refresh(message = "") {
  try {
    readings = await getReadings(db);
    settings = await getSettings(db);
    model = buildSolarModel(readings, settings);
    renderMetrics();
    renderReadings();
    renderForecast();
    renderCharts();
    renderQuality();
    if (message) els.entryMessage.textContent = message;
  } catch (err) {
    console.error("Refresh failed:", err);
    els.entryMessage.textContent = "Error: " + err.message;
  }
}

function renderMetrics() {
  const d = model.dashboard;
  const cards = [
    ["Today", kwh(d.todayGeneration)],
    ["Weekly average", kwh(d.weeklyAverage)],
    ["Monthly average", kwh(d.monthlyAverage)],
    ["Best day", d.bestProductionDay ? `${kwh(d.bestProductionDay.generation)} · ${d.bestProductionDay.date}` : "Learning"],
    ["Worst day", d.worstProductionDay ? `${kwh(d.worstProductionDay.generation)} · ${d.worstProductionDay.date}` : "Learning"],
    ["Observations", `${model.dataQuality.actualReadingCount} entries`],
    ["Lifetime production", kwh(d.lifetimeProduction)],
    ["Data completeness", `${d.dataCompletenessScore}%`],
    ["Forecast confidence", `${d.forecastConfidence}%`],
    ["System age", d.systemAgeDays == null ? "Unknown" : `${Math.floor(d.systemAgeDays / 365)}y ${d.systemAgeDays % 365}d`],
    ["Remaining generation", d.remainingExpectedGeneration == null ? "Needs install year" : kwh(d.remainingExpectedGeneration)]
  ];

  els.metricsGrid.innerHTML = cards
    .map(([label, value]) => `<article class="metric"><span>${label}</span><strong>${value}</strong></article>`)
    .join("");
  els.modelStatus.textContent =
    model.dataQuality.forecastReliability === "low" ? "Learning: low confidence" : `Model confidence ${d.forecastConfidence}%`;
}

function renderReadings() {
  const sorted = [...model.readings].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  els.readingCount.textContent = `${sorted.length} actual readings`;
  els.readingsTable.innerHTML = sorted
    .map(
      (reading) => `
      <tr>
        <td style="font-size:0.9rem; font-weight:500;">${formatDateTime(reading.timestamp)}</td>
        <td style="font-weight:700;">${kwh(reading.value)}</td>
        <td class="row-actions">
          <button type="button" class="secondary" data-edit="${reading.id}">Edit</button>
          <button type="button" class="secondary" data-delete="${reading.id}" style="color:var(--danger);">Delete</button>
        </td>
      </tr>`
    )
    .join("");

  els.readingsTable.querySelectorAll("[data-edit]").forEach((button) => {
    button.addEventListener("click", () => {
      const reading = model.readings.find((item) => item.id === button.dataset.edit);
      els.readingId.value = reading.id;
      els.readingValue.value = reading.value;
      els.readingTimestamp.value = localDateTimeValue(new Date(reading.timestamp));
      setCustomTimestampMode(true);
      els.cancelEdit.hidden = false;
      els.entryMessage.textContent = "Editing an actual reading. Estimates will be recalculated automatically.";
    });
  });

  els.readingsTable.querySelectorAll("[data-delete]").forEach((button) => {
    button.addEventListener("click", async () => {
      await deleteReading(db, button.dataset.delete);
      await refresh("Reading deleted. The model has recalculated estimates.");
    });
  });
}

function renderForecast() {
  const f = model.forecasts;
  const q = model.dataQuality;
  els.forecastConfidence.textContent = `${f.confidence}% confidence`;
  
  const rows = [
    ["Tomorrow", f.tomorrow ? kwh(f.tomorrow.generation) : "Needs data", f.tomorrow ? pct(f.tomorrow.confidence) : "0%"],
    ["7-day total", kwh(sum(f.sevenDay.map((day) => day.generation))), f.confidence + "%"]
  ];

  if (q.actualReadingCount >= 4) {
    rows.push(["Monthly", kwh(f.monthly.generation), f.monthly.confidence + "%"]);
    rows.push(["Bi-monthly", kwh(f.biMonthly.generation), f.biMonthly.confidence + "%"]);
    rows.push(["Annual", kwh(f.annual.generation), f.annual.confidence + "%"]);
  }

  els.forecastList.innerHTML = rows
    .map(([label, value, confidence]) => `<div><span>${label}</span><strong>${value}</strong><em>${confidence}</em></div>`)
    .join("");
    
  if (q.actualReadingCount < 4) {
    els.forecastList.innerHTML += `<p style="font-size:0.8rem; color:var(--muted); margin-top:10px; padding-top:10px; border-top:1px solid var(--line);">Advanced forecasts hidden until 4 readings are collected.</p>`;
  }
}

function renderCharts() {
  const daily = model.dailySeries.slice(-45).map((day) => ({ value: day.generation, kind: day.kind }));
  const monthly = monthlyChartPoints();
  const lifetime = running(model.actualDailySeries.concat(model.estimatedDailySeries).sort((a, b) => a.date.localeCompare(b.date)))
    .slice(-120)
    .map((point) => ({ value: point.value, kind: point.kind }));
  const forecast = model.forecastSeries.map((day) => ({ value: day.generation, kind: "forecast" }));
  const trend = rollingAverage(model.actualDailySeries.concat(model.estimatedDailySeries), 14)
    .slice(-90)
    .map((point) => ({ value: point.value, kind: point.kind }));

  renderBarChart(document.querySelector("#dailyChart"), daily);
  renderBarChart(document.querySelector("#monthlyChart"), monthly, { label: "monthly kWh" });
  renderLineChart(document.querySelector("#lifetimeChart"), lifetime, { label: "cumulative kWh" });
  renderBarChart(document.querySelector("#forecastChart"), forecast, { label: "forecast kWh" });
  renderLineChart(document.querySelector("#trendChart"), trend, { label: "14-day rolling average" });
}

function renderQuality() {
  const q = model.dataQuality;
  const warnings = [];
  if (q.actualReadingCount < 4) warnings.push("Forecasting is limited until at least four readings are available.");
  if (q.missingDayCount > 0) warnings.push(`${q.missingDayCount} missing days are estimated internally and never treated as actual readings.`);
  if (q.forecastReliability === "low") warnings.push("Confidence is intentionally low because the model has limited history.");

  els.qualityWarning.hidden = warnings.length === 0;
  els.qualityWarning.textContent = warnings.join(" ");
}

function resetForm() {
  els.readingId.value = "";
  els.readingValue.value = "";
  els.readingTimestamp.value = localDateTimeValue(new Date());
  setCustomTimestampMode(false);
  els.cancelEdit.hidden = true;
  els.entryMessage.textContent = "Enter only the inverter total. The model learns the rest.";
}

function setCustomTimestampMode(enabled) {
  els.useCustomTimestamp.checked = enabled;
  els.timestampField.hidden = !enabled;
  els.readingTimestamp.disabled = !enabled;
  els.autoTimestampLabel.hidden = enabled;
}

function monthlyChartPoints() {
  const days = model.actualDailySeries.concat(model.estimatedDailySeries);
  return model.aggregates.monthly.map((item) => {
    const monthDays = days.filter((day) => day.date.startsWith(item.period));
    const hasEstimate = monthDays.some((day) => day.kind === "estimated");
    return { value: item.generation, kind: hasEstimate ? "estimated" : "actual" };
  });
}

function localDateTimeValue(date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function kwh(value) {
  return `${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} kWh`;
}

function pct(value) {
  return `${Math.round((value || 0) * 100)}%`;
}

function sum(values) {
  return values.reduce((total, value) => total + value, 0);
}

function running(days) {
  let total = 0;
  return days.map((day) => {
    total += day.generation;
    return { value: total, kind: day.kind };
  });
}

function rollingAverage(days, windowSize) {
  return days.map((day, index) => {
    const window = days.slice(Math.max(0, index - windowSize + 1), index + 1);
    return { value: sum(window.map((item) => item.generation)) / window.length, kind: day.kind };
  });
}
