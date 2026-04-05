import React from "react";
import { UI } from "../constants/ui.js";
import { LOGS, ROUTINE_LOG_KEYS } from "../constants/defaults.js";
import { css } from "../styles/theme.js";
import { useDesktopLayout } from "../hooks/useDesktopLayout.js";
import { getDailyNote, getProjectEntryRowsForDate, getTimelineItemsForDate } from "../data/operations.js";
import RoutineSection from "../components/RoutineSection.jsx";
import TimelineSidebar from "../components/TimelineSidebar.jsx";
import LogBox from "../components/LogBox.jsx";

export default function TodayPage({ data, up, today, systemDate, setView, setExpanded }) {
  const isDesktop = useDesktopLayout();
  const dailyNote = getDailyNote(data, today);
  const ref = dailyNote.reflection || "";
  const viewingToday = today === systemDate;
  const pEntries = getProjectEntryRowsForDate(data, today);
  const timelineItems = getTimelineItemsForDate(data, today);
  const miscLogConfigs = Object.entries(LOGS).filter(([key]) => !ROUTINE_LOG_KEYS.includes(key));

  return (
    <div>
      {isDesktop ? (
        <div style={css.todayLayout}>
          <div style={css.todayMain}>
            <RoutineSection data={data} up={up} today={today} viewingToday={viewingToday} setView={setView} compact />

            <div style={css.sec}>
              <h3 style={css.secT}>这一天的感受</h3>
              <textarea value={ref} onChange={e => up({
                ...data,
                dailyNotes: {
                  ...data.dailyNotes,
                  [today]: {
                    ...dailyNote,
                    reflection: e.target.value,
                  },
                },
              })}
                placeholder={"这一天感觉怎么样？做了什么让你开心或者烦躁的事？随便写多少..."}
                style={css.refBox}/>
            </div>
          </div>

          <div style={css.todaySide}>
            <TimelineSidebar data={data} up={up} today={today} viewingToday={viewingToday} items={timelineItems} setView={setView} setExpanded={setExpanded}/>

          </div>
        </div>
      ) : (
        <>
          <RoutineSection data={data} up={up} today={today} viewingToday={viewingToday} setView={setView}/>

          {pEntries.length > 0 && (
            <div style={css.sec}>
              <h3 style={css.secT}>当日项目记录</h3>
              {pEntries.map(e => (
                <div key={e.id} style={{...css.tEntry, borderLeftColor:e.dc}}>
                  <div style={css.tEntryHead}>
                    <span style={{fontSize:"13px"}}>{e.di}</span>
                    <span style={{fontSize:"11px",fontWeight:600,color:e.dc}}>{e.dl}</span>
                    <span style={{fontSize:"12px",color:UI.inkMute}}>{e.pn}</span>
                    <span style={css.tStage}>{e.ps}</span>
                  </div>
                  <p style={{fontSize:"14px",color:UI.inkSoft,margin:0,lineHeight:1.7,whiteSpace:"pre-wrap"}}>{e.text}</p>
                </div>
              ))}
            </div>
          )}

          <div style={css.sec}>
            <h3 style={css.secT}>日志</h3>
            {miscLogConfigs.map(([k,c]) => <LogBox key={k} lk={k} cfg={c} data={data} up={up} today={today}/>)}
          </div>

          <div style={css.sec}>
            <h3 style={css.secT}>这一天的感受</h3>
            <textarea value={ref} onChange={e => up({
              ...data,
              dailyNotes: {
                ...data.dailyNotes,
                [today]: {
                  ...dailyNote,
                  reflection: e.target.value,
                },
              },
            })}
              placeholder={"这一天感觉怎么样？做了什么让你开心或者烦躁的事？随便写多少..."}
              style={css.refBox}/>
          </div>

        </>
      )}
    </div>
  );
}
