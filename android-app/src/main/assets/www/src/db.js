const DB_NAME = "solar-prophecy";
const DB_VERSION = 1;
const READING_STORE = "readings";
const SETTINGS_STORE = "settings";

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
    updatedAt: new Date().toISOString()
  };
  
  const tx = db.transaction(READING_STORE, "readwrite");
  const store = tx.objectStore(READING_STORE);
  await txRequest(store.put(record));
  return record;
}

export async function deleteReading(db, id) {
  await txRequest(db.transaction(READING_STORE, "readwrite").objectStore(READING_STORE).delete(id));
}

export async function getSettings(db) {
  const records = await txRequest(db.transaction(SETTINGS_STORE).objectStore(SETTINGS_STORE).getAll());
  return Object.fromEntries(records.map((record) => [record.key, record.value]));
}

export async function saveSettings(db, settings) {
  const store = db.transaction(SETTINGS_STORE, "readwrite").objectStore(SETTINGS_STORE);
  await Promise.all(Object.entries(settings).map(([key, value]) => txRequest(store.put({ key, value }))));
}

export async function exportBackup(db) {
  return {
    schema: "solar-prophecy.backup.v1",
    exportedAt: new Date().toISOString(),
    readings: await getReadings(db),
    settings: await getSettings(db)
  };
}

export async function importBackup(db, backup) {
  if (!backup || backup.schema !== "solar-prophecy.backup.v1" || !Array.isArray(backup.readings)) {
    throw new Error("Unsupported backup file.");
  }

  const readTx = db.transaction(READING_STORE, "readwrite");
  const readStore = readTx.objectStore(READING_STORE);
  await txRequest(readStore.clear());
  for (const reading of backup.readings) {
    await txRequest(db.transaction(READING_STORE, "readwrite").objectStore(READING_STORE).put(reading));
  }

  if (backup.settings && typeof backup.settings === "object") {
    await saveSettings(db, backup.settings);
  }
}

function txRequest(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
