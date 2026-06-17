import { buildSolarModel } from "./analytics.js";
import { renderBarChart, renderLineChart } from "./charts.js";
import { checkForUpdates, manualUpdateCheck, showAboutModal, showSupportModal, CURRENT_VERSION, downloadLatestApk } from "./updates.js";
import { initTheme, applyTheme, getActiveThemeName } from "./theme.js";
import { showAlert, showDangerConfirm } from "./dialog.js";
import {
  deleteReading,
  exportBackup,
  getReadings,
  getSettings,
  importBackup,
  openDatabase,
  saveReading,
  saveSettings,
  getValidations,
  saveValidation
} from "./db.js";
import { setupDrivePrototype } from "./drivePrototype.js";

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
  currentVersionDisplay: document.querySelector("#currentVersionDisplay"),
  readingsTable: document.querySelector("#readingsTable"),
  readingCount: document.querySelector("#readingCount"),
  forecastList: document.querySelector("#forecastList"),
  dailyHistoryTable: document.querySelector("#dailyHistoryTable"),
  editModalOverlay: document.querySelector("#editModalOverlay"),
  editReadingForm: document.querySelector("#editReadingForm"),
  editReadingId: document.querySelector("#editReadingId"),
  editReadingValue: document.querySelector("#editReadingValue"),
  editUseCustomTimestamp: document.querySelector("#editUseCustomTimestamp"),
  editTimestampField: document.querySelector("#editTimestampField"),
  editReadingTimestamp: document.querySelector("#editReadingTimestamp"),
  closeEditModal: document.querySelector("#closeEditModal"),
  forecastConfidence: document.querySelector("#forecastConfidence"),
  swipeGestureEnabled: document.querySelector("#swipeGestureEnabled"),
  swipeGestureDisplay: document.querySelector("#swipeGestureDisplay"),
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
  gaugePct: document.querySelector("#gaugePct"),
  navBtns: document.querySelectorAll('.nav-btn[data-target]'),
  screens: document.querySelectorAll('.screen'),
  sideNav: document.getElementById('sideNav'),
  navOverlay: document.getElementById('navOverlay'),
  hamburgerBtn: document.getElementById('hamburgerBtn'),
  closeNav: document.getElementById('closeNav'),
  navCheckUpdates: document.getElementById('navCheckUpdates'),
  navAbout: document.getElementById('navAbout'),
  navSupport: document.getElementById('navSupport'),
  topbar: document.querySelector('.topbar'),
  rateDisplay: document.getElementById('rateDisplay'),
  electricityRate: document.getElementById('electricityRate'),
  dailyHistoryTable: document.getElementById('dailyHistoryTable'),
  androidPromoCard: document.getElementById('androidPromoCard'),
  dismissAndroidPromo: document.getElementById('dismissAndroidPromo'),
  homeDownloadAndroidBtn: document.getElementById('homeDownloadAndroidBtn'),
  navDownloadAndroid: document.getElementById('navDownloadAndroid'),
  stickyHomeBtn: document.getElementById('stickyHomeBtn'),
  prototypeGoogleSignIn: document.getElementById('prototypeGoogleSignIn'),
  prototypeSyncControls: document.getElementById('prototypeSyncControls'),
  prototypeUploadTest: document.getElementById('prototypeUploadTest'),
  prototypeDownloadTest: document.getElementById('prototypeDownloadTest'),
  prototypeSyncStatus: document.getElementById('prototypeSyncStatus')
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
  els.swipeGestureEnabled.checked = settings.swipeNavEnabled;

  if (settings.swipeNavEnabled === undefined) settings.swipeNavEnabled = true;
  if (settings.hideSwipeGestureInfo === undefined) settings.hideSwipeGestureInfo = false;
  els.swipeGestureEnabled.checked = settings.swipeNavEnabled;

  bindEvents();
  setupDrivePrototype(els);
  await refresh();
  if (window.SolarAndroid) {
    checkForUpdates();
    if (!settings.hideSwipeGestureInfo) {
      showSwipeGestureInfoModal();
    }
  } else {
    if (els.navCheckUpdates && els.navCheckUpdates.parentElement) {
      els.navCheckUpdates.parentElement.style.display = "none";
    }
    if (els.navDownloadAndroid) {
      els.navDownloadAndroid.style.display = "block";
      els.navDownloadAndroid.style.textAlign = "center";
    }
    const dismissedPromo = localStorage.getItem("dismissed_android_download_card");
    if (!dismissedPromo && els.androidPromoCard) {
      els.androidPromoCard.style.display = "block";
    }
  }
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("./service-worker.js").catch(() => {});
}

