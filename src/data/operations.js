import { UI } from "../constants/ui.js";
import { PIPELINES, LOGS, ROUTINE_LOG_KEYS } from "../constants/defaults.js";
import { SCHEMA_VERSION } from "../constants/config.js";
import { uid } from "../utils/id.js";
import { getToday, fmtDate } from "../utils/date.js";
import {
  normalizeLogs,
  normalizeRoutines,
  normalizeRoutineChecks,
  normalizeEntryNotes,
  getStageId,
  getStageName,
  getVisibleProjectEntries,
  collapseEntryItems,
  withSequentialRoutineOrder,
  withSequentialTypeOrder,
  getStageEntryText,
  toTimestamp,
  normalizeDateString,
} from "../utils/normalize.js";
import { serializeData } from "./migrate.js";

/* ──── HELPERS ──── */
export function getLogStore(data) {
  return normalizeLogs(data?.legacy?.logs || data?.logs || {});
}

export function getDailyNote(data, date) {
  return {
    reflection: "",
    summary: "",
    ...(data?.dailyNotes?.[date] || {}),
  };
}

/* ──── ROUTINE OPERATIONS ──── */
export function createRoutineDraft(routine = null) {
  return {
    name: routine?.name || "",
    icon: routine?.icon || "🌿",
    color: routine?.color || UI.sage,
    prompt: routine?.prompt || "今天做了什么？",
    active: routine?.active !== false,
  };
}

export function normalizeRoutineDraft(draft, baseRoutine = null, order = 1) {
  return {
    id: baseRoutine?.id || `routine_${uid()}`,
    name: (draft?.name || "").trim() || baseRoutine?.name || "新的 routine",
    icon: (draft?.icon || "").trim() || baseRoutine?.icon || "🌿",
    color: draft?.color || baseRoutine?.color || UI.sage,
    prompt: (draft?.prompt || "").trim() || baseRoutine?.prompt || "今天做了什么？",
    active: draft?.active !== false,
    order,
  };
}

export function getRoutineStatuses(data, date, options = {}) {
  const includeInactive = options.includeInactive === true;
  const routines = normalizeRoutines(data?.routines || [])
    .slice()
    .sort((a, b) => (a.order || 0) - (b.order || 0));
  const checksForDate = normalizeRoutineChecks(data?.routineChecks || []).filter((check) => check.date === date);
  const routineIds = new Set(routines.map((routine) => routine.id));
  const checkByRoutineId = new Map(
    checksForDate
      .filter((check) => check.routineId)
      .map((check) => [check.routineId, check]),
  );

  const statuses = routines
    .filter((routine) => includeInactive || routine.active !== false)
    .map((routine) => {
      const check = checkByRoutineId.get(routine.id);
      return {
        ...routine,
        done: !!check?.done,
        checkId: check?.id || "",
        snapshotName: check?.routineName || routine.name,
        items: (check?.items || []).slice(),
        missing: false,
      };
    });

  if (includeInactive) {
    checksForDate.forEach((check) => {
      if (!check.done || routineIds.has(check.routineId)) return;
      statuses.push({
        id: `orphan_${check.id}`,
        routineId: check.routineId,
        name: check.routineName || "已删除的 routine",
        snapshotName: check.routineName || "已删除的 routine",
        active: false,
        order: Number.MAX_SAFE_INTEGER,
        done: true,
        checkId: check.id,
        items: (check.items || []).slice(),
        icon: "🕊️",
        color: UI.inkFaint,
        prompt: "今天做了什么？",
        missing: true,
      });
    });
  }

  return statuses;
}

export function addRoutine(data, draft) {
  const normalizedRoutine = normalizeRoutineDraft(draft, null, (data?.routines || []).length + 1);
  return {
    ...data,
    routines: withSequentialRoutineOrder([
      ...(data?.routines || []),
      normalizedRoutine,
    ]),
  };
}

export function toggleRoutineDone(data, routineId, date) {
  const routine = normalizeRoutines(data?.routines || []).find((item) => item.id === routineId);
  if (!routine) return data;

  const checks = [...normalizeRoutineChecks(data?.routineChecks || [])];
  const existingIndex = checks.findIndex((check) => check.routineId === routineId && check.date === date);

  if (existingIndex === -1) {
    checks.push({
      id: `routine_check_${uid()}`,
      date,
      routineId: routine.id,
      routineName: routine.name,
      done: true,
      items: [],
    });
  } else {
    const existing = checks[existingIndex];
    const nextDone = !existing.done;
    const nextCheck = {
      ...existing,
      done: nextDone,
      routineName: nextDone ? routine.name : (existing.routineName || routine.name),
      items: existing.items || [],
    };
    if (!nextDone && (!nextCheck.items || nextCheck.items.length === 0)) {
      checks.splice(existingIndex, 1);
    } else {
      checks[existingIndex] = nextCheck;
    }
  }

  return {
    ...data,
    routineChecks: normalizeRoutineChecks(checks),
  };
}

