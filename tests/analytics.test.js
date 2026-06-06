import assert from "node:assert/strict";
import { buildSolarModel } from "../web/src/analytics.js";

const readings = [
  { id: "1", value: 1000, timestamp: "2026-06-01T08:00:00.000Z" },
  { id: "2", value: 1020, timestamp: "2026-06-05T08:00:00.000Z" },
  { id: "3", value: 1028, timestamp: "2026-06-06T08:00:00.000Z" }
];

const model = buildSolarModel(readings, { installationDate: "2026" }, new Date("2026-06-06T12:00:00.000Z"));

assert.equal(model.readings.length, 3);
assert.equal(model.dailyClosingRecords.length, 3);
assert.equal(model.estimatedDailySeries.length, 3);
assert.equal(model.actualDailySeries.length, 2);
assert.equal(model.dataQuality.missingDayCount, 3);
assert.equal(model.actualDailySeries.find((day) => day.date === "2026-06-05").generation, 5);
assert.equal(model.actualDailySeries.find((day) => day.date === "2026-06-06").generation, 8);

// Learning Mode Gatekeeping
assert.equal(model.forecasts.state, "learning");
assert.equal(model.forecasts.tomorrow, null);
assert.equal(model.forecasts.sevenDay.length, 0);

const intradayReadings = [
  { id: "1", value: 1000, timestamp: "2026-06-01T08:00:00.000Z" },
  { id: "2a", value: 1010, timestamp: "2026-06-05T08:00:00.000Z" },
  { id: "2b", value: 1020, timestamp: "2026-06-05T12:00:00.000Z" }, // Latest for June 5
  { id: "3", value: 1028, timestamp: "2026-06-06T08:00:00.000Z" }
];

const intradayModel = buildSolarModel(intradayReadings, {}, new Date("2026-06-06T12:00:00.000Z"));
assert.equal(intradayModel.dailyClosingRecords.length, 3);
assert.equal(intradayModel.dailyClosingRecords.find(r => r.date === "2026-06-05").value, 1020);
assert.equal(intradayModel.actualDailySeries.find(d => d.date === "2026-06-05").generation, 5); // (1020-1000)/4

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