function bindEvents() {
  function openMenu() {
    els.sideNav.classList.add('open');
    els.navOverlay.classList.add('open');
  }
  function closeMenu() {
    els.sideNav.classList.remove('open');
    els.navOverlay.classList.remove('open');
  }

  els.hamburgerBtn.addEventListener('click', openMenu);
  els.closeNav.addEventListener('click', closeMenu);
  els.navOverlay.addEventListener('click', closeMenu);

  let touchStartX = 0;
  let touchStartY = 0;
  
  document.addEventListener("touchstart", (e) => {
    if (!settings.swipeNavEnabled) return;
    
    // Ignore if modal dialogs are open
    if (document.querySelector('.modal-overlay:not([style*="display: none"])')) return;
    
    // Ignore if target is inside chart or horizontally scrolling containers
    const target = e.target;
    if (target.closest('.recharts-wrapper') || target.closest('canvas') || target.closest('svg') || target.closest('.overflow-x') || target.closest('.table-container') || target.closest('#charts-container')) return;
    
    // Ignore if form inputs have focus
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
    
    touchStartX = e.changedTouches[0].clientX;
    touchStartY = e.changedTouches[0].clientY;
  }, { passive: true });

  document.addEventListener("touchend", (e) => {
    if (!settings.swipeNavEnabled) return;
    
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    
    const isMenuOpen = els.sideNav.classList.contains('open');

    // If menu is closed, only allow swipes starting from the left edge (0-30px)
    if (!isMenuOpen && touchStartX > 30) return;

    const deltaX = touchEndX - touchStartX;
    const deltaY = Math.abs(touchEndY - touchStartY);

    // Intentional horizontal swipe towards right to open
    if (!isMenuOpen && deltaX > 50 && deltaY < 30) {
      openMenu();
    }
    // Intentional horizontal swipe towards left to close
    else if (isMenuOpen && deltaX < -50 && deltaY < 30) {
      closeMenu();
    }
  }, { passive: true });

  els.navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      els.navBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      els.screens.forEach(s => s.hidden = true);
      document.getElementById(btn.dataset.target).hidden = false;
      closeMenu();
      if (btn.dataset.target === 'screen-graphs') renderCharts();
      // Update sticky home visibility based on new screen
      if (els.stickyHomeBtn) {
        const isHome = !document.getElementById('screen-home').hidden;
        if (!isHome || window.scrollY > 300) els.stickyHomeBtn.style.display = "inline-flex";
        else els.stickyHomeBtn.style.display = "none";
      }
    });
  });

  if (window.SolarAndroid) {
    els.navCheckUpdates.addEventListener("click", async () => {
      els.navCheckUpdates.textContent = "Checking...";
      els.navCheckUpdates.disabled = true;
      await manualUpdateCheck();
      els.navCheckUpdates.textContent = "Check for Updates";
      els.navCheckUpdates.disabled = false;
      closeMenu();
    });
  } else {
    if (els.navDownloadAndroid) {
      els.navDownloadAndroid.addEventListener("click", () => {
        downloadLatestApk();
        closeMenu();
      });
    }
    if (els.homeDownloadAndroidBtn) {
      els.homeDownloadAndroidBtn.addEventListener("click", downloadLatestApk);
    }
    if (els.dismissAndroidPromo) {
      els.dismissAndroidPromo.addEventListener("click", () => {
        if (els.androidPromoCard) els.androidPromoCard.style.display = "none";
        localStorage.setItem("dismissed_android_download_card", "true");
      });
    }
  }

  els.navAbout.addEventListener("click", () => {
    closeMenu();
    showAboutModal();
  });

  els.navSupport.addEventListener("click", () => {
    closeMenu();
    showSupportModal();
  });

  if (els.stickyHomeBtn) {
    window.addEventListener("scroll", () => {
      const isHome = !document.getElementById('screen-home').hidden;
      if (!isHome || window.scrollY > 300) {
        els.stickyHomeBtn.style.display = "inline-flex";
      } else {
        els.stickyHomeBtn.style.display = "none";
      }
    });

    els.stickyHomeBtn.addEventListener("click", () => {
      // Switch to home screen if not already there
      const isHome = !document.getElementById('screen-home').hidden;
      if (!isHome) {
        els.navBtns.forEach(b => {
          if (b.dataset.target === 'screen-home') b.classList.add('active');
          else b.classList.remove('active');
        });
        els.screens.forEach(s => s.hidden = true);
        document.getElementById('screen-home').hidden = false;
      }
      
      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });
      
      // Hide button immediately since we are now on home screen at top
      els.stickyHomeBtn.style.display = "none";
    });
  }

  // Smart Header Behavior
  let lastScrollY = window.scrollY;
  let scrollTicking = false;

  window.addEventListener('scroll', () => {
    if (!scrollTicking) {
      window.requestAnimationFrame(() => {
        const currentScrollY = window.scrollY;
        
        if (currentScrollY > 50) {
          if (currentScrollY > lastScrollY) {
            // Scrolling down
            els.topbar.style.transform = 'translateY(-150%)';
          } else {
            // Scrolling up
            els.topbar.style.transform = 'translateY(0)';
          }
        } else {
          // At top
          els.topbar.style.transform = 'translateY(0)';
        }
        
        lastScrollY = currentScrollY;
        scrollTicking = false;
      });
      scrollTicking = true;
    }
  });

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

  els.editReadingForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const readingValue = Number(els.editReadingValue.value);
    const readingId = els.editReadingId.value || undefined;
    const timestamp = els.editUseCustomTimestamp.checked ? els.editReadingTimestamp.value : new Date().toISOString();
    
    let epoch = 0;
    const sortedReadings = [...readings].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const prevReading = sortedReadings.filter(r => new Date(r.timestamp) < new Date(timestamp)).pop();
    
    let message = "Reading updated.";
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
    
    els.editModalOverlay.style.display = "none";
    await refresh(message);
  });

  els.closeEditModal.addEventListener("click", () => {
    els.editModalOverlay.style.display = "none";
  });

  els.cancelEdit.addEventListener("click", resetForm);

  els.useCustomTimestamp.addEventListener("change", () => {
    setCustomTimestampMode(els.useCustomTimestamp.checked);
    if (els.useCustomTimestamp.checked && !els.readingTimestamp.value) {
      els.readingTimestamp.value = localDateTimeValue(new Date());
    }
  });

  els.editUseCustomTimestamp.addEventListener("change", () => {
    els.editTimestampField.hidden = !els.editUseCustomTimestamp.checked;
    els.editReadingTimestamp.disabled = !els.editUseCustomTimestamp.checked;
    if (els.editUseCustomTimestamp.checked && !els.editReadingTimestamp.value) {
      els.editReadingTimestamp.value = localDateTimeValue(new Date());
    }
  });

  els.settingsForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    settings.installationDate = els.installationDate.value;
    settings.solarCapacity = els.solarCapacity.value;
    settings.solarCapacityUnit = els.solarCapacityUnit.value;
    settings.themeMode = els.themeMode.value;
    settings.swipeNavEnabled = els.swipeGestureEnabled.checked;
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
        els.importData.value = "";
        return showAlert("Import Failed", "The selected file is not a valid JSON backup.");
      }

      showDangerConfirm(
        "Import Backup",
        "Importing a backup will replace your current data and settings. This cannot be undone. Proceed?",
        "Import",
        async () => {
          try {
            await importBackup(db, backup);

            // Update local state and UI
            settings = await getSettings(db);
            if (els.installationDate) {
              els.installationDate.value = settings.installationDate || "";
            }
            if (els.solarCapacity) {
              els.solarCapacity.value = settings.solarCapacity || "";
              els.solarCapacityUnit.value = settings.solarCapacityUnit || "kW";
            }
            
            await refresh("Backup restored successfully. Analytics have been recalculated.");
            navigate("screen-home");
          } catch (err) {
            console.error("Import error:", err);
            if (els.entryMessage) {
              els.entryMessage.textContent = "Import failed: " + err.message;
              els.entryMessage.style.color = "var(--danger)";
            } else {
              showAlert("Import Failed", err.message);
            }
          } finally {
            els.importData.value = "";
          }
        }
      );
    } catch (err) {
      console.error("File read error:", err);
      showAlert("Import Failed", err.message);
      els.importData.value = "";
    }
  });

  window.addEventListener("resize", () => renderCharts());
}