export function addRoutineItem(data, routineId, date, text) {
  const routine = normalizeRoutines(data?.routines || []).find((item) => item.id === routineId);
  const nextText = typeof text === "string" ? text.trim() : "";
  if (!routine || !nextText) return data;

  const checks = [...normalizeRoutineChecks(data?.routineChecks || [])];
  const existingIndex = checks.findIndex((check) => check.routineId === routineId && check.date === date);
  const item = {
    id: `routine_item_${uid()}`,
    text: nextText,
    createdAt: new Date().toISOString(),
  };

  if (existingIndex === -1) {
    checks.push({
      id: `routine_check_${uid()}`,
      date,
      routineId: routine.id,
      routineName: routine.name,
      done: false,
      items: [item],
    });
  } else {
    const existing = checks[existingIndex];
    checks[existingIndex] = {
      ...existing,
      routineName: routine.name,
      items: [...(existing.items || []), item],
    };
  }

  return {
    ...data,
    routineChecks: normalizeRoutineChecks(checks),
  };
}

export function updateRoutineItem(data, routineId, date, itemId, text) {
  const nextText = typeof text === "string" ? text.trim() : "";
  if (!nextText) return data;
  const checks = [...normalizeRoutineChecks(data?.routineChecks || [])];
  const existingIndex = checks.findIndex((check) => check.routineId === routineId && check.date === date);
  if (existingIndex === -1) return data;

  const existing = checks[existingIndex];
  checks[existingIndex] = {
    ...existing,
    items: (existing.items || []).map((item) => (
      item.id === itemId ? { ...item, text: nextText } : item
    )),
  };

  return {
    ...data,
    routineChecks: normalizeRoutineChecks(checks),
  };
}

export function removeRoutineItem(data, routineId, date, itemId) {
  const checks = [...normalizeRoutineChecks(data?.routineChecks || [])];
  const existingIndex = checks.findIndex((check) => check.routineId === routineId && check.date === date);
  if (existingIndex === -1) return data;

  const existing = checks[existingIndex];
  const items = (existing.items || []).filter((item) => item.id !== itemId);
  if (!existing.done && items.length === 0) {
    checks.splice(existingIndex, 1);
  } else {
    checks[existingIndex] = {
      ...existing,
      items,
    };
  }

  return {
    ...data,
    routineChecks: normalizeRoutineChecks(checks),
  };
}

export function toggleRoutineActive(data, routineId, active) {
  return {
    ...data,
    routines: withSequentialRoutineOrder(
      (data?.routines || []).map((routine) => (
        routine.id === routineId ? { ...routine, active } : routine
      )),
    ),
  };
}

export function saveRoutine(data, routineId, draft) {
  const routines = normalizeRoutines(data?.routines || []);
  const nextRoutines = withSequentialRoutineOrder(
    routines.map((routine) => (
      routine.id === routineId
        ? normalizeRoutineDraft(draft, routine, routine.order)
        : routine
    )),
  );
  return {
    ...data,
    routines: nextRoutines,
  };
}

export function moveRoutine(data, routineId, direction) {
  const routines = normalizeRoutines(data?.routines || [])
    .slice()
    .sort((a, b) => (a.order || 0) - (b.order || 0));
  const index = routines.findIndex((routine) => routine.id === routineId);
  const targetIndex = index + direction;
  if (index === -1 || targetIndex < 0 || targetIndex >= routines.length) return data;
  const nextRoutines = routines.slice();
  const [routine] = nextRoutines.splice(index, 1);
  nextRoutines.splice(targetIndex, 0, routine);
  return {
    ...data,
    routines: withSequentialRoutineOrder(nextRoutines),
  };
}

export function deleteRoutine(data, routineId) {
  return {
    ...data,
    routines: withSequentialRoutineOrder(
      normalizeRoutines(data?.routines || []).filter((routine) => routine.id !== routineId),
    ),
  };
}

/* ──── PROJECT TYPE OPERATIONS ──── */
export function getProjectTypes(data, options = {}) {
  const includeInactive = options.includeInactive === true;
  return (data?.projectTypes || [])
    .filter((type) => includeInactive || type.active !== false)
    .slice()
    .sort((a, b) => (a.order || 0) - (b.order || 0));
}

