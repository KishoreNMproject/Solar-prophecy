const DAY_MS = 86_400_000;

export const SOLAR_PHASE = {
  EARLY: "Early Generation Window",
  PEAK: "Peak Generation Window",
  LATE: "Late Generation Window",
  POST: "Post-Generation Window",
  CLOSED: "Closed Day"
};

export function toDateKey(input) {
  const date = input instanceof Date ? input : new Date(input);
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function fromDateKey(key) {
  const parts = key.split("-").map(Number);
  if (parts.length === 1) {
    return new Date(parts[0], 0, 1);
  }
  const [year, month, day] = parts;
  return new Date(year, month - 1, day);
}

export function addDays(key, days) {
  const date = fromDateKey(key);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

export function daysBetween(a, b) {
  return Math.round((fromDateKey(b) - fromDateKey(a)) / DAY_MS);
}

export function monthKey(key) {
  return key.slice(0, 7);
}

export function biMonthKey(key) {
  const date = fromDateKey(key);
  const period = Math.floor(date.getMonth() / 2) + 1;
  return `${date.getFullYear()}-B${period}`;
}

export function yearKey(key) {
  return key.slice(0, 4);
}

export function getSolarPhase(date, now = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  const n = now instanceof Date ? now : new Date(now);
  
  const dKey = toDateKey(d);
  const nKey = toDateKey(n);
  
  if (dKey < nKey) return SOLAR_PHASE.CLOSED;
  if (dKey > nKey) return SOLAR_PHASE.EARLY; // Future date? Treat as Early.

  const hour = d.getHours();
  
  if (hour < 10) return SOLAR_PHASE.EARLY;
  if (hour < 15) return SOLAR_PHASE.PEAK;
  if (hour < 19) return SOLAR_PHASE.LATE;
  return SOLAR_PHASE.POST;
}

export function normalizeReadings(readings) {
  return readings
    .map((reading) => ({
      id: reading.id,
      timestamp: new Date(reading.timestamp).toISOString(),
      value: Number(reading.value),
      epoch: Number(reading.epoch) || 0
    }))
    .filter((reading) => Number.isFinite(reading.value) && reading.value >= 0)
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

export function applyEpochs(readings) {
  if (readings.length === 0) return [];
  const result = [];
  let currentOffset = 0;
  
  for (let i = 0; i < readings.length; i++) {
    const r = readings[i];
    if (i > 0 && r.epoch > readings[i-1].epoch) {
      currentOffset += readings[i-1].value;
    }
    result.push({
      ...r,
      virtualValue: r.value + currentOffset
    });
  }
  return result;
}

export function getDailyClosingRecords(readings, now = new Date()) {
  const normalized = applyEpochs(normalizeReadings(readings));
  const byDate = new Map();
  const nKey = toDateKey(now);
  
  for (const reading of normalized) {
    const date = toDateKey(reading.timestamp);
    const phase = getSolarPhase(reading.timestamp, now);
    
    // Only accept readings that are in POST or CLOSED phase for that day
    // or if the day is before "now"
    if (date < nKey || phase === SOLAR_PHASE.POST || phase === SOLAR_PHASE.CLOSED) {
      // The latest observation becomes the Daily Closing Record.
      // Since normalized is sorted by timestamp, simply setting it overwrites with the latest.
      byDate.set(date, reading);
    }
  }
  
  return [...byDate.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, reading]) => ({
      date,
      value: reading.virtualValue,
      rawValue: reading.value,
      readingId: reading.id,
      timestamp: reading.timestamp,
      epoch: reading.epoch,
      phase: getSolarPhase(reading.timestamp, now)
    }));
}

export function buildSolarModel(readings, settings = {}, now = new Date()) {
  const allReadings = applyEpochs(normalizeReadings(readings));
  const dailyClosingRecords = getDailyClosingRecords(readings, now);
  const dailySeries = buildDailySeries(dailyClosingRecords, allReadings);
  
  // Capacity parsing
  const capacityValue = Number(settings.solarCapacity) || 0;
  const capacityUnit = settings.solarCapacityUnit || "kW";
  const capacityKW = capacityUnit === "W" ? capacityValue / 1000 : capacityValue;

  // Historical accounting must consume Daily Closing Records only.
  const actualDays = dailySeries.filter((day) => day.kind === "actual");
  const estimatedDays = dailySeries.filter((day) => day.kind === "estimated");
  const modelDays = [...actualDays, ...estimatedDays].sort((a, b) => a.date.localeCompare(b.date));
  
  const forecastConfidence = computeConfidence(actualDays, estimatedDays);
  const patterns = learnPatterns(actualDays); // Train on actual DCRs only
  
  const liveTodayGeneration = computeLiveTodayGeneration(allReadings, dailyClosingRecords, now);
  const forecasts = buildForecasts(actualDays, patterns, forecastConfidence, now, capacityKW, liveTodayGeneration);
  const aggregates = aggregateSeries(actualDays); // Validated metrics only consume actual DCRs
  
  const dataQuality = buildDataQuality(allReadings, dailyClosingRecords, actualDays, estimatedDays, forecastConfidence);
  const dashboard = buildDashboard(modelDays, dailyClosingRecords, allReadings, forecasts, dataQuality, settings, now, patterns, capacityKW);

  return {
    readings: allReadings,
    dailyClosingRecords,
    dailySeries: [...modelDays, ...forecasts.sevenDay].sort((a, b) => a.date.localeCompare(b.date)),
    actualDailySeries: actualDays,
    estimatedDailySeries: estimatedDays,
    forecastSeries: forecasts.sevenDay,
    aggregates,
    patterns,
    forecasts,
    dataQuality,
    dashboard,
    capacityKW
  };
}

function buildDailySeries(closingRecords, allReadings) {
  if (closingRecords.length === 0) return [];
  const days = [];

  const firstDCR = closingRecords[0];
  const firstReading = allReadings[0];
  
  if (firstReading) {
    const startKey = toDateKey(firstReading.timestamp);
    const span = daysBetween(startKey, firstDCR.date);
    const delta = firstDCR.value - firstReading.virtualValue;
    
    if (span >= 0 && delta >= 0) {
      days.push({
        date: firstDCR.date,
        generation: round(delta),
        kind: "actual",
        source: "initial closing record",
        confidence: 1
      });
    }
  }

  for (let i = 1; i < closingRecords.length; i += 1) {
    const previous = closingRecords[i - 1];
    const current = closingRecords[i];
    const startKey = previous.date;
    const endKey = current.date;
    const span = daysBetween(startKey, endKey);
    const delta = current.value - previous.value;

    if (span <= 0 || delta < 0) continue;

    days.push({
      date: current.date,
      generation: round(delta),
      kind: "actual",
      source: "daily closing record",
      confidence: 1
    });
  }

  return days;
}

function learnPatterns(days) {
  // Forecast training must consume Daily Closing Records ONLY.
  if (days.length < 7) {
    return { averageDaily: 0, variability: 0, weekday: new Map(), monthly: new Map(), trend: { slope: 0, intercept: 0 } };
  }
  const actualOnly = days.filter((day) => day.kind === "actual" && day.generation >= 0);
  const avg = mean(actualOnly.map((day) => day.generation));
  const variability = stddev(actualOnly.map((day) => day.generation));
  const weekday = groupedAverage(actualOnly, (day) => fromDateKey(day.date).getDay());
  const monthly = groupedAverage(actualOnly, (day) => fromDateKey(day.date).getMonth() + 1);
  const trend = linearTrend(actualOnly.map((day, index) => ({ x: index, y: day.generation })));
  return { averageDaily: avg, variability, weekday, monthly, trend };
}

function buildForecasts(actualDays, patterns, baseConfidence, now, capacityKW, liveTodayGeneration = 0) {
  const dayCount = actualDays.length;
  const lastDate = actualDays.length ? actualDays[actualDays.length - 1].date : toDateKey(now);
  
  // Forecast Readiness States
  let state = "learning";
  if (dayCount >= 30) state = "ready";
  else if (dayCount >= 7) state = "limited";

  if (state === "learning") {
    return { 
      tomorrow: null, 
      sevenDay: [], 
      monthly: { days: 30, generation: 0, confidence: 0 }, 
      biMonthly: { days: 60, generation: 0, confidence: 0 }, 
      annual: { days: 365, generation: 0, confidence: 0 }, 
      confidence: 0,
      state
    };
  }

  const sevenDay = [];
  for (let i = 1; i <= 7; i += 1) {
    const date = addDays(lastDate, i);
    const d = fromDateKey(date);
    let predicted = predictDay(patterns, d, actualDays.length + i, capacityKW);
    
    if (date === toDateKey(now) && predicted < liveTodayGeneration) {
      console.warn(`Forecast continuity adjusted: baseline (${round(predicted)}) < actual (${round(liveTodayGeneration)}). Rebuilding forecast from reality.`);
      predicted = liveTodayGeneration;
    }

    sevenDay.push({
      date,
      generation: round(predicted),
      kind: "forecast",
      confidence: Math.max(0.05, round(baseConfidence * (1 - i * 0.035), 3)),
      source: "learned historical pattern"
    });
  }

  const tomorrow = sevenDay[0] || null;
  const monthly = forecastPeriod(actualDays, patterns, baseConfidence, 30, capacityKW);
  const biMonthly = forecastPeriod(actualDays, patterns, baseConfidence, 60, capacityKW);
  const annual = forecastPeriod(actualDays, patterns, baseConfidence, 365, capacityKW);

  return { tomorrow, sevenDay, monthly, biMonthly, annual, confidence: Math.round(baseConfidence * 100), state };
}

function forecastPeriod(days, patterns, confidence, count, capacityKW) {
  const start = days.length ? days[days.length - 1].date : toDateKey(new Date());
  let total = 0;
  for (let i = 1; i <= count; i += 1) {
    const date = fromDateKey(addDays(start, i));
    total += predictDay(patterns, date, days.length + i, capacityKW);
  }
  return { days: count, generation: round(total), confidence: Math.round(confidence * 100) };
}

function predictDay(patterns, date, index, capacityKW) {
  if (patterns.averageDaily === 0) return 0;
  const baseline = patterns.averageDaily || 0;
  const weekday = patterns.weekday.get(date.getDay()) ?? baseline;
  const month = patterns.monthly.get(date.getMonth() + 1) ?? baseline;
  const trend = (patterns.trend.slope || 0) * index + (patterns.trend.intercept || baseline);
  const blended = baseline * 0.45 + weekday * 0.2 + month * 0.25 + trend * 0.1;
  
  let prediction = Math.max(0, blended);
  
  if (capacityKW > 0) {
    const maxDaily = capacityKW * 8;
    prediction = Math.min(prediction, maxDaily);
  }

  return prediction;
}

function aggregateSeries(days) {
  // Validated metrics consume actual DCRs ONLY
  const actualOnly = days.filter(d => d.kind === "actual");
  return {
    weekly: aggregateByRolling(actualOnly, 7),
    monthly: aggregateBy(actualOnly, monthKey),
    biMonth: aggregateBy(actualOnly, biMonthKey),
    yearly: aggregateBy(actualOnly, yearKey),
    lifetime: round(sum(actualOnly.map((day) => day.generation)))
  };
}

function aggregateBy(days, keyFn) {
  const map = new Map();
  for (const day of days) {
    const key = keyFn(day.date);
    map.set(key, round((map.get(key) || 0) + day.generation));
  }
  return [...map.entries()].map(([period, generation]) => ({ period, generation }));
}

function aggregateByRolling(days, windowSize) {
  return days.map((day, index) => {
    const window = days.slice(Math.max(0, index - windowSize + 1), index + 1);
    return { date: day.date, generation: round(sum(window.map((item) => item.generation))) };
  });
}

function buildDataQuality(readings, dailyClosingRecords, actualDays, estimatedDays, forecastConfidence) {
  const missingDayCount = estimatedDays.length;
  const modeledDays = actualDays.length + estimatedDays.length;
  const completeness = modeledDays ? actualDays.length / modeledDays : 0;
  
  let reliability = "low";
  if (actualDays.length >= 30 && forecastConfidence >= 0.7) {
    reliability = "strong";
  } else if (actualDays.length >= 7 && forecastConfidence >= 0.35) {
    reliability = "developing";
  }

  return {
    rawObservationCount: readings.length,
    dailyClosingRecordCount: dailyClosingRecords.length,
    actualDayCount: actualDays.length,
    estimatedDayCount: estimatedDays.length,
    missingDayCount,
    completenessScore: Math.round(completeness * 100),
    forecastReliability: reliability,
    forecastConfidence: Math.round(forecastConfidence * 100)
  };
}

function computeLiveTodayGeneration(readings, dailyClosingRecords, now) {
  const today = toDateKey(now);
  const todayReadings = readings.filter(r => toDateKey(r.timestamp) === today);
  let liveTodayGeneration = 0;
  if (todayReadings.length > 0) {
    const firstOfToday = todayReadings[0];
    const lastOfToday = todayReadings[todayReadings.length - 1];
    liveTodayGeneration = lastOfToday.virtualValue - (firstOfToday.virtualValue - (firstOfToday.rawValue > 0 ? (firstOfToday.virtualValue - firstOfToday.rawValue) : 0));
    
    // Better calculation: find the last DCR before today
    const lastDCR = dailyClosingRecords.filter(dcr => dcr.date < today).pop();
    if (lastDCR) {
      // This is a bit complex due to epochs, but virtualValue is cumulative
      const lastReading = todayReadings[todayReadings.length - 1];
      liveTodayGeneration = Math.max(0, lastReading.virtualValue - lastDCR.value);
    }
  }
  return liveTodayGeneration;
}

function buildDashboard(days, dailyClosingRecords, readings, forecasts, dataQuality, settings, now, patterns, capacityKW) {
  const today = toDateKey(now);
  const todayPhase = getSolarPhase(now, now);
  const isDayClosed = todayPhase === SOLAR_PHASE.CLOSED || todayPhase === SOLAR_PHASE.POST;
  
  // LIVE METRICS
  const liveTodayGeneration = computeLiveTodayGeneration(readings, dailyClosingRecords, now);

  const last7 = days.filter(d => d.kind === "actual").slice(-7);
  const last30 = days.filter(d => d.kind === "actual").slice(-30);
  const actualDays = days.filter((day) => day.kind === "actual");
  const best = maxBy(actualDays, (day) => day.generation);
  const worst = minBy(actualDays, (day) => day.generation);
  const install = settings.installationDate ? fromDateKey(settings.installationDate) : null;
  const firstReading = readings[0] ? new Date(readings[0].timestamp) : null;
  const ageStart = install || firstReading;
  const ageDays = ageStart ? Math.max(0, Math.floor((now - ageStart) / DAY_MS)) : null;
  
  const expectedToday = forecasts.state !== "learning" ? predictDay(patterns, now, actualDays.length, capacityKW) : 0;

  // VALIDATED METRICS GATEKEEPING
  let performanceScore = 0;
  let performanceStatus = "Learning Phase";
  let lowGenerationDetected = false;

  if (isDayClosed && forecasts.state !== "learning" && actualDays.length >= 7) {
     const todayRecord = actualDays.find(d => d.date === today);
     const generation = todayRecord ? todayRecord.generation : liveTodayGeneration;
     
     if (expectedToday > 0) {
        const ratio = generation / expectedToday;
        performanceScore = Math.round(ratio * 100);
        
        if (performanceScore >= 90) performanceStatus = "Excellent";
        else if (performanceScore >= 70) performanceStatus = "Good";
        else if (performanceScore >= 50) performanceStatus = "Moderate";
        else if (performanceScore >= 30) performanceStatus = "Poor";
        else performanceStatus = "Critical";
        
        lowGenerationDetected = generation < (expectedToday * 0.4);
     }
  }

  return {
    todayGeneration: round(liveTodayGeneration),
    expectedTodayGeneration: round(expectedToday),
    weeklyAverage: round(mean(last7.map((day) => day.generation))),
    monthlyAverage: round(mean(last30.map((day) => day.generation))),
    bestProductionDay: best || null,
    worstProductionDay: worst || null,
    lifetimeProduction: round(sum(actualDays.map((day) => day.generation))),
    forecastConfidence: dataQuality.forecastConfidence,
    dataCompletenessScore: dataQuality.completenessScore,
    tomorrowPrediction: forecasts.tomorrow,
    monthlyForecast: forecasts.monthly,
    biMonthlyForecast: forecasts.biMonthly,
    annualForecast: forecasts.annual,
    systemAgeDays: ageDays,
    observedLifetimeGeneration: readings.length ? round(readings[readings.length - 1].virtualValue - readings[0].virtualValue) : 0,
    forecastState: forecasts.state,
    solarPerformance: {
      score: performanceScore,
      status: performanceStatus
    },
    lowGenerationDetected,
    isDayClosed,
    todayPhase
  };
}

function computeConfidence(actualDays, estimatedDays) {
  const countScore = Math.min(1, actualDays.length / 90);
  const spanScore = actualDays.length > 1 ? Math.min(1, daysBetween(actualDays[0].date, actualDays[actualDays.length - 1].date) / 365) : 0;
  const completeness = actualDays.length + estimatedDays.length ? actualDays.length / (actualDays.length + estimatedDays.length) : 0;
  
  if (actualDays.length < 7) return 0;
  
  const confidence = countScore * 0.45 + spanScore * 0.35 + completeness * 0.2;
  return Math.max(0, Math.min(0.95, confidence));
}

function groupedAverage(items, keyFn) {
  const buckets = new Map();
  for (const item of items) {
    const key = keyFn(item);
    const bucket = buckets.get(key) || [];
    bucket.push(item.generation);
    buckets.set(key, bucket);
  }
  return new Map([...buckets.entries()].map(([key, values]) => [key, mean(values)]));
}

function linearTrend(points) {
  if (points.length < 2) return { slope: 0, intercept: points[0]?.y || 0 };
  const xMean = mean(points.map((point) => point.x));
  const yMean = mean(points.map((point) => point.y));
  const numerator = sum(points.map((point) => (point.x - xMean) * (point.y - yMean)));
  const denominator = sum(points.map((point) => (point.x - xMean) ** 2));
  const slope = denominator ? numerator / denominator : 0;
  return { slope, intercept: yMean - slope * xMean };
}

function mean(values) {
  const clean = values.filter((value) => Number.isFinite(value));
  return clean.length ? sum(clean) / clean.length : 0;
}

function stddev(values) {
  const avg = mean(values);
  return Math.sqrt(mean(values.map((value) => (value - avg) ** 2)));
}

function sum(values) {
  return values.reduce((total, value) => total + value, 0);
}

function maxBy(items, fn) {
  return items.reduce((best, item) => (!best || fn(item) > fn(best) ? item : best), null);
}

function minBy(items, fn) {
  return items.reduce((best, item) => (!best || fn(item) < fn(best) ? item : best), null);
}

function round(value, places = 2) {
  const factor = 10 ** places;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