async function refresh(message = "") {
  try {
    readings = await getReadings(db);
    settings = await getSettings(db);
    const validations = await getValidations(db);
    model = buildSolarModel(readings, settings, validations);
    
    await syncValidations(validations);
    
    renderGauge();
    renderModelStatus();
    renderMetrics();
    renderReadings();
    renderForecast();
    renderCharts();
    renderQuality();
    renderWarnings();
    renderDailyHistory();
    renderSettingsView();
    if (message) els.entryMessage.textContent = message;
  } catch (err) {
    console.error("Refresh failed:", err);
    els.entryMessage.textContent = "Error: " + err.message;
  }
}

async function syncValidations(validations) {
  const d = model.dashboard;
  const now = new Date();
  const todayDate = d.isDayClosed && d.todayPhase === "Closed Day" ? null : model.forecasts.sevenDay.find(f => f.kind === "today")?.date || new Date().toISOString().split("T")[0];

  let needsRefresh = false;

  // 1. Capture Snapshot for Today (if missing)
  if (todayDate && !validations[todayDate]) {
    const expectedToday = d.expectedTodayGeneration;
    if (expectedToday !== undefined && expectedToday > 0) {
      const pendingRecord = {
        date: todayDate,
        forecast: expectedToday,
        actual: null,
        status: "pending",
        capturedAt: now.toISOString()
      };
      await saveValidation(db, pendingRecord);
      validations[todayDate] = pendingRecord;
      needsRefresh = true;
    }
  }

  // 2. Finalize Pending Snapshots
  const dcrs = model.dailyClosingRecords;
  for (const dcr of dcrs) {
    const val = validations[dcr.date];
    if (val && val.status === "pending" && (dcr.date < todayDate || d.isDayClosed)) {
      val.actual = dcr.value; // Wait, dcr.value is virtual cumulative value! We need generation!
      // Find generation from actualDailySeries
      const actualDay = model.actualDailySeries.find(a => a.date === dcr.date);
      if (actualDay) {
        val.actual = actualDay.generation;
        val.error = val.actual - val.forecast;
        val.errorPct = val.forecast > 0 ? (val.error / val.forecast) * 100 : 0;
        val.status = "validated";
        await saveValidation(db, val);
        needsRefresh = true;
      }
    }
  }

  if (needsRefresh) {
    // We only refresh the model quietly, no full UI rerender yet.
    // The main refresh() will continue and render the updated model state.
    const updatedValidations = await getValidations(db);
    model = buildSolarModel(readings, settings, updatedValidations);
  }
}

