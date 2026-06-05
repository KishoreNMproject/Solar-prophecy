import assert from "node:assert/strict";
import { buildSolarModel } from "../web/src/analytics.js";

const readings = [
  { id: "1", value: 1000, timestamp: "2026-06-01T08:00:00.000Z" },
  { id: "2", value: 1020, timestamp: "2026-06-05T08:00:00.000Z" },
  { id: "3", value: 1028, timestamp: "2026-06-06T08:00:00.000Z" }
];

const model = buildSolarModel(readings, { installationDate: "2026-01-01" }, new Date("2026-06-06T12:00:00.000Z"));

assert.equal(model.readings.length, 3);
assert.equal(model.estimatedDailySeries.length, 3);
assert.equal(model.actualDailySeries.length, 2);
assert.equal(model.dataQuality.missingDayCount, 3);
assert.equal(model.actualDailySeries.find((day) => day.date === "2026-06-05").generation, 5);
assert.equal(model.actualDailySeries.find((day) => day.date === "2026-06-06").generation, 8);
assert.equal(model.estimatedDailySeries.some((day) => day.date === "2026-06-02"), true);
assert.equal(model.forecastSeries.length, 7);
assert.ok(model.forecasts.tomorrow.generation >= 0);
assert.ok(model.dataQuality.forecastConfidence < 50);
assert.ok(model.dashboard.remainingExpectedGeneration > 0);

const corrected = buildSolarModel(
  [
    readings[0],
    { id: "x", value: 1006, timestamp: "2026-06-02T08:00:00.000Z" },
    readings[1],
    readings[2]
  ],
  {},
  new Date("2026-06-06T12:00:00.000Z")
);

assert.equal(corrected.estimatedDailySeries.some((day) => day.date === "2026-06-02"), false);
assert.equal(corrected.actualDailySeries.some((day) => day.date === "2026-06-02"), true);

console.log("analytics tests passed");
