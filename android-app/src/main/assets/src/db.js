const DB_NAME = "solar-prophecy";
const DB_VERSION = 2;
const READING_STORE = "readings";
const SETTINGS_STORE = "settings";
const VALIDATIONS_STORE = "validations";

function markLocalModified() {
  localStorage.setItem("localLastModified", Date.now().toString());
}

export async function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(READING_STORE)) {
        const readings = db.createObjectStore(READING_STORE, { keyPath: "id" });
        readings.createIndex("timestamp", "timestamp", { unique: false });
      }
      if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
        db.createObjectStore(SETTINGS_STORE, { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains(VALIDATIONS_STORE)) {
        db.createObjectStore(VALIDATIONS_STORE, { keyPath: "date" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getReadings(db) {
  return txRequest(db.transaction(READING_STORE).objectStore(READING_STORE).getAll());
}

export async function saveReading(db, reading) {
  const id = reading.id || (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36));
  
  // Ensure we handle potential invalid date strings from the UI
  let date;
  if (!reading.timestamp) {
    date = new Date();
  } else {
    date = new Date(reading.timestamp);
    // If the date is invalid (e.g. from a partial string), fallback to now
    if (isNaN(date.getTime())) {
      date = new Date();
    }
  }

  const record = {
    id,
    value: Number(reading.value) || 0,
    timestamp: date.toISOString(),
    epoch: Number(reading.epoch) || 0,
    updatedAt: new Date().toISOString()
  };
  
  const tx = db.transaction(READING_STORE, "readwrite");
  const store = tx.objectStore(READING_STORE);
  await txRequest(store.put(record));
  markLocalModified();
  return record;
}

export async function deleteReading(db, id) {
  await txRequest(db.transaction(READING_STORE, "readwrite").objectStore(READING_STORE).delete(id));
  markLocalModified();
}

export async function getSettings(db) {
  const records = await txRequest(db.transaction(SETTINGS_STORE).objectStore(SETTINGS_STORE).getAll());
  return Object.fromEntries(records.map((record) => [record.key, record.value]));
}

export async function saveSettings(db, settings) {
  const store = db.transaction(SETTINGS_STORE, "readwrite").objectStore(SETTINGS_STORE);
  await Promise.all(Object.entries(settings).map(([key, value]) => txRequest(store.put({ key, value }))));
  markLocalModified();
}

export async function getValidations(db) {
  if (!db.objectStoreNames.contains(VALIDATIONS_STORE)) return {};
  const records = await txRequest(db.transaction(VALIDATIONS_STORE).objectStore(VALIDATIONS_STORE).getAll());
  return Object.fromEntries(records.map((record) => [record.date, record]));
}

export async function saveValidation(db, record) {
  if (!db.objectStoreNames.contains(VALIDATIONS_STORE)) return;
  const store = db.transaction(VALIDATIONS_STORE, "readwrite").objectStore(VALIDATIONS_STORE);
  await txRequest(store.put(record));
  markLocalModified();
}

export async function exportBackup(db) {
  return {
    schema: "solar-prophecy.backup.v2",
    exportedAt: new Date().toISOString(),
    readings: await getReadings(db),
    settings: await getSettings(db),
    validations: Object.values(await getValidations(db))
  };
}

export async function importBackup(db, backup) {
  if (!backup || !backup.schema || !backup.schema.startsWith("solar-prophecy.backup.v") || !Array.isArray(backup.readings)) {
    throw new Error("Unsupported or invalid backup file.");
  }

  // Clear existing readings and settings to ensure a clean restore state
  const readTx = db.transaction(READING_STORE, "readwrite");
  const readStore = readTx.objectStore(READING_STORE);
  await txRequest(readStore.clear());
  
  // Validate and insert readings
  let lastValue = -1;
  let currentEpoch = 0;
  const sortedReadings = [...backup.readings].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  for (const reading of sortedReadings) {
    if (!reading.timestamp || typeof reading.value !== "number") continue;
    
    // Infer epoch if missing
    if (reading.epoch === undefined) {
      if (lastValue !== -1 && reading.value < lastValue) {
        currentEpoch++;
      }
      reading.epoch = currentEpoch;
    } else {
      currentEpoch = reading.epoch;
    }
    lastValue = reading.value;

    // Ensure the reading has an ID
    if (!reading.id) {
      reading.id = (typeof crypto !== "undefined" && crypto.randomUUID) 
        ? crypto.randomUUID() 
        : Math.random().toString(36).slice(2) + Date.now().toString(36);
    }
    
    readStore.put(reading);
  }

  // Wait for all readings to be committed
  await new Promise((resolve, reject) => {
    readTx.oncomplete = resolve;
    readTx.onerror = () => reject(readTx.error);
  });

  if (backup.settings && typeof backup.settings === "object") {
    // Clear settings before saving new ones
    const settingsTx = db.transaction(SETTINGS_STORE, "readwrite");
    await txRequest(settingsTx.objectStore(SETTINGS_STORE).clear());
    await saveSettings(db, backup.settings);
  }

  if (backup.validations && Array.isArray(backup.validations) && db.objectStoreNames.contains(VALIDATIONS_STORE)) {
    const valTx = db.transaction(VALIDATIONS_STORE, "readwrite");
    const valStore = valTx.objectStore(VALIDATIONS_STORE);
    await txRequest(valStore.clear());
    for (const val of backup.validations) {
      if (val.date) {
        valStore.put(val);
      }
    }
  }
}

function txRequest(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function mergeBackup(db, cloudBackup) {
  if (!cloudBackup || !Array.isArray(cloudBackup.readings)) throw new Error("Invalid backup format for merge");

  const localReadings = await getReadings(db);
  const readingMap = new Map();

  // Load cloud readings first
  for (const r of cloudBackup.readings) {
    if (!r.id) continue;
    readingMap.set(r.id, r);
  }

  // Override with local readings if they are newer
  for (const r of localReadings) {
    if (!r.id) continue;
    const existing = readingMap.get(r.id);
    if (!existing) {
      readingMap.set(r.id, r);
    } else {
      const localTime = new Date(r.updatedAt || r.timestamp).getTime();
      const cloudTime = new Date(existing.updatedAt || existing.timestamp).getTime();
      if (localTime >= cloudTime) {
        readingMap.set(r.id, r);
      }
    }
  }

  const mergedReadings = Array.from(readingMap.values());
  const localSettings = await getSettings(db);
  const cloudSettings = cloudBackup.settings || {};
  
  // For settings, we merge keys. Local wins if conflict, unless we have a specific per-key timestamp (which we don't).
  // Since we do eco-friendly sync, if both changed, local wins on conflict.
  const mergedSettings = { ...cloudSettings, ...localSettings };

  const mergedValidationsMap = new Map();
  if (cloudBackup.validations) {
    for (const v of cloudBackup.validations) {
      if (v.date) mergedValidationsMap.set(v.date, v);
    }
  }
  const localValidations = await getValidations(db);
  for (const date in localValidations) {
    mergedValidationsMap.set(date, localValidations[date]); // local wins
  }
  const mergedValidations = Array.from(mergedValidationsMap.values());

  const mergedBackup = {
    schema: "solar-prophecy.backup.v2",
    exportedAt: new Date().toISOString(),
    readings: mergedReadings,
    settings: mergedSettings,
    validations: mergedValidations
  };

  await importBackup(db, mergedBackup);
}

export async function getSyncMetadata(db) {
  const settings = await getSettings(db);
  return {
    onboardingCompleted: settings.sync_onboardingCompleted === true || settings.sync_onboardingCompleted === "true",
    onboardingChoice: settings.sync_onboardingChoice || null
  };
}

export async function saveSyncMetadata(db, meta) {
  const settings = await getSettings(db);
  if (meta.onboardingCompleted !== undefined) settings.sync_onboardingCompleted = meta.onboardingCompleted;
  if (meta.onboardingChoice !== undefined) settings.sync_onboardingChoice = meta.onboardingChoice;
  await saveSettings(db, settings);
}