function renderGauge() {
  const d = model.dashboard;
  const q = model.dataQuality;
  const current = d.todayGeneration;
  const expected = d.expectedTodayGeneration || 0.001;
  const isClosed = d.isDayClosed;
  
  els.gaugeValue.textContent = current.toFixed(2);
  
  if (q.actualDayCount < 30) {
    els.gaugeExpected.textContent = "Learning Phase";
    els.gaugePct.textContent = `${q.actualDayCount}/30 days`;
    els.gaugeProgress.style.strokeDashoffset = 565.48;
    els.gaugeProgress.style.stroke = "rgba(255, 255, 255, 0.1)";
    return;
  }

  if (!isClosed) {
    els.gaugeExpected.textContent = `${expected.toFixed(2)} kWh (Est)`;
    els.gaugePct.textContent = d.todayPhase;
    
    const displayPct = Math.min(100, Math.round((current / expected) * 100));
    const circumference = 2 * Math.PI * 90;
    const offset = circumference - (circumference * displayPct) / 100;
    els.gaugeProgress.style.strokeDashoffset = offset;
    els.gaugeProgress.style.stroke = "var(--muted)";
    return;
  }

  const pctValue = Math.round((current / expected) * 100);
  const displayPct = Math.min(100, pctValue);
  
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
  const d = model.dashboard;
  const state = d.forecastState;
  
  let stateLabel = "Learning";
  if (state === "limited") stateLabel = "Limited Forecasting";
  else if (state === "ready") stateLabel = "Forecast Ready";

  els.forecastStateText.textContent = stateLabel;
  
  const dot = document.getElementById("forecastStateDot");
  if (dot) {
    if (state === "learning") dot.style.background = "var(--rose)";
    else if (state === "limited") dot.style.background = "var(--amber)";
    else dot.style.background = "var(--green)";
  }
  
  const stats = [
    ["Current Phase", d.todayPhase],
    ["Forecast State", stateLabel],
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
  if (els.modelStatus) {
    els.modelStatus.textContent = status === "low" ? "Learning..." : `Model: ${status}`;
    els.modelStatus.style.color = status === "strong" ? "var(--green)" : status === "developing" ? "var(--amber)" : "var(--muted)";
  }
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

  if (d.isDayClosed && q.actualDayCount >= 7) {
    cards.push(["Solar Performance", `${d.solarPerformance.score}% ${d.solarPerformance.status}`]);
  } else if (q.actualDayCount < 7) {
    cards.push(["Forecast State", "Learning"]);
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
    console.log("Diagnostic: Attaching edit click listener to reading ID", button.dataset.edit);
    button.addEventListener("click", () => {
      console.log("Diagnostic: Edit button clicked for reading ID", button.dataset.edit);
      const reading = model.readings.find((item) => item.id === button.dataset.edit);
      console.log("Diagnostic: Found reading data", reading);
      els.editReadingId.value = reading.id;
      els.editReadingValue.value = reading.value;
      els.editReadingTimestamp.value = localDateTimeValue(new Date(reading.timestamp));
      els.editUseCustomTimestamp.checked = true;
      els.editTimestampField.hidden = false;
      els.editReadingTimestamp.disabled = false;
      console.log("Diagnostic: Opening edit modal overlay");
      els.editModalOverlay.style.display = "flex";
      console.log("Diagnostic: Modal overlay display set to flex");
    });
  });

  els.readingsTable.querySelectorAll("[data-delete]").forEach((button) => {
    button.addEventListener("click", async () => {
      const id = button.dataset.delete;
      const reading = model.readings.find(r => r.id === id);
      const isDCR = model.dailyClosingRecords.some(dcr => dcr.readingId === id);
      
      let message = "Reading deleted.";
      if (isDCR) {
        message = "Daily Closing Record deleted. Historical metrics have been updated.";
      } else {
        message = "Intraday observation deleted. Historical metrics remain unchanged.";
      }
      
      showDangerConfirm(
        "Delete Reading",
        "Are you sure you want to delete this reading? " + message,
        "Delete",
        async () => {
          await deleteReading(db, id);
          await refresh(message);
        }
      );
    });
  });
}

