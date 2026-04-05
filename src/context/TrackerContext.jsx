import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { getToday } from "../utils/date.js";
import { load, save, debouncedSave, DEFAULT_DATA, normalizeData } from "../data/storage.js";
import { getProjectTypes, exportTrackerData } from "../data/operations.js";

const TrackerContext = createContext(null);

export function TrackerProvider({ children }) {
  const [data, setData] = useState(DEFAULT_DATA);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("today");
  const [expanded, setExpanded] = useState(null);
  const [systemDate, setSystemDate] = useState(getToday());
  const [selectedDate, setSelectedDate] = useState(getToday());

  useEffect(() => {
    load().then((d) => {
      setData(d);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    const syncToday = () => {
      const next = getToday();
      setSystemDate((prevSystemDate) => {
        if (prevSystemDate !== next) {
          setSelectedDate((prevSelectedDate) => prevSelectedDate === prevSystemDate ? next : prevSelectedDate);
        }
        return next;
      });
    };
    syncToday();
    const timer = window.setInterval(syncToday, 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  const isTypeView = view.startsWith("type:");
  const currentTypeId = isTypeView ? view.slice(5) : null;
  const activeProjectTypes = useMemo(() => getProjectTypes(data), [data]);

  useEffect(() => {
    if (isTypeView && currentTypeId && !activeProjectTypes.some((type) => type.id === currentTypeId)) {
      setView("today");
    }
  }, [activeProjectTypes, currentTypeId, isTypeView]);

  const up = useCallback((nd) => {
    const normalized = normalizeData(nd);
    setData(normalized);
    debouncedSave(normalized);
  }, []);

  const onExport = useCallback(() => {
    exportTrackerData(data);
  }, [data]);

  const onImport = useCallback((rawData) => {
    try {
      const normalized = normalizeData(rawData);
      setData(normalized);
      save(normalized);
    } catch (e) {
      console.error("Import failed:", e);
    }
  }, []);

  const value = {
    data,
    up,
    loading,
    view,
    setView,
    expanded,
    setExpanded,
    systemDate,
    selectedDate,
    setSelectedDate,
    activeProjectTypes,
    onExport,
    onImport,
  };

  return (
    <TrackerContext.Provider value={value}>
      {children}
    </TrackerContext.Provider>
  );
}

export function useTracker() {
  const ctx = useContext(TrackerContext);
  if (!ctx) throw new Error("useTracker must be used within TrackerProvider");
  return ctx;
}
