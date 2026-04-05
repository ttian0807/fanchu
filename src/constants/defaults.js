import { UI } from "./ui.js";

export const PIPELINES = {
  work: {
    label: "工作项目",
    icon: "📁",
    stages: ["待办", "进行中", "完成"],
    color: "#c98663",
  },
  content: {
    label: "自媒体副业",
    icon: "🎬",
    stages: ["选题", "文案", "拍摄", "发布"],
    color: "#d8a2a1",
  },
};

export const LOGS = {
  fitness: { label: "运动", icon: "💪", color: "#93a783" },
  reading: { label: "阅读", icon: "📖", color: "#d6b072" },
  misc: { label: "其他杂项", icon: "📌", color: "#baa08b" },
};

export const ROUTINE_LOG_KEYS = ["fitness", "reading"];

export const DEFAULT_PROJECT_TYPES = Object.freeze(
  Object.entries(PIPELINES).map(([legacyKey, cfg], typeIndex) => ({
    id: `pt_${legacyKey}`,
    legacyKey,
    name: cfg.label,
    icon: cfg.icon,
    color: cfg.color,
    stages: cfg.stages.map((stageName, stageIndex) => ({
      id: `${legacyKey}_${stageIndex}`,
      name: stageName,
    })),
    active: true,
    order: typeIndex + 1,
  })),
);

export const DEFAULT_ROUTINES = Object.freeze([
  {
    id: "routine_fitness_default",
    name: "运动",
    icon: "💪",
    color: UI.sage,
    prompt: "今天练了什么？",
    active: true,
    order: 1,
  },
  {
    id: "routine_reading_default",
    name: "阅读",
    icon: "📖",
    color: UI.honey,
    prompt: "今天读了什么？",
    active: true,
    order: 2,
  },
]);
