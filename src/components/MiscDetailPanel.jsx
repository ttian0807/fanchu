import React, { useState, useRef, useEffect } from "react";
import { UI } from "../constants/ui.js";
import { css } from "../styles/theme.js";
import { fmtClock } from "../utils/date.js";
import { useAutoGrowTextArea } from "../hooks/useAutoGrowTextArea.js";

export default function MiscDetailPanel({ item, onSave, onDelete, onClose }) {
  const [text, setText] = useState(item.text);
  const [timeVal, setTimeVal] = useState(() => {
    const dt = new Date(item.ts);
    if (Number.isNaN(dt.getTime())) return "12:00";
    return dt.toTimeString().slice(0, 5);
  });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const textRef = useRef(null);
  const panelRef = useRef(null);
  useAutoGrowTextArea(textRef, text, 72);

  useEffect(() => {
    if (textRef.current) textRef.current.focus();
  }, []);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const buildTs = () => {
    const dt = new Date(item.ts);
    const [h, m] = timeVal.split(":").map(Number);
    dt.setHours(h, m, 0, 0);
    return dt.getTime();
  };

  const handleSave = () => {
    if (!text.trim()) return;
    onSave({ text: text.trim(), ts: buildTs() });
  };

  const dirty = text.trim() !== item.text || timeVal !== new Date(item.ts).toTimeString().slice(0, 5);

  return (
    <>
      <div className="misc-panel-overlay" onClick={onClose} />
      <div ref={panelRef} className="misc-panel">
        <div className="misc-panel-header">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "16px" }}>{item.icon}</span>
            <span style={{ fontSize: "13px", fontWeight: 700, color: item.color }}>{item.title}</span>
            <span style={css.timelineTag}>{item.tag}</span>
          </div>
          <button onClick={onClose} className="misc-panel-close">×</button>
        </div>

        <div className="misc-panel-body">
          <label className="misc-panel-label">
            <span>内容</span>
            <textarea
              ref={textRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.nativeEvent.isComposing) return;
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleSave(); }
              }}
              style={css.multiInp}
              placeholder="写点什么..."
            />
          </label>

          <label className="misc-panel-label">
            <span>时间</span>
            <div className="misc-panel-time-row">
              <input
                type="time"
                value={timeVal}
                onChange={(e) => setTimeVal(e.target.value)}
                className="misc-panel-time-input"
              />
              <span className="misc-panel-time-hint">{fmtClock(item.ts)} → {timeVal !== new Date(item.ts).toTimeString().slice(0, 5) ? timeVal : "未修改"}</span>
            </div>
          </label>
        </div>

        <div className="misc-panel-footer">
          <div className="misc-panel-actions-left">
            {!confirmDelete ? (
              <button onClick={() => setConfirmDelete(true)} className="misc-panel-btn-danger">删除</button>
            ) : (
              <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "12px", color: UI.danger }}>确定删除？</span>
                <button onClick={onDelete} className="misc-panel-btn-danger">确定</button>
                <button onClick={() => setConfirmDelete(false)} className="misc-panel-btn-mute">取消</button>
              </span>
            )}
          </div>
          <div className="misc-panel-actions-right">
            <button onClick={onClose} className="misc-panel-btn-mute">取消</button>
            <button onClick={handleSave} disabled={!text.trim()} className={dirty ? "misc-panel-btn-primary" : "misc-panel-btn-mute"}>
              {dirty ? "保存修改" : "关闭"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
