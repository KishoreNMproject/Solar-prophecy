const DAY_MS = 86_400_000;

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

export function normalizeReadings(readings) {
  return readings
    .map((reading) => ({
      id: reading.id,
      timestamp: new Date(reading.timestamp).toISOString(),
      value: Number(reading.value)
    }))
    .filter((reading) => Number.isFinite(reading.value) && reading.value >= 0)
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

export function getDailyClosingRecords(readings) {
  const normalized = normalizeReadings(readings);
  const byDate = new Map();
  
  for (const reading of normalized) {
    const date = toDateKey(reading.timestamp);
    // Always take the latest reading for the day
    byDate.set(date, reading);
  }
  
  return [...byDate.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, reading]) => ({
      date,
      value: reading.value,
      readingId: reading.id,
      timestamp: reading.timestamp
    }));
}

export function buildSolarModel(readings, settings = {}, now = new Date()) {
  const actualReadings = normalizeReadings(readings);
  const dailyClosingRecords = getDailyClosingRecords(readings);
  const dailySeries = buildDailySeries(dailyClosingRecords);
  
  // Capacity parsing
  const capacityValue = Number(settings.solarCapacity) || 0;
  const capacityUnit = settings.solarCapacityUnit || "kW";
  const capacityKW = capacityUnit === "W" ? capacityValue / 1000 : capacityValue;

  const modelDays = dailySeries.filter((day) => day.generation > 0 || day.kind !== "empty");
  const actualDays = dailySeries.filter((day) => day.kind === "actual");
  const estimatedDays = dailySeries.filter((day) => day.kind === "estimated");
  
  const forecastConfidence = computeConfidence(actualDays, estimatedDays);
  const patterns = learnPatterns(modelDays);
  const forecasts = buildForecasts(actualDays, patterns, forecastConfidence, now, capacityKW);
  const aggregates = aggregateSeries(modelDays);
  const dataQuality = buildDataQuality(actualReadings, dailyClosingRecords, actualDays, estimatedDays, forecastConfidence);
  const dashboard = buildDashboard(modelDays, actualReadings, forecasts, dataQuality, settings, now, patterns, capacityKW);

  return {
    readings: actualReadings,
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

function buildDailySeries(closingRecords) {
  if (closingRecords.length < 2) return [];
  const days = [];

  for (let i = 1; i < closingRecords.length; i += 1) {
    const previous = closingRecords[i - 1];
    const current = closingRecords[i];
    const startKey = previous.date;
    const endKey = current.date;
    const span = daysBetween(startKey, endKey);
    const delta = current.value - previous.value;

    if (span <= 0 || delta < 0) continue;

    const perDay = delta / span;
    for (let offset = 1; offset <= span; offset += 1) {
      const date = addDays(startKey, offset);
      days.push({
        date,
        generation: round(perDay),
        kind: offset === span ? "actual" : "estimated",
        source: offset === span ? "daily closing record" : "gap interpolation",
        confidence: offset === span ? 1 : 0.45
      });
    }
  }

  return days;
}

function learnPatterns(days) {
  if (days.length < 7) {
    return { averageDaily: 0, variability: 0, weekday: new Map(), monthly: new Map(), trend: { slope: 0, intercept: 0 } };
  }
  const actualish = days.filter((day) => day.generation >= 0);
  const avg = mean(actualish.map((day) => day.generation));
  const variability = stddev(actualish.map((day) => day.generation));
  const weekday = groupedAverage(actualish, (day) => fromDateKey(day.date).getDay());
  const monthly = groupedAverage(actualish, (day) => fromDateKey(day.date).getMonth() + 1);
  const trend = linearTrend(actualish.map((day, index) => ({ x: index, y: day.generation })));
  return { averageDaily: avg, variability, weekday, monthly, trend };
}

function buildForecasts(actualDays, patterns, baseConfidence, now, capacityKW) {
  const dayCount = actualDays.length;
  const lastDate = actualDays.length ? actualDays[actualDays.length - 1].date : toDateKey(now);
  
  if (dayCount < 7) {
    return { 
      tomorrow: null, 
      sevenDay: [], 
      monthly: { days: 30, generation: 0, confidence: 0 }, 
      biMonthly: { days: 60, generation: 0, confidence: 0 }, 
      annual: { days: 365, generation: 0, confidence: 0 }, 
      confidence: 0,
      state: "learning"
    };
  }

  const sevenDay = [];
  for (let i = 1; i <= 7; i += 1) {
    const date = addDays(lastDate, i);
    const d = fromDateKey(date);
    const predicted = predictDay(patterns, d, actualDays.length + i, capacityKW);
    sevenDay.push({
      date,
      generation: round(predicted),
      kind: "forecast",
      confidence: Math.max(0.05, round(baseConfidence * (1 - i * 0.035), 3)),
      source: "learned historical pattern"
    });
  }

  const state = dayCount < 30 ? "limited" : "normal";
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
  
  // Capacity constraint: A system shouldn't exceed its theoretical max output significantly.
  // 8kWh per kW of capacity is a very generous daily ceiling.
  if (capacityKW > 0) {
    const maxDaily = capacityKW * 8;
    prediction = Math.min(prediction, maxDaily);
  }

  return prediction;
}

function aggregateSeries(days) {
  return {
    weekly: aggregateByRolling(days, 7),
    monthly: aggregateBy(days, monthKey),
    biMonthly: aggregateBy(days, biMonthKey),
    yearly: aggregateBy(days, yearKey),
    lifetime: round(sum(days.map((day) => day.generation)))
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

function buildDashboard(days, readings, forecasts, dataQuality, settings, now, patterns, capacityKW) {
  const today = toDateKey(now);
  const todayGeneration = days.find((day) => day.date === today)?.generation || 0;
  const last7 = days.slice(-7);
  const last30 = days.slice(-30);
  const actualDays = days.filter((day) => day.kind === "actual");
  const best = maxBy(actualDays, (day) => day.generation);
  const worst = minBy(actualDays, (day) => day.generation);
  const install = settings.installationDate ? fromDateKey(settings.installationDate) : null;
  const firstReading = readings[0] ? new Date(readings[0].timestamp) : null;
  const ageStart = install || firstReading;
  const ageDays = ageStart ? Math.max(0, Math.floor((now - ageStart) / DAY_MS)) : null;
  
  const averageDaily = actualDays.length >= 7 ? mean(actualDays.map((day) => day.generation)) : 0;
  const expectedToday = forecasts.state !== "learning" ? predictDay(patterns, now, actualDays.length, capacityKW) : 0;

  // Performance Score calculation
  let performanceScore = 100;
  let performanceStatus = "Excellent";
  
  if (expectedToday > 0) {
    const ratio = todayGeneration / expectedToday;
    performanceScore = Math.round(ratio * 100);
    
    if (performanceScore >= 90) performanceStatus = "Excellent";
    else if (performanceScore >= 70) performanceStatus = "Good";
    else if (performanceScore >= 50) performanceStatus = "Moderate";
    else if (performanceScore >= 30) performanceStatus = "Poor";
    else performanceStatus = "Critical";
  } else if (todayGeneration > 0 && capacityKW > 0) {
    // If no expectation yet, compare with capacity potential (roughly)
    const ratio = todayGeneration / (capacityKW * 5); // 5 is a typical good day factor
    performanceScore = Math.min(100, Math.round(ratio * 100));
    
    if (performanceScore >= 90) performanceStatus = "Excellent";
    else if (performanceScore >= 70) performanceStatus = "Good";
    else if (performanceScore >= 50) performanceStatus = "Moderate";
    else if (performanceScore >= 30) performanceStatus = "Poor";
    else performanceStatus = "Critical";
  }

  const lowGenerationDetected = forecasts.state !== "learning" && 
                                expectedToday > 0 && 
                                todayGeneration < (expectedToday * 0.4) && 
                                actualDays.length >= 7;

  return {
    todayGeneration: round(todayGeneration),
    expectedTodayGeneration: round(expectedToday),
    weeklyAverage: round(mean(last7.map((day) => day.generation))),
    monthlyAverage: round(mean(last30.map((day) => day.generation))),
    bestProductionDay: best || null,
    worstProductionDay: worst || null,
    lifetimeProduction: round(sum(days.map((day) => day.generation))),
    forecastConfidence: dataQuality.forecastConfidence,
    dataCompletenessScore: dataQuality.completenessScore,
    tomorrowPrediction: forecasts.tomorrow,
    monthlyForecast: forecasts.monthly,
    biMonthlyForecast: forecasts.biMonthly,
    annualForecast: forecasts.annual,
    systemAgeDays: ageDays,
    observedLifetimeGeneration: readings.length ? round(readings[readings.length - 1].value - readings[0].value) : 0,
    forecastState: forecasts.state,
    solarPerformance: {
      score: performanceScore,
      status: performanceStatus
    },
    lowGenerationDetected
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