function renderForecast() {
  const f = model.forecasts;
  const q = model.dataQuality;
  const d = model.dashboard;
  
  if (d.forecastState === "learning") {
    els.forecastConfidence.textContent = "0% confidence";
    els.forecastList.innerHTML = `<p style="font-size:0.8rem; color:var(--muted); padding: 10px;">Learning - insufficient historical data. Need 7 days of closing records for initial forecasting.</p>`;
    return;
  }

  els.forecastConfidence.textContent = `${f.confidence}% confidence`;
  
  const rows = [
    ["Tomorrow", kwh(f.tomorrow.generation), pct(f.tomorrow.confidence)],
    ["7-day total", kwh(sum(f.sevenDay.map((day) => day.generation))), f.confidence + "%"]
  ];

  if (d.forecastState === "ready") {
    rows.push(["Monthly", kwh(f.monthly.generation), f.monthly.confidence + "%"]);
    rows.push(["Bi-monthly", kwh(f.biMonthly.generation), f.biMonthly.confidence + "%"]);
    rows.push(["Annual", kwh(f.annual.generation), f.annual.confidence + "%"]);
  }

  els.forecastList.innerHTML = rows
    .map(([label, value, confidence]) => `<div><span>${label}</span><strong>${value}</strong><em>${confidence}</em></div>`)
    .join("");
    
  if (d.forecastState === "limited") {
    els.forecastList.innerHTML += `<p style="font-size:0.8rem; color:var(--muted); margin-top:10px; padding-top:10px; border-top:1px solid var(--line);">Advanced forecasts hidden until 30 daily records are collected.</p>`;
  }
}

