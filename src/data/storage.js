import { SK } from "../constants/config.js";
import { createEmptyCanonicalData, enrichData, normalizeData, serializeData } from "./migrate.js";

const DEFAULT_DATA = enrichData(createEmptyCanonicalData());

export async function load() {
  try {
    const res = await fetch("/api/data");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json?.value) {
      const normalized = normalizeData(json.value);
      if (normalized._needsMigrationWrite) await save(normalized);
      return normalized;
    }
  } catch (e) {
    try {
      const raw = window.localStorage.getItem(SK);
      if (raw) {
        const normalized = normalizeData(JSON.parse(raw));
        if (normalized._needsMigrationWrite) await save(normalized);
        return normalized;
      }
    } catch (_) {}
  }
  return DEFAULT_DATA;
}

export async function save(d) {
  const serialized = serializeData(d);
  try {
    const res = await fetch("/api/data", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(serialized),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } catch (e) {
    try { window.localStorage.setItem(SK, JSON.stringify(serialized)); } catch (_) {}
  }
}

/* Debounced save: collapses rapid calls into one, always saves the latest data */
let _saveTimer = null;
let _latestData = null;

export function debouncedSave(d, delay = 600) {
  _latestData = d;
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => {
    _saveTimer = null;
    if (_latestData) save(_latestData);
    _latestData = null;
  }, delay);
}

export { DEFAULT_DATA, normalizeData };
