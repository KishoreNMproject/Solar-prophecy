import { buildSolarModel } from "./analytics.js";
import { renderBarChart, renderLineChart } from "./charts.js";
import { checkForUpdates } from "./updates.js";
import { initTheme, applyTheme, getActiveThemeName } from "./theme.js";
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
  settingsView: document.querySelector("#settingsView"),
  settingsEdit: document.querySelector("#settingsEdit"),
  editSettingsBtn: document.querySelector("#editSettingsBtn"),
  cancelSettings: document.querySelector("#cancelSettings"),
  capacityDisplay: document.querySelector("#capacityDisplay"),
  yearDisplay: document.querySelector("#yearDisplay"),
  installationDate: document.querySelector("#installationDate"),
  solarCapacity: document.querySelector("#solarCapacity"),
  solarCapacityUnit: document.querySelector("#solarCapacityUnit"),
  metricsGrid: document.querySelector("#metricsGrid"),
  themeMode: document.querySelector("#themeMode"),
  activeThemeDisplay: document.querySelector("#activeThemeDisplay"),
  readingsTable: document.querySelector("#readingsTable"),
  readingCount: document.querySelector("#readingCount"),
  forecastList: document.querySelector("#forecastList"),
  forecastConfidence: document.querySelector("#forecastConfidence"),
  qualityWarning: document.querySelector("#qualityWarning"),
  lowGenerationWarning: document.querySelector("#lowGenerationWarning"),
  modelStatus: document.querySelector("#modelStatus"),
  modelStatusStats: document.querySelector("#modelStatusStats"),
  forecastStateText: document.querySelector("#forecastStateText"),
  exportData: document.querySelector("#exportData"),
  importTrigger: document.querySelector("#importTrigger"),
  importData: document.querySelector("#importData"),
  gaugeProgress: document.querySelector("#gaugeProgress"),
  gaugeValue: document.querySelector("#gaugeValue"),
  gaugeExpected: document.querySelector("#gaugeExpected"),
  gaugePct: document.querySelector("#gaugePct")
};

init();

async function init() {
  db = await openDatabase();
  readings = await getReadings(db);
  settings = await getSettings(db);
  initTheme(settings);
  els.readingTimestamp.value = localDateTimeValue(new Date());
  setCustomTimestampMode(false);
  els.installationDate.value = settings.installationDate || "";
  els.solarCapacity.value = settings.solarCapacity || "";
  els.solarCapacityUnit.value = settings.solarCapacityUnit || "kW";
  els.themeMode.value = settings.themeMode || "system";
  bindEvents();
  await refresh();
  checkForUpdates();
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("./service-worker.js").catch(() => {});
}

