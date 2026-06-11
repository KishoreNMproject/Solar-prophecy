import assert from "node:assert/strict";
import { buildSolarModel } from "../web/src/analytics.js";

const resetReadings = [
  { id: "1", value: 2100.00, timestamp: "2026-06-01T21:00:00", epoch: 0 }, // Day 1 closing
  { id: "2", value: 2103.85, timestamp: "2026-06-02T08:00:00", epoch: 0 }, // Day 2 morning
  { id: "3", value: 2104.00, timestamp: "2026-06-02T10:00:00", epoch: 0 }, // Day 2 before reset
  { id: "4", value: 0.00,    timestamp: "2026-06-02T11:09:00", epoch: 1 }, // Day 2 reset
  { id: "5", value: 0.08,    timestamp: "2026-06-02T11:22:00", epoch: 1 }, // Day 2 after reset
  { id: "6", value: 1.00,    timestamp: "2026-06-02T21:00:00", epoch: 1 }  // Day 2 closing (Post-Sunset)
];

// Testing the fix for the meter reset bug using epochs.
const model = buildSolarModel(resetReadings, {}, new Date("2026-06-02T22:00:00"));

const day2 = model.actualDailySeries.find(d => d.date === "2026-06-02");

// Expected generation: (2104 - 2100) + (1.00 - 0.00) = 4 + 1 = 5.00
assert.equal(day2?.generation, 5.00);
console.log("Reset bug test passed!");
