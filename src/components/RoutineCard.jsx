import React, { useState, useRef } from "react";
import { UI } from "../constants/ui.js";
import { css } from "../styles/theme.js";
import { useAutoGrowTextArea } from "../hooks/useAutoGrowTextArea.js";
import { addRoutineItem, updateRoutineItem, removeRoutineItem, toggleRoutineDone } from "../data/operations.js";

export default function RoutineCard({ routine, data, up, today, compact = false }) {
  const [inp, setInp] = useState("");
  const [expanded, setExpanded] = useState(!compact);
  const [editingId, setEditingId] = useState("");
  const [editingText, setEditingText] = useState("");
  const composeRef = useRef(null);
  const targetRoutineId = routine.routineId || routine.id;
  const canEdit = !routine.missing;
  const allItems = routine.items || [];
  const visibleItems = compact && !expanded ? allItems.slice(-2) : allItems;
  const hiddenCount = Math.max(0, allItems.length - visibleItems.length);
  useAutoGrowTextArea(composeRef, inp, 56);
  const add = () => {
    if (!inp.trim() || !canEdit) return;
    up(addRoutineItem(data, targetRoutineId, today, inp));
    setInp("");
  };
  const beginEdit = (item) => {
    setExpanded(true);
    setEditingId(item.id);
    setEditingText(item.text);
  };
  const cancelEdit = () => {
    setEditingId("");
    setEditingText("");
  };
  const saveEdit = () => {
    if (!editingId || !editingText.trim()) return;
    up(updateRoutineItem(data, targetRoutineId, today, editingId, editingText));
    cancelEdit();
  };

  return (
    <div style={{...css.logW, borderLeftColor:routine.color}}>
      <div style={css.logH}>
        <span style={{fontSize:"16px"}}>{routine.icon}</span>
        <span style={{fontSize:"14px",fontWeight:600,color:UI.ink}}>{routine.name}</span>
        {routine.items?.length > 0 && <span style={css.logC}>{routine.items.length}条</span>}
        {routine.done && <span style={css.tBadge}>已完成</span>}
        {routine.active === false && !routine.missing && <span style={css.typeInactive}>已停用</span>}
        {routine.missing && <span style={css.typeInactive}>历史快照</span>}
        {compact && allItems.length > 0 && (
          <button onClick={() => setExpanded((prev) => !prev)} style={css.routineToggleBtn}>
            {expanded ? "收起细节" : `展开细节${allItems.length > 1 ? ` (${allItems.length})` : ""}`}
          </button>
        )}
        {canEdit && (
          <button
            onClick={() => up(toggleRoutineDone(data, targetRoutineId, today))}
            style={routine.done ? { ...css.routineStateBtn, ...css.routineStateBtnDone, borderColor:routine.color+"40", color:routine.color } : { ...css.routineStateBtn, borderColor:routine.color+"30", color:routine.color }}
          >
            {routine.done ? "取消完成" : "标记完成"}
          </button>
        )}
      </div>
      {visibleItems.map((item) => (
        <div key={item.id} style={css.logE}>
          {editingId === item.id ? (
            <div style={css.routineEditWrap}>
              <textarea
                value={editingText}
                onChange={(e) => setEditingText(e.target.value)}
                style={css.routineEditBox}
              />
              <div style={css.routineEditActions}>
                <button onClick={saveEdit} style={css.aBtn}>保存</button>
                <button onClick={cancelEdit} style={css.aBtn}>取消</button>
              </div>
            </div>
          ) : (
            <>
              <p style={compact && !expanded ? css.routineItemPreview : css.routineItemFull}>{item.text}</p>
              {canEdit && (
                <div style={css.routineItemActions}>
                  <button onClick={() => beginEdit(item)} style={css.aBtn}>改</button>
                  <button onClick={() => up(removeRoutineItem(data, targetRoutineId, today, item.id))} style={css.xBtn}>{"×"}</button>
                </div>
              )}
            </>
          )}
        </div>
      ))}
      {compact && hiddenCount > 0 && <p style={css.routineMoreHint}>还有 {hiddenCount} 条内容，展开后会回到左边完整显示。</p>}
      {canEdit && (
        <div style={css.multiInputRow}>
          <textarea
            ref={composeRef}
            value={inp}
            onChange={(e) => setInp(e.target.value)}
            onKeyDown={(e) => {
              if (e.nativeEvent.isComposing) return;
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                add();
              }
            }}
            placeholder={routine.prompt || "今天做了什么？"}
            style={css.multiInp}
          />
          <button onClick={add} style={{...css.addB, background:routine.color+"20", color:routine.color, borderColor:routine.color+"30"}}>+</button>
        </div>
      )}
    </div>
  );
}
