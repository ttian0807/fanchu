import { UI } from "../constants/ui.js";
import { PIPELINES, LOGS, ROUTINE_LOG_KEYS, DEFAULT_PROJECT_TYPES, DEFAULT_ROUTINES } from "../constants/defaults.js";
import { SCHEMA_VERSION } from "../constants/config.js";
import { getToday } from "./date.js";
import { uid } from "./id.js";

export function cloneDefaultProjectTypes() {
  return DEFAULT_PROJECT_TYPES.map((type) => ({
    ...type,
    stages: type.stages.map((stage) => ({ ...stage })),
  }));
}

export function cloneDefaultRoutines() {
  return DEFAULT_ROUTINES.map((routine) => ({ ...routine }));
}

export function normalizeIsoDateTime(value, fallbackDate = getToday()) {
  if (typeof value === "number") {
    const dt = new Date(value);
    if (!Number.isNaN(dt.getTime())) return dt.toISOString();
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const dt = new Date(`${value}T12:00:00`);
      if (!Number.isNaN(dt.getTime())) return dt.toISOString();
    }
  }

  const fallback = typeof fallbackDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(fallbackDate)
    ? new Date(`${fallbackDate}T12:00:00`)
    : new Date();
  return fallback.toISOString();
}

export function normalizeDateString(value, fallbackValue = getToday()) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parsed = new Date(value || fallbackValue);
  if (!Number.isNaN(parsed.getTime())) return getToday(parsed);
  return typeof fallbackValue === "string" && /^\d{4}-\d{2}-\d{2}$/.test(fallbackValue) ? fallbackValue : getToday();
}

export function toTimestamp(value, fallbackDate) {
  const ts = new Date(normalizeIsoDateTime(value, fallbackDate)).getTime();
  return Number.isNaN(ts) ? Date.now() : ts;
}

export function normalizeEntryNotes(notes, entryId, fallbackDate) {
  return (Array.isArray(notes) ? notes : [])
    .map((note, index) => ({
      id: note?.id || `${entryId}_note_${index + 1}`,
      text: typeof note?.text === "string" ? note.text.trim() : "",
      createdAt: normalizeIsoDateTime(note?.createdAt ?? note?.ts, fallbackDate),
    }))
    .filter((note) => note.text)
    .sort((a, b) => toTimestamp(a.createdAt, fallbackDate) - toTimestamp(b.createdAt, fallbackDate));
}

export function normalizeLogs(logs) {
  if (!logs || typeof logs !== "object") return {};
  return Object.fromEntries(
    Object.entries(logs).map(([key, entries]) => [
      key,
      Array.isArray(entries)
        ? entries
            .map((entry) => ({
              id: entry?.id || uid(),
              date: normalizeDateString(entry?.date, entry?.ts),
              text: typeof entry?.text === "string" ? entry.text : "",
              ts: toTimestamp(entry?.ts ?? entry?.createdAt, entry?.date),
            }))
            .sort((a, b) => a.ts - b.ts)
        : [],
    ]),
  );
}

export function normalizeProjectTypes(projectTypes) {
  const defaults = cloneDefaultProjectTypes();
  const defaultById = new Map(defaults.map((type) => [type.id, type]));

  const normalized = (Array.isArray(projectTypes) ? projectTypes : []).map((type, index) => {
    const fallbackType = defaultById.get(type?.id) || defaults.find((candidate) => candidate.legacyKey === type?.legacyKey);
    const typeId = type?.id || fallbackType?.id || `pt_custom_${index + 1}`;
    const rawStages = Array.isArray(type?.stages) && type.stages.length
      ? type.stages
      : fallbackType?.stages || [{ id: `${typeId}_0`, name: "待办" }];

    return {
      id: typeId,
      legacyKey: type?.legacyKey ?? fallbackType?.legacyKey ?? null,
      name: type?.name || fallbackType?.name || `项目类型 ${index + 1}`,
      icon: type?.icon || fallbackType?.icon || "📁",
      color: type?.color || fallbackType?.color || UI.accent,
      stages: rawStages.map((stage, stageIndex) => ({
        id: stage?.id || `${typeId}_${stageIndex}`,
        name: stage?.name || fallbackType?.stages?.[stageIndex]?.name || `阶段 ${stageIndex + 1}`,
      })),
      active: type?.active !== false,
      order: Number.isFinite(type?.order) ? type.order : fallbackType?.order ?? index + 1,
    };
  });

  const legacyKeys = new Set(normalized.map((type) => type.legacyKey).filter(Boolean));
  defaults.forEach((type) => {
    if (!legacyKeys.has(type.legacyKey)) normalized.push(type);
  });

  return normalized.sort((a, b) => (a.order || 0) - (b.order || 0));
}

