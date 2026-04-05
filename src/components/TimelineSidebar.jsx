import React, { useState } from "react";
import { css } from "../styles/theme.js";
import { fmtClock } from "../utils/date.js";
import { getTimelineSections, getLogStore } from "../data/operations.js";
import MiscQuickAdd from "./MiscQuickAdd.jsx";
import MiscDetailPanel from "./MiscDetailPanel.jsx";

export default function TimelineSidebar({ data, up, today, viewingToday, items, setView, setExpanded }) {
  const sections = getTimelineSections(items);
  const [activeItem, setActiveItem] = useState(null);

  const openTimelineItem = (item) => {
    if (item.miscId) {
      setActiveItem(item);
      return;
    }
    if (!item?.targetView || !item?.projectId) return;
    setExpanded(item.projectId);
    setView(item.targetView);
  };

  const saveMisc = ({ text, ts }) => {
    if (!activeItem?.miscId) return;
    const logStore = getLogStore(data);
    const nextMisc = (logStore.misc || []).map((entry) =>
      entry.id === activeItem.miscId ? { ...entry, text, ts } : entry,
    );
    up({
      ...data,
      legacy: {
        ...(data.legacy || {}),
        logs: { ...logStore, misc: nextMisc },
      },
    });
    setActiveItem(null);
  };

  const deleteMisc = () => {
    if (!activeItem?.miscId) return;
    const logStore = getLogStore(data);
    const nextMisc = (logStore.misc || []).filter((entry) => entry.id !== activeItem.miscId);
    up({
      ...data,
      legacy: {
        ...(data.legacy || {}),
        logs: { ...logStore, misc: nextMisc },
      },
    });
    setActiveItem(null);
  };

  return (
    <div style={css.timelineCard}>
      <div style={css.timelineHead}>
        <div>
          <h3 style={css.secT}>{viewingToday ? "今日时间轴" : "这一天的时间轴"}</h3>
          <p style={css.timelineSub}>把 routine、项目推进和杂项记录放在一起看，会更像一天真正发生了什么。</p>
        </div>
        <span style={css.cnt}>{items.length}</span>
      </div>

      <MiscQuickAdd data={data} up={up} today={today}/>

      {items.length === 0 ? (
        <div style={css.routineEmpty}>
          <p style={css.emptyText}>这一天的时间轴还是空的。你做的 routine、项目动作和杂项记录，都会自动长到这里。</p>
        </div>
      ) : (
        <div style={css.timelineScroll}>
          <div style={css.timelineList}>
            {sections.map((section) => (
              <div key={section.key} style={css.timelineGroup}>
                <div style={css.timelineGroupHead}>
                  <span style={css.timelineGroupLabel}>{section.label}</span>
                  <span style={css.cnt}>{section.items.length}</span>
                </div>

                {section.items.map((item) => {
                  const isClickable = !!item.targetView || !!item.miscId;

                  return (
                    <div
                      key={item.id}
                      onClick={() => openTimelineItem(item)}
                      className={isClickable ? "timeline-row interactive" : "timeline-row"}
                      style={isClickable ? { ...css.timelineItem, ...css.timelineItemInteractive } : css.timelineItem}
                    >
                      <div style={{...css.timelineDot, background:item.color}}>{item.icon}</div>
                      <div style={css.timelineBody}>
                        <div style={css.timelineMeta}>
                          <div style={css.timelineMetaMain}>
                            <span style={{...css.timelineTitle, color:item.color}}>{item.title}</span>
                            <span style={css.timelineTag}>{item.tag}</span>
                          </div>
                          <span style={css.timelineTime}>{fmtClock(item.ts)}</span>
                        </div>
                        <p style={css.timelineTextCompact}>{item.text}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeItem && (
        <MiscDetailPanel
          item={activeItem}
          onSave={saveMisc}
          onDelete={deleteMisc}
          onClose={() => setActiveItem(null)}
        />
      )}
    </div>
  );
}