export function getProjectTypeConfig(data, typeId) {
  const projectType = (data?.projectTypes || []).find((type) => type.id === typeId);
  if (!projectType) return null;

  return {
    typeId: projectType.id,
    legacyKey: projectType.legacyKey || null,
    projectType,
    label: projectType.name,
    icon: projectType.icon,
    color: projectType.color,
    stages: projectType.stages.map((stage) => stage.name),
  };
}

export function getLegacyTypeConfig(data, legacyKey) {
  const projectType = (data?.projectTypes || []).find((type) => type.legacyKey === legacyKey);
  if (projectType) {
    return {
      legacyKey,
      typeId: projectType.id,
      projectType,
      label: projectType.name,
      icon: projectType.icon,
      color: projectType.color,
      stages: projectType.stages.map((stage) => stage.name),
    };
  }

  const fallback = PIPELINES[legacyKey];
  if (!fallback) return null;

  return {
    legacyKey,
    typeId: null,
    projectType: null,
    label: fallback.label,
    icon: fallback.icon,
    color: fallback.color,
    stages: [...fallback.stages],
  };
}

export function getProjectsForTypeId(data, typeId) {
  const config = getProjectTypeConfig(data, typeId);
  if (!config?.projectType) return [];

  const entriesByProjectId = new Map();
  (data?.entryItems || []).forEach((entry) => {
    if (!entriesByProjectId.has(entry.projectId)) entriesByProjectId.set(entry.projectId, []);
    entriesByProjectId.get(entry.projectId).push(entry);
  });

  return (data?.projectItems || [])
    .filter((project) => project.typeId === config.projectType.id)
    .map((project) => ({
      id: project.id,
      name: project.name,
      stage: getStageName(config.projectType, project.currentStageId),
      entries: getVisibleProjectEntries(
        (entriesByProjectId.get(project.id) || []).map((entry) => ({
          id: entry.id,
          date: entry.date,
          text: entry.text,
          ts: toTimestamp(entry.createdAt, entry.date),
          ...(entry.kind === "stage_change"
            ? {
                kind: "stage_change",
                stage: getStageName(config.projectType, entry.stageId),
                notes: normalizeEntryNotes(entry.notes, entry.id, entry.date).map((note) => ({
                  ...note,
                  ts: toTimestamp(note.createdAt, entry.date),
                })),
              }
            : {}),
        })),
      ),
      created: normalizeDateString(project.createdAt, project.createdAt),
      archived: !!project.archived,
    }));
}

export function getProjectEntryRowsForDate(data, date) {
  const rows = [];

  getProjectTypes(data).forEach((type) => {
    const config = getProjectTypeConfig(data, type.id);
    if (!config) return;

    getProjectsForTypeId(data, type.id).forEach((project) => {
      (project.entries || []).forEach((entry) => {
        if (entry.date !== date) return;
        rows.push({
          dk: config.legacyKey || config.typeId,
          dc: config.color,
          di: config.icon,
          dl: config.label,
          typeId: type.id,
          projectId: project.id,
          pn: project.name,
          ps: project.stage,
          ...entry,
        });
      });
    });
  });

  return rows;
}

export function getTimelineItemsForDate(data, date) {
  const items = [];

  getRoutineStatuses(data, date, { includeInactive: true }).forEach((routine) => {
    const base = {
      icon: routine.icon || "🌿",
      color: routine.color || UI.sage,
      title: routine.name,
      tag: "routine",
    };

    if (routine.done && (!routine.items || routine.items.length === 0)) {
      items.push({
        id: `timeline_done_${routine.checkId || routine.id}_${date}`,
        text: "标记为已完成",
        ts: toTimestamp(Date.now(), date),
        ...base,
      });
    }

    (routine.items || []).forEach((item) => {
      items.push({
        id: `timeline_routine_${item.id}`,
        text: item.text,
        ts: toTimestamp(item.createdAt, date),
        ...base,
      });
    });
  });

  getProjectEntryRowsForDate(data, date).forEach((entry) => {
    items.push({
      id: `timeline_project_${entry.id}`,
      icon: entry.di,
      color: entry.dc,
      title: `${entry.dl} · ${entry.pn}`,
      tag: entry.ps,
      text: entry.text,
      ts: typeof entry.ts === "number" ? entry.ts : Date.now(),
      targetView: entry.typeId ? `type:${entry.typeId}` : "",
      projectId: entry.projectId || "",
    });
  });

  (getLogStore(data).misc || [])
    .filter((entry) => entry.date === date)
    .forEach((entry) => {
      items.push({
        id: `timeline_misc_${entry.id}`,
        miscId: entry.id,
        icon: LOGS.misc.icon,
        color: LOGS.misc.color,
        title: LOGS.misc.label,
        tag: "日志",
        text: entry.text,
        ts: typeof entry.ts === "number" ? entry.ts : Date.now(),
      });
    });

  return items.sort((a, b) => a.ts - b.ts);
}