export function getProjectTypeByLegacyKey(projectTypes, legacyKey) {
  return projectTypes.find((type) => type.legacyKey === legacyKey) || null;
}

export function getStageId(projectType, stageValue) {
  if (!projectType) return stageValue || "stage_0";
  const directMatch = projectType.stages.find((stage) => stage.id === stageValue);
  if (directMatch) return directMatch.id;
  const namedMatch = projectType.stages.find((stage) => stage.name === stageValue);
  if (namedMatch) return namedMatch.id;
  return projectType.stages[0]?.id || `${projectType.id}_0`;
}

export function getStageName(projectType, stageId) {
  if (!projectType) return stageId || "待办";
  return projectType.stages.find((stage) => stage.id === stageId)?.name || projectType.stages[0]?.name || "待办";
}

export function normalizeProjectItems(projectItems, projectTypes) {
  const typeById = new Map(projectTypes.map((type) => [type.id, type]));

  return (Array.isArray(projectItems) ? projectItems : []).map((project, index) => {
    const projectType = typeById.get(project?.typeId) || projectTypes[0];
    return {
      id: project?.id || uid(),
      typeId: projectType?.id || project?.typeId || `pt_custom_${index + 1}`,
      name: typeof project?.name === "string" && project.name.trim() ? project.name.trim() : `项目 ${index + 1}`,
      currentStageId: getStageId(projectType, project?.currentStageId ?? project?.stage),
      archived: !!project?.archived,
      createdAt: normalizeIsoDateTime(project?.createdAt ?? project?.created, project?.created),
    };
  });
}

export function normalizeEntryItems(entryItems, projectItems, projectTypes) {
  const projectById = new Map(projectItems.map((project) => [project.id, project]));
  const typeById = new Map(projectTypes.map((type) => [type.id, type]));

  return (Array.isArray(entryItems) ? entryItems : [])
    .map((entry) => {
      const project = projectById.get(entry?.projectId);
      if (!project) return null;
      const projectType = typeById.get(project.typeId);
      const kind = entry?.kind === "stage_change" ? "stage_change" : "manual";
      const createdAt = normalizeIsoDateTime(entry?.createdAt ?? entry?.ts, entry?.date);
      return {
        id: entry?.id || uid(),
        date: normalizeDateString(entry?.date, createdAt),
        projectId: project.id,
        kind,
        stageId: kind === "stage_change" ? getStageId(projectType, entry?.stageId ?? entry?.stage ?? project.currentStageId) : null,
        text: typeof entry?.text === "string" ? entry.text : "",
        createdAt,
        auto: entry?.auto ?? kind === "stage_change",
        notes: kind === "stage_change" ? normalizeEntryNotes(entry?.notes, entry?.id || uid(), entry?.date) : [],
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return toTimestamp(a.createdAt, a.date) - toTimestamp(b.createdAt, b.date);
    });
}

export function normalizeRoutines(routines) {
  return (Array.isArray(routines) ? routines : []).map((routine, index) => ({
    id: routine?.id || `routine_${index + 1}`,
    name: typeof routine?.name === "string" && routine.name.trim() ? routine.name.trim() : `Routine ${index + 1}`,
    icon: typeof routine?.icon === "string" && routine.icon.trim() ? routine.icon.trim() : "🌿",
    color: typeof routine?.color === "string" && routine.color.trim() ? routine.color.trim() : UI.sage,
    prompt: typeof routine?.prompt === "string" && routine.prompt.trim() ? routine.prompt.trim() : "今天做了什么？",
    active: routine?.active !== false,
    order: Number.isFinite(routine?.order) ? routine.order : index + 1,
  }));
}

export function normalizeRoutineChecks(routineChecks) {
  return (Array.isArray(routineChecks) ? routineChecks : []).map((check, index) => ({
    id: check?.id || `routine_check_${index + 1}`,
    date: normalizeDateString(check?.date),
    routineId: check?.routineId || "",
    routineName: typeof check?.routineName === "string" ? check.routineName : "",
    done: !!check?.done,
    items: (Array.isArray(check?.items) ? check.items : [])
      .map((item, itemIndex) => ({
        id: item?.id || `${check?.id || `routine_check_${index + 1}`}_item_${itemIndex + 1}`,
        text: typeof item?.text === "string" ? item.text.trim() : "",
        createdAt: normalizeIsoDateTime(item?.createdAt ?? item?.ts, check?.date),
      }))
      .filter((item) => item.text)
      .sort((a, b) => toTimestamp(a.createdAt, check?.date) - toTimestamp(b.createdAt, check?.date)),
  }));
}

export function normalizeDailyNotes(dailyNotes = {}, reflections = {}) {
  const normalized = {};

  Object.entries(dailyNotes || {}).forEach(([date, note]) => {
    const safeDate = normalizeDateString(date, date);
    normalized[safeDate] = {
      ...(note || {}),
      reflection: typeof note?.reflection === "string" ? note.reflection : "",
      summary: typeof note?.summary === "string" ? note.summary : "",
    };
  });

  Object.entries(reflections || {}).forEach(([date, reflection]) => {
    const safeDate = normalizeDateString(date, date);
    normalized[safeDate] = {
      ...(normalized[safeDate] || {}),
      reflection: typeof reflection === "string" ? reflection : "",
    };
  });

  return normalized;
}

export function collapseEntryItems(entryItems) {
  const manualEntries = [];
  const latestStageEntryByProjectDay = new Map();

  (entryItems || []).forEach((entry) => {
    if (entry.kind === "stage_change") {
      const key = `${entry.projectId}__${entry.date}`;
      const prev = latestStageEntryByProjectDay.get(key);
      if (!prev) {
        latestStageEntryByProjectDay.set(key, {
          ...entry,
          notes: normalizeEntryNotes(entry.notes, entry.id, entry.date),
        });
        return;
      }

      const prevTs = toTimestamp(prev.createdAt, prev.date);
      const nextTs = toTimestamp(entry.createdAt, entry.date);
      if (nextTs > prevTs) {
        latestStageEntryByProjectDay.set(key, {
          ...entry,
          notes: [
            ...normalizeEntryNotes(prev.notes, prev.id, prev.date),
            ...normalizeEntryNotes(entry.notes, entry.id, entry.date),
          ],
        });
      } else {
        latestStageEntryByProjectDay.set(key, {
          ...prev,
          notes: [
            ...normalizeEntryNotes(prev.notes, prev.id, prev.date),
            ...normalizeEntryNotes(entry.notes, entry.id, entry.date),
          ],
        });
      }
      return;
    }

    manualEntries.push(entry);
  });

  return [...manualEntries, ...latestStageEntryByProjectDay.values()].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return toTimestamp(a.createdAt, a.date) - toTimestamp(b.createdAt, b.date);
  });
}

