import { PIPELINES, LOGS, ROUTINE_LOG_KEYS } from "../constants/defaults.js";
import { SCHEMA_VERSION } from "../constants/config.js";
import { uid } from "../utils/id.js";
import {
  cloneDefaultProjectTypes,
  cloneDefaultRoutines,
  normalizeIsoDateTime,
  normalizeDateString,
  toTimestamp,
  normalizeEntryNotes,
  normalizeLogs,
  normalizeProjectTypes,
  getProjectTypeByLegacyKey,
  getStageId,
  getStageName,
  normalizeProjectItems,
  normalizeEntryItems,
  normalizeRoutines,
  normalizeRoutineChecks,
  normalizeDailyNotes,
  collapseEntryItems,
  getVisibleProjectEntries,
  withSequentialRoutineOrder,
} from "../utils/normalize.js";

export function createEmptyCanonicalData() {
  return {
    schemaVersion: SCHEMA_VERSION,
    projectTypes: cloneDefaultProjectTypes(),
    projectItems: [],
    entryItems: [],
    routines: cloneDefaultRoutines(),
    routineChecks: [],
    dailyNotes: {},
    legacy: { logs: {} },
  };
}

function isProjectGroupMap(value) {
  return !!value && !Array.isArray(value) && typeof value === "object" && Object.values(value).every((item) => Array.isArray(item));
}

function mergeDefaultRoutines(routines) {
  const normalized = normalizeRoutines(routines);
  const existingIds = new Set(normalized.map((routine) => routine.id));
  const existingNames = new Set(normalized.map((routine) => routine.name.trim().toLowerCase()));
  const appendedDefaults = cloneDefaultRoutines().filter((routine) => (
    !existingIds.has(routine.id) && !existingNames.has(routine.name.trim().toLowerCase())
  ));
  return withSequentialRoutineOrder([...normalized, ...appendedDefaults]);
}

function getRoutineForLegacyLog(routines, legacyKey) {
  const defaultId = legacyKey === "fitness"
    ? "routine_fitness_default"
    : legacyKey === "news"
      ? "routine_news_default"
      : "";
  const fallbackName = LOGS[legacyKey]?.label?.trim().toLowerCase();
  return routines.find((routine) => routine.id === defaultId)
    || routines.find((routine) => routine.name.trim().toLowerCase() === fallbackName)
    || null;
}

function mergeLegacyRoutineLogs(canonical) {
  const legacyLogs = normalizeLogs(canonical?.legacy?.logs || {});
  const routines = mergeDefaultRoutines(canonical?.routines || []);
  const checks = normalizeRoutineChecks(canonical?.routineChecks || []);
  let changed = false;

  ROUTINE_LOG_KEYS.forEach((legacyKey) => {
    const routine = getRoutineForLegacyLog(routines, legacyKey);
    const logEntries = legacyLogs[legacyKey] || [];
    if (!routine || logEntries.length === 0) return;

    logEntries.forEach((entry) => {
      const date = normalizeDateString(entry?.date);
      const text = typeof entry?.text === "string" ? entry.text.trim() : "";
      if (!text) return;
      const existingCheck = checks.find((check) => check.routineId === routine.id && check.date === date);
      const item = {
        id: `routine_item_${entry.id || uid()}`,
        text,
        createdAt: normalizeIsoDateTime(entry?.ts, date),
      };

      if (!existingCheck) {
        checks.push({
          id: `routine_check_${uid()}`,
          date,
          routineId: routine.id,
          routineName: routine.name,
          done: false,
          items: [item],
        });
        changed = true;
        return;
      }

      if ((existingCheck.items || []).some((existingItem) => existingItem.text === item.text)) return;
      existingCheck.items = [...(existingCheck.items || []), item];
      existingCheck.routineName = existingCheck.routineName || routine.name;
      changed = true;
    });

    if (legacyLogs[legacyKey]?.length) {
      delete legacyLogs[legacyKey];
      changed = true;
    }
  });

  if (!changed) return { canonical, changed: false };

  return {
    changed: true,
    canonical: {
      ...canonical,
      routines,
      routineChecks: normalizeRoutineChecks(checks),
      legacy: {
        ...(canonical.legacy || {}),
        logs: legacyLogs,
      },
    },
  };
}