export function getTimelineSections(items) {
  const buckets = [
    { key: "morning", label: "上午", items: [] },
    { key: "afternoon", label: "下午", items: [] },
    { key: "evening", label: "晚上", items: [] },
  ];

  (items || []).forEach((item) => {
    const hour = new Date(item.ts).getHours();
    if (hour < 12) buckets[0].items.push(item);
    else if (hour < 18) buckets[1].items.push(item);
    else buckets[2].items.push(item);
  });

  return buckets.filter((bucket) => bucket.items.length > 0);
}

export function downloadJson(filename, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);
}

export function exportTrackerData(data) {
  downloadJson(`daily-tracker-export-${getToday()}.json`, {
    version: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    data: serializeData(data),
  });
}

/* ──── TYPE DRAFT OPERATIONS ──── */
export function createTypeDraft(type = null) {
  if (!type) {
    return {
      name: "",
      icon: "🪴",
      color: UI.accent,
      active: true,
      stages: [
        { id: `stage_${uid()}`, name: "待办" },
        { id: `stage_${uid()}`, name: "进行中" },
        { id: `stage_${uid()}`, name: "完成" },
      ],
    };
  }

  return {
    name: type.name,
    icon: type.icon,
    color: type.color,
    active: type.active !== false,
    stages: (type.stages || []).map((stage) => ({
      id: stage.id,
      name: stage.name,
    })),
  };
}

export function normalizeTypeDraft(draft, baseType = null, order = 1) {
  const typeId = baseType?.id || `pt_custom_${uid()}`;
  const stages = (draft?.stages || [])
    .map((stage) => ({
      id: stage?.id || `${typeId}_stage_${uid()}`,
      name: typeof stage?.name === "string" ? stage.name.trim() : "",
    }))
    .filter((stage) => stage.name);

  const safeStages = stages.length ? stages : [{ id: `${typeId}_stage_${uid()}`, name: "阶段 1" }];

  return {
    id: typeId,
    legacyKey: baseType?.legacyKey || null,
    name: (draft?.name || "").trim() || baseType?.name || "新项目类型",
    icon: (draft?.icon || "").trim() || baseType?.icon || "📁",
    color: draft?.color || baseType?.color || UI.accent,
    stages: safeStages,
    active: draft?.active !== false,
    order,
  };
}

export function getTypeProjectCount(data, typeId) {
  return (data?.projectItems || []).filter((project) => project.typeId === typeId).length;
}

export function getStageUsageCount(data, typeId, stageId) {
  const currentCount = (data?.projectItems || []).filter((project) => project.typeId === typeId && project.currentStageId === stageId).length;
  const historyCount = (data?.entryItems || []).filter((entry) => {
    if (entry.kind !== "stage_change" || entry.stageId !== stageId) return false;
    const project = (data?.projectItems || []).find((item) => item.id === entry.projectId);
    return project?.typeId === typeId;
  }).length;
  return currentCount + historyCount;
}

export function createProjectWithInitialEntry(data, { typeId, name, stageName, date }) {
  const config = getProjectTypeConfig(data, typeId);
  if (!config?.projectType || !name?.trim()) return data;

  const projectId = uid();
  const stageId = getStageId(config.projectType, stageName || config.stages[0]);
  const createdAt = new Date().toISOString();
  const projectItem = {
    id: projectId,
    typeId: config.projectType.id,
    name: name.trim(),
    currentStageId: stageId,
    archived: false,
    createdAt,
  };
  const initialStageEntry = {
    id: uid(),
    date,
    projectId,
    kind: "stage_change",
    stageId,
    text: getStageEntryText(config.legacyKey, getStageName(config.projectType, stageId)),
    createdAt,
    auto: true,
    notes: [],
  };

  return {
    ...data,
    projectItems: [...(data.projectItems || []), projectItem],
    entryItems: collapseEntryItems([...(data.entryItems || []), initialStageEntry]),
  };
}

export function getLatestStageEntryForProjectDay(entryItems, projectId, date) {
  return (entryItems || [])
    .filter((entry) => entry.projectId === projectId && entry.date === date && entry.kind === "stage_change")
    .sort((a, b) => toTimestamp(b.createdAt, b.date) - toTimestamp(a.createdAt, a.date))[0] || null;
}