export function getVisibleProjectEntries(entries) {
  const manualEntries = [];
  const latestStageEntryByDate = new Map();

  (entries || []).forEach((entry) => {
    if (entry.kind === "stage_change") {
      const prev = latestStageEntryByDate.get(entry.date);
      if (!prev || (entry.ts || 0) > (prev.ts || 0)) {
        latestStageEntryByDate.set(entry.date, entry);
      }
      return;
    }

    manualEntries.push(entry);
  });

  return [...manualEntries, ...latestStageEntryByDate.values()].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return (a.ts || 0) - (b.ts || 0);
  });
}

export function withSequentialRoutineOrder(routines) {
  return (routines || []).map((routine, index) => ({
    ...routine,
    order: index + 1,
  }));
}

export function withSequentialTypeOrder(types) {
  return (types || []).map((type, index) => ({
    ...type,
    order: index + 1,
  }));
}

export function getStageEntryText(pk, stage) {
  if (pk === "job") {
    const jobMap = {
      "发现": "发现了这个岗位",
      "投递": "投递了这个岗位",
      "等回复": "进入等待回复",
      "面试": "进入面试流程",
      "结果": "更新了结果",
    };
    return jobMap[stage] || `推进到「${stage}」阶段`;
  }

  if (pk === "xhs" || pk === "food") {
    const contentMap = {
      "选题": "确定了选题",
      "文案": "开始整理文案",
      "拍摄": "进入拍摄阶段",
      "剪辑": "进入剪辑阶段",
      "发布": "发布了内容",
      "看数据": "开始复盘数据",
    };
    return contentMap[stage] || `推进到「${stage}」阶段`;
  }

  if (pk === "product") {
    const productMap = {
      "待办": "整理了待办",
      "进行中": "开始推进这个项目",
      "完成": "完成了这个项目",
    };
    return productMap[stage] || `推进到「${stage}」阶段`;
  }

  return `推进到「${stage}」阶段`;
}