function mergeProjectManualEntriesIntoNotes(canonical) {
  const stageEntries = [];
  const manualEntries = [];
  let changed = false;

  (canonical.entryItems || []).forEach((entry) => {
    if (entry.kind === "stage_change") stageEntries.push({
      ...entry,
      notes: normalizeEntryNotes(entry.notes, entry.id, entry.date),
    });
    else manualEntries.push(entry);
  });

  manualEntries.forEach((entry) => {
    const target = stageEntries.find((candidate) => (
      candidate.projectId === entry.projectId
      && candidate.date === entry.date
    ));

    if (!target) {
      stageEntries.push(entry);
      return;
    }

    target.notes = [
      ...(target.notes || []),
      {
        id: `project_note_${entry.id}`,
        text: entry.text,
        createdAt: entry.createdAt,
      },
    ];
    changed = true;
  });

  if (!changed) return { canonical, changed: false };

  return {
    changed: true,
    canonical: {
      ...canonical,
      entryItems: collapseEntryItems(stageEntries),
    },
  };
}

function migrateLegacyProjectGroups(projectGroups, projectTypes) {
  const projectItems = [];
  const entryItems = [];

  Object.entries(projectGroups || {}).forEach(([legacyKey, projects]) => {
    const projectType = getProjectTypeByLegacyKey(projectTypes, legacyKey);
    if (!projectType) return;

    (projects || []).forEach((project, index) => {
      const projectId = project?.id || uid();
      projectItems.push({
        id: projectId,
        typeId: projectType.id,
        name: typeof project?.name === "string" && project.name.trim() ? project.name.trim() : `项目 ${index + 1}`,
        currentStageId: getStageId(projectType, project?.stage),
        archived: !!project?.archived,
        createdAt: normalizeIsoDateTime(project?.createdAt ?? project?.created, project?.created),
      });

      getVisibleProjectEntries(project?.entries || []).forEach((entry) => {
        const kind = entry?.kind === "stage_change" ? "stage_change" : "manual";
        entryItems.push({
          id: entry?.id || uid(),
          date: normalizeDateString(entry?.date, entry?.ts),
          projectId,
          kind,
          stageId: kind === "stage_change" ? getStageId(projectType, entry?.stage ?? project?.stage) : null,
          text: typeof entry?.text === "string" ? entry.text : "",
          createdAt: normalizeIsoDateTime(entry?.createdAt ?? entry?.ts, entry?.date),
          auto: kind === "stage_change",
        });
      });
    });
  });

  return { projectItems, entryItems };
}

function mergeLegacyProjectsIntoCanonical(canonical, projectGroups) {
  const migrated = migrateLegacyProjectGroups(projectGroups, canonical.projectTypes);
  const legacyTypeIds = new Set(canonical.projectTypes.filter((type) => type.legacyKey).map((type) => type.id));
  const preservedProjects = canonical.projectItems.filter((project) => !legacyTypeIds.has(project.typeId));
  const preservedProjectIds = new Set(preservedProjects.map((project) => project.id));
  const preservedEntries = canonical.entryItems.filter((entry) => preservedProjectIds.has(entry.projectId));
  const projectItems = normalizeProjectItems([...preservedProjects, ...migrated.projectItems], canonical.projectTypes);
  const entryItems = collapseEntryItems(normalizeEntryItems([...preservedEntries, ...migrated.entryItems], projectItems, canonical.projectTypes));

  return {
    ...canonical,
    projectItems,
    entryItems,
  };
}

function deriveLegacyProjectGroups(canonical) {
  const groups = Object.fromEntries(Object.keys(PIPELINES).map((key) => [key, []]));
  const entriesByProjectId = new Map();
  const projectTypeById = new Map(canonical.projectTypes.map((type) => [type.id, type]));

  canonical.entryItems.forEach((entry) => {
    if (!entriesByProjectId.has(entry.projectId)) entriesByProjectId.set(entry.projectId, []);
    entriesByProjectId.get(entry.projectId).push(entry);
  });

  canonical.projectItems.forEach((project) => {
    const projectType = projectTypeById.get(project.typeId);
    if (!projectType?.legacyKey) return;

    const entries = getVisibleProjectEntries(
      (entriesByProjectId.get(project.id) || []).map((entry) => ({
        id: entry.id,
        date: entry.date,
        text: entry.text,
        ts: toTimestamp(entry.createdAt, entry.date),
        ...(entry.kind === "stage_change"
          ? { kind: "stage_change", stage: getStageName(projectType, entry.stageId) }
          : {}),
      })),
    );

    groups[projectType.legacyKey].push({
      id: project.id,
      name: project.name,
      stage: getStageName(projectType, project.currentStageId),
      entries,
      created: normalizeDateString(project.createdAt, project.createdAt),
      archived: !!project.archived,
    });
  });

  return groups;
}

function deriveLegacyNotes(dailyNotes) {
  const reflections = {};

  Object.entries(dailyNotes || {}).forEach(([date, note]) => {
    if (typeof note?.reflection === "string") reflections[date] = note.reflection;
  });

  return { reflections };
}

