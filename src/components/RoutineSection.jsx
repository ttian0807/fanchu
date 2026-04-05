import React from "react";
import { css } from "../styles/theme.js";
import { getRoutineStatuses } from "../data/operations.js";
import RoutineCard from "./RoutineCard.jsx";

export default function RoutineSection({ data, up, today, viewingToday, setView, compact = false }) {
  const routines = getRoutineStatuses(data, today, { includeInactive: true }).filter((routine) => (
    routine.active !== false || routine.done || (routine.items || []).length > 0 || routine.missing
  ));
  const doneCount = routines.filter((routine) => routine.done).length;
  return (
    <div className="section-card" style={css.sec}>
      <div style={css.routineHead}>
        <div>
          <h3 style={css.secT}>{viewingToday ? "今日 Routine" : "这一天的 Routine"}</h3>
          <p style={css.routineSummary}>
            {routines.length > 0
              ? `${doneCount}/${routines.length} 完成 · 这些 routine 来自你的管理页`
              : "先去管理页定义 routine，它们就会自动出现在这里。"}
          </p>
        </div>
        <button onClick={() => setView("routines")} className="btn-action" style={css.actionBtn}>管理 routine</button>
      </div>

      {routines.length === 0 ? (
        <div style={css.routineEmpty}>
          <p style={css.emptyText}>现在还没有 active 的 routine。先去 `Routine` 页面定义好名字、图标、颜色和输入提示，它们就会自动 feed 到这个每日面板。</p>
          <button onClick={() => setView("routines")} style={css.emptyCta}>现在去设置</button>
        </div>
      ) : (
        <div style={css.routineList}>
          {routines.map((routine) => <RoutineCard key={routine.id} routine={routine} data={data} up={up} today={today} compact={compact}/>)}
        </div>
      )}
    </div>
  );
}
