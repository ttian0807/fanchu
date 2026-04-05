import React from "react";
import { css } from "../styles/theme.js";
import { UI } from "../constants/ui.js";
import { fmtLongDate, shiftDate } from "../utils/date.js";
import { useTracker } from "../context/TrackerContext.jsx";
import ActionPanel from "./ActionPanel.jsx";

export default function DateToolbar() {
  const { selectedDate, systemDate, setSelectedDate, onExport, onImport } = useTracker();
  const viewingToday = selectedDate === systemDate;
  const canGoForward = selectedDate < systemDate;

  return (
    <div style={css.dateWrap}>
      <div style={css.dateBar}>
        <button onClick={() => setSelectedDate(shiftDate(selectedDate, -1))} className="date-btn" style={css.dateBtn}>←</button>
        <div style={css.dateCenter}>
          <span style={css.dateMain}>{viewingToday ? "今天" : fmtLongDate(selectedDate)}</span>
          {viewingToday
            ? <span style={css.dateSub}>{fmtLongDate(selectedDate)}</span>
            : <span style={{...css.dateSub, color:UI.accentStrong}}>历史记录</span>
          }
        </div>
        <button onClick={() => canGoForward && setSelectedDate(shiftDate(selectedDate, 1))} disabled={!canGoForward} className="date-btn" style={canGoForward ? css.dateBtn : {...css.dateBtn, ...css.dateBtnDisabled}}>→</button>
      </div>
      <div style={css.dateMeta}>
        <input type="date" value={selectedDate} max={systemDate} onChange={(e) => e.target.value && setSelectedDate(e.target.value)} style={css.dateInput}/>
        {!viewingToday && <button onClick={() => setSelectedDate(systemDate)} className="today-btn" style={css.todayBtn}>回到今天</button>}
        <div style={{marginLeft:"auto"}}><ActionPanel onExport={onExport} onImport={onImport}/></div>
      </div>
    </div>
  );
}
