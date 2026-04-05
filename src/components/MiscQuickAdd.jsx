import React, { useState } from "react";
import { css } from "../styles/theme.js";
import { UI } from "../constants/ui.js";
import { uid } from "../utils/id.js";
import { getLogStore } from "../data/operations.js";

export default function MiscQuickAdd({ data, up, today }) {
  const [inp, setInp] = useState("");
  const [showTime, setShowTime] = useState(false);
  const [customTime, setCustomTime] = useState("");

  const add = () => {
    if (!inp.trim()) return;
    let ts = Date.now();
    if (showTime && customTime) {
      const [h, m] = customTime.split(":").map(Number);
      const dt = new Date(`${today}T00:00:00`);
      dt.setHours(h, m, 0, 0);
      ts = dt.getTime();
    }
    const logStore = getLogStore(data);
    const all = [...(logStore.misc || []), { id: uid(), date: today, text: inp.trim(), ts }];
    up({
      ...data,
      legacy: {
        ...(data.legacy || {}),
        logs: { ...logStore, misc: all },
      },
    });
    setInp("");
    setCustomTime("");
    setShowTime(false);
  };

  return (
    <div style={{ marginBottom: "14px" }}>
      <div style={css.timelineComposer}>
        <input
          value={inp}
          onChange={(e) => setInp(e.target.value)}
          onKeyDown={(e) => { if (e.nativeEvent.isComposing) return; if (e.key === "Enter") add(); }}
          placeholder="补一条今天的杂项..."
          style={css.inp}
        />
        <button
          onClick={() => setShowTime((prev) => !prev)}
          className="misc-time-toggle"
          title="自定义时间"
          style={{
            width: "36px",
            background: showTime ? `${UI.accent}18` : "rgba(255,250,244,0.92)",
            border: `1px solid ${showTime ? UI.accent + "40" : UI.line}`,
            borderRadius: "12px",
            color: showTime ? UI.accent : UI.inkMute,
            fontSize: "14px",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          🕐
        </button>
        <button onClick={add} style={css.addB}>+</button>
      </div>
      {showTime && (
        <div className="misc-time-picker">
          <span style={{ fontSize: "11px", color: UI.inkMute }}>指定时间</span>
          <input
            type="time"
            value={customTime}
            onChange={(e) => setCustomTime(e.target.value)}
            className="misc-panel-time-input"
            style={{ flex: 1 }}
          />
          {customTime && (
            <button
              onClick={() => { setCustomTime(""); setShowTime(false); }}
              style={{ background: "none", border: "none", color: UI.inkMute, fontSize: "11px", cursor: "pointer" }}
            >
              清除
            </button>
          )}
        </div>
      )}
    </div>
  );
}
