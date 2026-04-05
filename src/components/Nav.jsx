import React, { useState, useRef, useEffect } from "react";
import { UI } from "../constants/ui.js";
import { css } from "../styles/theme.js";
import { useTracker } from "../context/TrackerContext.jsx";

const DEFAULT_MOTTO = "祝你拥有平静而幸福的一天。";
const MOTTO_MAX_LENGTH = 20;

export default function Nav() {
  const { view, setView, activeProjectTypes, data, up } = useTracker();
  const motto = data?.motto || DEFAULT_MOTTO;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(motto);
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const beginEdit = () => {
    setDraft(motto);
    setEditing(true);
  };

  const save = () => {
    const next = (draft.trim() || DEFAULT_MOTTO).slice(0, MOTTO_MAX_LENGTH);
    up({ ...data, motto: next });
    setEditing(false);
  };

  const cancel = () => {
    setDraft(motto);
    setEditing(false);
  };

  return (
    <nav style={css.nav}>
      <button onClick={() => setView("today")} style={view==="today" ? css.navOn : css.navOff}>今日</button>
      <button onClick={() => setView("routines")} style={view==="routines" ? css.navOn : css.navOff}>
        <span>🌿</span>
        <span style={{fontSize:"12px"}}>Routine</span>
      </button>
      <button onClick={() => setView("types")} style={view==="types" ? css.navOn : css.navOff}>
        <span>🧩</span>
        <span style={{fontSize:"12px"}}>项目类型</span>
      </button>
      {activeProjectTypes.map((type) => (
        <button key={type.id} onClick={() => setView(`type:${type.id}`)} style={view===`type:${type.id}` ? {...css.navOn, borderColor:type.color+"80"} : css.navOff}>
          <span>{type.icon}</span>
          <span style={{fontSize:"12px"}}>{type.name}</span>
        </button>
      ))}

      <div className="nav-motto">
        {editing ? (
          <div className="nav-motto-edit">
            <input
              ref={inputRef}
              value={draft}
              maxLength={MOTTO_MAX_LENGTH}
              onChange={(e) => setDraft(e.target.value.slice(0, MOTTO_MAX_LENGTH))}
              onKeyDown={(e) => {
                if (e.nativeEvent.isComposing) return;
                if (e.key === "Enter") save();
                if (e.key === "Escape") cancel();
              }}
              onBlur={save}
              className="nav-motto-input"
              placeholder={DEFAULT_MOTTO}
            />
          </div>
        ) : (
          <button onClick={beginEdit} className="nav-motto-btn" title="点击编辑这句话">
            <span className="nav-motto-text">{motto}</span>
            <span className="nav-motto-pencil">✏️</span>
          </button>
        )}
      </div>
    </nav>
  );
}