function renderCharts() {
  const q = model.dataQuality;
  const d = model.dashboard;
  const isLearning = d.forecastState === "learning";
  const isDeveloping = d.forecastState !== "ready";

  // Daily Chart
  const daily = model.dailySeries.slice(-45).map((day) => ({ 
    value: day.generation, 
    actualValue: day.actualValue || 0,
    forecastValue: day.forecastValue,
    kind: day.kind, 
    date: day.date,
    confidence: day.confidence
  }));
  renderBarChart(document.querySelector("#dailyChart"), daily);

  // Monthly Chart
  const monthlyPanel = document.querySelector("#monthlyPanel");
  const monthlyLearningInfo = document.querySelector("#monthlyLearningInfo");
  const monthlyChartWrapper = document.querySelector("#monthlyChartWrapper");
  
  if (isDeveloping) {
    monthlyPanel.classList.add("compact");
    if (monthlyLearningInfo) {
      monthlyLearningInfo.hidden = false;
      document.querySelector("#monthlyReadinessPct").textContent = `${Math.round((q.actualDayCount / 30) * 100)}%`;
      document.querySelector("#monthlyCollectedDays").textContent = `${q.actualDayCount} / 30`;
      document.querySelector("#monthlyRemainingDays").textContent = Math.max(0, 30 - q.actualDayCount);
    }
    if (monthlyChartWrapper) {
      monthlyChartWrapper.style.display = "none";
    }
  } else {
    monthlyPanel.classList.remove("compact");
    if (monthlyLearningInfo) monthlyLearningInfo.hidden = true;
    if (monthlyChartWrapper) {
      monthlyChartWrapper.style.display = "block";
    }
    const monthly = monthlyChartPoints();
    renderBarChart(document.querySelector("#monthlyChart"), monthly, { label: "monthly kWh" });
  }
  
  // Forecast Chart
  const forecastPanel = document.querySelector("#forecastPanel");
  const forecastPlaceholder = forecastPanel.querySelector(".learning-placeholder");
  const forecastChartWrapper = document.querySelector("#forecastChartWrapper");
  
  if (isDeveloping) {
    forecastPanel.classList.add("compact");
    forecastPlaceholder.hidden = false;
    if (forecastChartWrapper) {
      forecastChartWrapper.style.display = "none";
    }
  } else {
    forecastPanel.classList.remove("compact");
    forecastPlaceholder.hidden = true;
    if (forecastChartWrapper) {
      forecastChartWrapper.style.display = "block";
    }
    const forecast = model.forecastSeries.map((day) => ({ 
      value: day.generation, 
      actualValue: day.actualValue || 0,
      kind: day.kind,
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
  els.currentVersionDisplay.textContent = `v${CURRENT_VERSION}`;
  els.swipeGestureDisplay.textContent = settings.swipeNavEnabled ? "Enabled" : "Disabled";

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

function showSwipeGestureInfoModal() {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  
  overlay.innerHTML = `
    <div class="glass-modal">
      <h2 style="margin: 0 0 12px 0; font-size: 1.2rem; font-weight: 800; color: var(--brand);">Navigation Gesture Available</h2>
      <p style="margin: 0 0 20px 0; font-size: 0.95rem; color: var(--ink); line-height: 1.5;">The swipe gesture is set to open the hamburger menu in the app interface. You can toggle this setting on or off using the switch below.</p>
      
      <div style="margin-bottom: 12px; background: rgba(0,0,0,0.03); padding: 12px; border-radius: 8px;">
        <div style="display: flex; flex-direction: row; align-items: center; justify-content: space-between;">
          <span style="font-weight: 600;">Enable swipe gesture</span>
          <label class="toggle-switch">
            <input type="checkbox" id="modalSwipeToggle" ${settings.swipeNavEnabled ? 'checked' : ''}>
            <span class="slider"></span>
          </label>
        </div>
      </div>
      
      <div style="margin-bottom: 20px; padding: 0 12px;">
        <label style="display: flex; flex-direction: row; align-items: center; gap: 8px; cursor: pointer;">
          <input type="checkbox" id="modalDontShowToggle" style="width: auto;">
          <span style="font-size: 0.9rem;">Don't show again</span>
        </label>
      </div>

      <div class="modal-actions">
        <button class="primary" id="modalSwipeSave">Save</button>
        <button class="secondary" id="modalSwipeLater">Later</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(overlay);

  overlay.querySelector("#modalSwipeSave").addEventListener("click", async () => {
    const swipeEnabled = overlay.querySelector("#modalSwipeToggle").checked;
    const dontShow = overlay.querySelector("#modalDontShowToggle").checked;
    
    settings.swipeNavEnabled = swipeEnabled;
    if (dontShow) {
      settings.hideSwipeGestureInfo = true;
    }
    
    els.swipeGestureEnabled.checked = swipeEnabled;
    els.swipeGestureDisplay.textContent = swipeEnabled ? "Enabled" : "Disabled";
    
    await saveSettings(db, settings);
    overlay.remove();
  });
  
  overlay.querySelector("#modalSwipeLater").addEventListener("click", () => {
    overlay.remove();
  });
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
  const result = days.map((day, index) => {
    const window = days.slice(Math.max(0, index - windowSize + 1), index + 1);
    return { 
      value: sum(window.map((item) => item.generation)) / window.length, 
      kind: day.kind,
      date: day.date
    };
  });
  
  let startIndex = 0;
  while (startIndex < result.length && result[startIndex].value <= 0) {
    startIndex++;
  }
  
  return result.slice(startIndex);
}

function renderDailyHistory() {
  const dcr = model.dailyClosingRecords;
  const history = [];
  
  if (dcr.length > 0) {
    const firstReading = model.readings[0];
    if (firstReading) {
      const delta = dcr[0].value - firstReading.virtualValue;
      if (delta > 0) {
        history.push({ date: dcr[0].date, generation: delta });
      }
    }
    
    for (let i = 1; i < dcr.length; i++) {
      history.push({
        date: dcr[i].date,
        generation: dcr[i].value - dcr[i-1].value
      });
    }
  }
  
  history.sort((a, b) => b.date.localeCompare(a.date));
  
  els.dailyHistoryTable.innerHTML = history
    .filter(item => item.generation > 0)
    .map(
      (item) => `
      <tr>
        <td style="font-size:0.85rem; font-weight:500;">
          ${new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(item.date))}
        </td>
        <td style="font-weight:700;">${kwh(item.generation)}</td>
      </tr>`
    )
    .join("");
}