function bindEvents() {
  els.form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const readingValue = Number(els.readingValue.value);
    const readingId = els.readingId.value || undefined;
    const timestamp = els.useCustomTimestamp.checked ? els.readingTimestamp.value : new Date().toISOString();
    
    // Determine epoch
    let epoch = 0;
    const sortedReadings = [...readings].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const prevReading = sortedReadings.filter(r => new Date(r.timestamp) < new Date(timestamp)).pop();
    
    let message = "Reading saved.";
    if (prevReading) {
      epoch = prevReading.epoch || 0;
      if (readingValue < prevReading.value) {
        epoch++;
        message = "Meter reset detected. Historical production preserved.";
      }
    }

    await saveReading(db, {
      id: readingId,
      value: readingValue,
      timestamp,
      epoch
    });
    resetForm();
    await refresh(message);
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
    settings.solarCapacity = els.solarCapacity.value;
    settings.solarCapacityUnit = els.solarCapacityUnit.value;
    settings.themeMode = els.themeMode.value;
    applyTheme(settings.themeMode);
    await saveSettings(db, settings);
    await refresh("Settings saved.");
  });

  els.editSettingsBtn.addEventListener("click", () => {
    els.settingsEdit.hidden = false;
    els.editSettingsBtn.hidden = true;
  });

  els.cancelSettings.addEventListener("click", () => {
    els.settingsEdit.hidden = true;
    els.editSettingsBtn.hidden = false;
    
    els.installationDate.value = settings.installationDate || "";
    els.solarCapacity.value = settings.solarCapacity || "";
    els.solarCapacityUnit.value = settings.solarCapacityUnit || "kW";
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

  els.importTrigger.addEventListener("click", () => {
    els.importData.click();
  });

  els.importData.addEventListener("change", async () => {
    try {
      const file = els.importData.files[0];
      if (!file) return;

      if (els.entryMessage) {
        els.entryMessage.textContent = "Processing backup file...";
        els.entryMessage.style.color = "var(--green)";
      }

      const text = await file.text();
      let backup;
      try {
        backup = JSON.parse(text);
      } catch (e) {
        throw new Error("The selected file is not a valid JSON backup.");
      }

      await importBackup(db, backup);

      // Update local state and UI
      settings = await getSettings(db);
      if (els.installationDate) {
        els.installationDate.value = settings.installationDate || "";
      }

      await refresh("Backup restored successfully. Analytics have been recalculated.");      
    } catch (err) {
      console.error("Import failed:", err);
      if (els.entryMessage) {
        els.entryMessage.textContent = "Import failed: " + err.message;
        els.entryMessage.style.color = "var(--danger)";
      } else {
        alert("Import failed: " + err.message);
      }
    } finally {
      els.importData.value = "";
    }
  });

  window.addEventListener("resize", () => renderCharts());
}

async function refresh(message = "") {
  try {
    readings = await getReadings(db);
    settings = await getSettings(db);
    model = buildSolarModel(readings, settings);
    renderGauge();
    renderModelStatus();
    renderMetrics();
    renderReadings();
    renderForecast();
    renderCharts();
    renderQuality();
    renderWarnings();
    renderSettingsView();
    if (message) els.entryMessage.textContent = message;
  } catch (err) {
    console.error("Refresh failed:", err);
    els.entryMessage.textContent = "Error: " + err.message;
  }
}

function renderGauge() {
  const d = model.dashboard;
  const q = model.dataQuality;
  const current = d.todayGeneration;
  const expected = d.expectedTodayGeneration || 0.001;
  const pctValue = Math.round((current / expected) * 100);
  const displayPct = Math.min(100, pctValue);
  
  els.gaugeValue.textContent = current.toFixed(2);
  
  if (q.actualDayCount < 30) {
    els.gaugeExpected.textContent = "Learning Phase";
    els.gaugePct.textContent = `${q.actualDayCount}/30 days`;
    els.gaugeProgress.style.strokeDashoffset = 565.48;
    els.gaugeProgress.style.stroke = "rgba(255, 255, 255, 0.1)";
    return;
  }

  els.gaugeExpected.textContent = `${expected.toFixed(2)} kWh`;
  els.gaugePct.textContent = `${pctValue}%`;
  
  const circumference = 2 * Math.PI * 90;
  const offset = circumference - (circumference * displayPct) / 100;
  els.gaugeProgress.style.strokeDashoffset = offset;
  
  let color = "var(--amber)";
  if (pctValue >= 95) {
    color = "var(--green)";
  } else if (pctValue >= 80) {
    color = "var(--amber)";
  } else {
    color = "var(--rose)";
  }
  els.gaugeProgress.style.stroke = color;
}

function renderModelStatus() {
  const q = model.dataQuality;
  const state = model.dashboard.forecastState;
  
  els.forecastStateText.textContent = state.charAt(0).toUpperCase() + state.slice(1);
  
  const stats = [
    ["Raw Observations", q.rawObservationCount],
    ["Daily Records", q.dailyClosingRecordCount],
    ["Intraday", q.rawObservationCount - q.dailyClosingRecordCount],
    ["Missing Days", q.missingDayCount],
    ["Estimated Days", q.estimatedDayCount]
  ];

  els.modelStatusStats.innerHTML = stats
    .map(([label, value]) => `
      <div class="status-stat">
        <span>${label}</span>
        <strong>${value}</strong>
      </div>`)
    .join("");

  const status = q.forecastReliability;
  els.modelStatus.textContent = status === "low" ? "Learning..." : `Model: ${status}`;
  els.modelStatus.style.color = status === "strong" ? "var(--green)" : status === "developing" ? "var(--amber)" : "var(--muted)";
}

function renderMetrics() {
  const d = model.dashboard;
  const q = model.dataQuality;
  
  const cards = [
    ["Weekly average", q.actualDayCount >= 7 ? kwh(d.weeklyAverage) : "Learning"],
    ["Monthly average", q.actualDayCount >= 30 ? kwh(d.monthlyAverage) : "Learning"],
    ["Best day", d.bestProductionDay ? `${kwh(d.bestProductionDay.generation)}` : "Learning"],
    ["Daily Records", `${q.dailyClosingRecordCount} days`],
    ["Lifetime production", kwh(d.lifetimeProduction)],
    ["Confidence", q.actualDayCount >= 7 ? `${d.forecastConfidence}%` : "0%"],
    ["System age", d.systemAgeDays == null ? "Unknown" : `${Math.floor(d.systemAgeDays / 365)}y ${d.systemAgeDays % 365}d`]
  ];

  if (q.actualDayCount >= 7) {
    cards.push(["Solar Performance", `${d.solarPerformance.score}% ${d.solarPerformance.status}`]);
  } else {
    cards.push(["Annual Estimate", q.actualDayCount >= 30 ? kwh(d.annualForecast.generation) : "Learning"]);
  }

  els.metricsGrid.innerHTML = cards
    .map(([label, value]) => `<article class="metric"><span>${label}</span><strong>${value}</strong></article>`)
    .join("");
}

function renderReadings() {
  const sorted = [...model.readings].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  els.readingCount.textContent = `${sorted.length} readings recorded`;
  els.readingsTable.innerHTML = sorted
    .map(
      (reading) => `
      <tr>
        <td style="font-size:0.85rem; font-weight:500;">${formatDateTime(reading.timestamp)}</td>
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
  
  if (q.actualDayCount < 7) {
    els.forecastConfidence.textContent = "0% confidence";
    els.forecastList.innerHTML = `<p style="font-size:0.8rem; color:var(--muted); padding: 10px;">Learning - insufficient historical data. Need 7 days of closing records for initial forecasting.</p>`;
    return;
  }

  els.forecastConfidence.textContent = `${f.confidence}% confidence`;
  
  const rows = [
    ["Tomorrow", kwh(f.tomorrow.generation), pct(f.tomorrow.confidence)],
    ["7-day total", kwh(sum(f.sevenDay.map((day) => day.generation))), f.confidence + "%"]
  ];

  if (q.actualDayCount >= 30) {
    rows.push(["Monthly", kwh(f.monthly.generation), f.monthly.confidence + "%"]);
    rows.push(["Bi-monthly", kwh(f.biMonthly.generation), f.biMonthly.confidence + "%"]);
    rows.push(["Annual", kwh(f.annual.generation), f.annual.confidence + "%"]);
  }

  els.forecastList.innerHTML = rows
    .map(([label, value, confidence]) => `<div><span>${label}</span><strong>${value}</strong><em>${confidence}</em></div>`)
    .join("");
    
  if (q.actualDayCount < 30) {
    els.forecastList.innerHTML += `<p style="font-size:0.8rem; color:var(--muted); margin-top:10px; padding-top:10px; border-top:1px solid var(--line);">Advanced forecasts hidden until 30 daily records are collected.</p>`;
  }
}

function renderCharts() {
  const q = model.dataQuality;
  const isLearning = q.actualDayCount < 7;
  const isDeveloping = q.actualDayCount < 30;

  // Daily Chart
  const daily = model.dailySeries.slice(-45).map((day) => ({ 
    value: day.generation, 
    kind: day.kind, 
    date: day.date,
    confidence: day.confidence
  }));
  renderBarChart(document.querySelector("#dailyChart"), daily);

  // Monthly Chart
  const monthlyPanel = document.querySelector("#monthlyPanel");
  const monthlyPlaceholder = monthlyPanel.querySelector(".learning-placeholder");
  if (isDeveloping) {
    monthlyPanel.classList.add("compact");
    monthlyPlaceholder.hidden = false;
  } else {
    monthlyPanel.classList.remove("compact");
    monthlyPlaceholder.hidden = true;
    const monthly = monthlyChartPoints();
    renderBarChart(document.querySelector("#monthlyChart"), monthly, { label: "monthly kWh" });
  }

  // Forecast Chart
  const forecastPanel = document.querySelector("#forecastPanel");
  const forecastPlaceholder = forecastPanel.querySelector(".learning-placeholder");
  if (isLearning) {
    forecastPanel.classList.add("compact");
    forecastPlaceholder.hidden = false;
  } else {
    forecastPanel.classList.remove("compact");
    forecastPlaceholder.hidden = true;
    const forecast = model.forecastSeries.map((day) => ({ 
      value: day.generation, 
      kind: "forecast",
      date: day.date,
      confidence: day.confidence
    }));
    renderBarChart(document.querySelector("#forecastChart"), forecast, { label: "forecast kWh" });
  }
  
  // Trend Chart
  const trend = rollingAverage(model.actualDailySeries.concat(model.estimatedDailySeries), 14)
    .slice(-90);
  renderLineChart(document.querySelector("#trendChart"), trend, { label: "14-day rolling average" });
}

function renderQuality() {
  const q = model.dataQuality;
  const warnings = [];
  if (q.actualDayCount < 7) warnings.push("Learning phase: initial forecasting requires at least 7 days of closing records.");
  else if (q.actualDayCount < 30) warnings.push("Limited forecasting: model is still learning long-term patterns.");
  
  if (q.missingDayCount > 0) warnings.push(`${q.missingDayCount} missing days are estimated and never treated as actual records.`);
  if (q.forecastReliability === "low" && q.actualDayCount >= 7) warnings.push("Confidence is low due to limited or highly variable data.");

  if (!settings.solarCapacity) {
    warnings.push("Configure Installed Solar Capacity in Settings for improved forecasting and performance analysis.");
  }

  els.qualityWarning.hidden = warnings.length === 0;
  els.qualityWarning.textContent = warnings.join(" ");
}

function renderWarnings() {
  const d = model.dashboard;
  els.lowGenerationWarning.hidden = !d.lowGenerationDetected;
}

function renderSettingsView() {
  const hasCapacity = !!settings.solarCapacity;
  const hasYear = !!settings.installationDate;

  // Always keep the view summary updated
  els.capacityDisplay.textContent = hasCapacity ? `${settings.solarCapacity} ${settings.solarCapacityUnit}` : "--";
  els.yearDisplay.textContent = hasYear ? settings.installationDate : "--";
  els.activeThemeDisplay.textContent = getActiveThemeName();

  // First-time setup: show edit form by default, hide edit button
  if (!hasCapacity && !hasYear) {
    els.settingsEdit.hidden = false;
    els.editSettingsBtn.hidden = true;
    els.cancelSettings.hidden = true;
  } else {
    els.settingsEdit.hidden = true;
    els.editSettingsBtn.hidden = false;
    els.cancelSettings.hidden = false;
  }
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
    return { 
      value: item.generation, 
      kind: hasEstimate ? "estimated" : "actual",
      date: item.period
    };
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

function running(days, initialValue = 0) {
  let total = initialValue;
  return days.map((day) => {
    total += day.generation;
    return { 
      value: total, 
      kind: day.kind,
      date: day.date
    };
  });
}

function rollingAverage(days, windowSize) {
  return days.map((day, index) => {
    const window = days.slice(Math.max(0, index - windowSize + 1), index + 1);
    return { 
      value: sum(window.map((item) => item.generation)) / window.length, 
      kind: day.kind,
      date: day.date
    };
  });
}