export function buildCanonicalData(raw) {
  const fallback = createEmptyCanonicalData();
  if (!raw || typeof raw !== "object") {
    return { canonical: fallback, needsMigrationWrite: true };
  }

  const hasCanonicalProjects = Array.isArray(raw.projects) || Array.isArray(raw.projectItems);
  const hasCanonicalEntries = Array.isArray(raw.entries) || Array.isArray(raw.entryItems);
  const hasCanonicalLogs = !!raw.legacy && Object.prototype.hasOwnProperty.call(raw.legacy, "logs");
  const hasCanonicalDailyNotes = !!raw.dailyNotes && typeof raw.dailyNotes === "object" && !Array.isArray(raw.dailyNotes);
  const projectTypes = normalizeProjectTypes(raw.projectTypes);
  const baseProjectItems = normalizeProjectItems(Array.isArray(raw.projects) ? raw.projects : raw.projectItems, projectTypes);
  let canonical = {
    schemaVersion: SCHEMA_VERSION,
    projectTypes,
    projectItems: baseProjectItems,
    entryItems: collapseEntryItems(
      normalizeEntryItems(Array.isArray(raw.entries) ? raw.entries : raw.entryItems, baseProjectItems, projectTypes),
    ),
    routines: normalizeRoutines(raw.routines),
    routineChecks: normalizeRoutineChecks(raw.routineChecks),
    dailyNotes: normalizeDailyNotes(raw.dailyNotes),
    legacy: { logs: normalizeLogs(raw.legacy?.logs || {}) },
  };

  const hasEmbeddedAiInsight = Object.values(raw.dailyNotes || {}).some((note) => note && typeof note === "object" && note.aiInsight);
  let needsMigrationWrite = raw.schemaVersion !== SCHEMA_VERSION || !hasCanonicalProjects || !hasCanonicalEntries || !!raw.aiInsights || hasEmbeddedAiInsight;

  if ((raw.schemaVersion || 0) < 3) {
    canonical.routines = mergeDefaultRoutines(canonical.routines);
    needsMigrationWrite = true;
  }

  const mergedRoutineLogs = mergeLegacyRoutineLogs(canonical);
  if (mergedRoutineLogs.changed) {
    canonical = mergedRoutineLogs.canonical;
    needsMigrationWrite = true;
  }

  if (!hasCanonicalProjects && !hasCanonicalEntries && isProjectGroupMap(raw.projects)) {
    canonical = mergeLegacyProjectsIntoCanonical(canonical, raw.projects);
    needsMigrationWrite = true;
  }

  const mergedProjectNotes = mergeProjectManualEntriesIntoNotes(canonical);
  if (mergedProjectNotes.changed) {
    canonical = mergedProjectNotes.canonical;
    needsMigrationWrite = true;
  }

  if (!hasCanonicalLogs && raw.logs) {
    canonical.legacy = { ...canonical.legacy, logs: normalizeLogs(raw.logs) };
    needsMigrationWrite = true;
  }

  if (!hasCanonicalDailyNotes && (raw.reflections || raw.aiInsights)) {
    canonical.dailyNotes = normalizeDailyNotes(canonical.dailyNotes, raw.reflections);
    needsMigrationWrite = true;
  }

  if (typeof raw.motto === "string" && raw.motto.trim()) {
    canonical.motto = raw.motto.trim();
  }

  return { canonical, needsMigrationWrite };
}

export function enrichData(canonical, needsMigrationWrite = false) {
  const logs = normalizeLogs(canonical.legacy?.logs || {});
  const { reflections } = deriveLegacyNotes(canonical.dailyNotes);

  return {
    schemaVersion: SCHEMA_VERSION,
    projectTypes: canonical.projectTypes,
    projectItems: canonical.projectItems,
    entryItems: canonical.entryItems,
    routines: canonical.routines,
    routineChecks: canonical.routineChecks,
    dailyNotes: canonical.dailyNotes,
    legacy: { logs },
    projects: deriveLegacyProjectGroups(canonical),
    logs,
    reflections,
    motto: canonical.motto || "",
    _needsMigrationWrite: needsMigrationWrite,
  };
}

export function serializeData(raw) {
  const { canonical } = buildCanonicalData(raw);
  return {
    schemaVersion: SCHEMA_VERSION,
    projectTypes: canonical.projectTypes,
    projects: canonical.projectItems,
    entries: canonical.entryItems,
    routines: canonical.routines,
    routineChecks: canonical.routineChecks,
    dailyNotes: canonical.dailyNotes,
    legacy: canonical.legacy,
    ...(canonical.motto ? { motto: canonical.motto } : {}),
  };
}

export function normalizeData(raw) {
  const { canonical, needsMigrationWrite } = buildCanonicalData(raw);
  return enrichData(canonical, needsMigrationWrite);
}
