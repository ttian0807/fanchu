import React, { useState, useEffect, useRef } from "react";
import { UI } from "../constants/ui.js";
import { css } from "../styles/theme.js";
import { fmtDate } from "../utils/date.js";
import { useAutoGrowTextArea } from "../hooks/useAutoGrowTextArea.js";
import { getVisibleProjectEntries } from "../utils/normalize.js";

export default function PCard({ p, cfg, exp, onTog, upP, changeStage, addE, rmE, rmP, today }) {
  const [inp, setInp] = useState("");
  const [cfmDel, setCfmDel] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState(p.name);
  const iRef = useRef(null);
  const nameRef = useRef(null);
  useAutoGrowTextArea(iRef, inp, 56);
  const visibleEntries = getVisibleProjectEntries(p.entries || []);
  const tE = visibleEntries.filter(e=>e.date===today);
  const pE = visibleEntries.filter(e=>e.date!==today);

  const add = () => { if(!inp.trim()) return; addE(p.id, inp.trim()); setInp(""); };
  useEffect(()=>{if(exp&&iRef.current)iRef.current.focus();},[exp]);
  useEffect(() => {
    if (!renaming) setNameDraft(p.name);
  }, [p.name, renaming]);
  useEffect(() => {
    if (renaming && nameRef.current) {
      nameRef.current.focus();
      nameRef.current.select();
    }
  }, [renaming]);
  const saveRename = () => {
    const nextName = nameDraft.trim();
    if (!nextName) return;
    upP(p.id, { name: nextName });
    setRenaming(false);
  };
  const cancelRename = () => {
    setNameDraft(p.name);
    setRenaming(false);
  };

  const byDate = {};
  pE.forEach(e => { if(!byDate[e.date]) byDate[e.date]=[]; byDate[e.date].push(e); });
  const dates = Object.keys(byDate).sort().reverse().slice(0,10);

  return (
    <div className="project-card" style={{background:"linear-gradient(180deg, rgba(255,250,244,0.94) 0%, rgba(247,236,223,0.92) 100%)",border:"1px solid "+UI.lineSoft,borderRadius:"16px",marginBottom:"10px",overflow:"hidden",boxShadow:"0 4px 16px rgba(165, 128, 95, 0.06)",borderLeft:"3px solid "+cfg.color}}>
      <div onClick={onTog} style={{padding:"12px 14px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:"14px",fontWeight:600,color:UI.ink}}>{p.name}</span>
        <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
          {tE.length>0 && <span style={css.tBadge}>当日{tE.length}条</span>}
          <span style={{fontSize:"10px",color:UI.inkMute}}>{exp?"▲":"▼"}</span>
        </div>
      </div>
      {exp && (
        <div style={{padding:"0 14px 14px"}}>
          {renaming && (
            <div style={css.renameBlock}>
              <span style={css.renameLabel}>项目名</span>
              <div style={css.renameRow}>
                <input
                  ref={nameRef}
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.nativeEvent.isComposing) return;
                    if (e.key === "Enter") saveRename();
                    if (e.key === "Escape") cancelRename();
                  }}
                  style={css.renameInp}
                />
                <button onClick={saveRename} style={css.aBtn}>保存</button>
                <button onClick={cancelRename} style={css.aBtn}>取消</button>
              </div>
            </div>
          )}
          <div style={{display:"flex",alignItems:"center",gap:"6px",marginBottom:"12px",flexWrap:"wrap"}}>
            <span style={{fontSize:"12px",color:UI.inkMute}}>阶段：</span>
            {cfg.stages.map(s => (
              <button key={s} onClick={()=>changeStage(p.id,s)}
                style={p.stage===s?{...css.pillSm,background:cfg.color+"25",borderColor:cfg.color+"50",color:cfg.color}:css.pillSm}>{s}</button>
            ))}
          </div>
          <div style={{...css.multiInputRow, marginBottom:"12px"}}>
            <textarea
              ref={iRef}
              value={inp}
              onChange={e=>setInp(e.target.value)}
              onKeyDown={(e) => {
                if (e.nativeEvent.isComposing) return;
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  add();
                }
              }}
              placeholder={"补充这个动作的备注..."}
              style={css.multiInp}
            />
            <button onClick={add} style={{...css.addB,background:cfg.color+"20",color:cfg.color}}>+</button>
          </div>
          {tE.length>0 && <div style={{marginBottom:"8px"}}>
            <span style={css.dLabel}>当日</span>
            {tE.map(e => (
              <div key={e.id} style={css.projectEntryBlock}>
                <div style={css.eRow}>
                  <span style={{color:cfg.color,fontSize:"12px"}}>{"•"}</span>
                  <span style={{fontSize:"13px",color:UI.inkSoft,flex:1,lineHeight:1.6,whiteSpace:"pre-wrap"}}>{e.text}</span>
                  <button onClick={()=>rmE(p.id,e.id)} style={css.xBtn}>{"×"}</button>
                </div>
                {Array.isArray(e.notes) && e.notes.length > 0 && (
                  <div style={css.projectNoteList}>
                    {e.notes.map((note) => (
                      <div key={note.id} style={css.projectNoteRow}>
                        <span style={css.projectNoteDot}>↳</span>
                        <span style={{...css.projectNoteText,whiteSpace:"pre-wrap"}}>{note.text}</span>
                        <button onClick={()=>rmE(p.id,e.id,note.id)} style={css.xBtn}>{"×"}</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>}
          {dates.length>0 && <div style={{borderTop:"1px solid "+UI.lineSoft,paddingTop:"8px",marginTop:"4px"}}>
            <span style={{...css.dLabel,color:UI.inkMute}}>历史记录</span>
            {dates.map(d => (
              <div key={d}>
                <span style={{fontSize:"10px",color:UI.inkMute,fontFamily:"'JetBrains Mono',monospace",display:"block",marginTop:"6px"}}>{fmtDate(d)}</span>
                {byDate[d].map(e => (
                  <div key={e.id} style={css.projectEntryBlock}>
                    <div style={css.eRow}>
                      <span style={{color:UI.inkFaint,fontSize:"12px"}}>{"•"}</span>
                      <span style={{fontSize:"13px",color:UI.inkMute,flex:1,lineHeight:1.6,whiteSpace:"pre-wrap"}}>{e.text}</span>
                      <button onClick={()=>rmE(p.id,e.id)} style={css.xBtn}>{"×"}</button>
                    </div>
                    {Array.isArray(e.notes) && e.notes.length > 0 && (
                      <div style={css.projectNoteList}>
                        {e.notes.map((note) => (
                          <div key={note.id} style={css.projectNoteRow}>
                            <span style={css.projectNoteDot}>↳</span>
                            <span style={{...css.projectNoteText,color:UI.inkMute,whiteSpace:"pre-wrap"}}>{note.text}</span>
                            <button onClick={()=>rmE(p.id,e.id,note.id)} style={css.xBtn}>{"×"}</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>}
          <div style={{display:"flex",gap:"8px",marginTop:"12px",borderTop:"1px solid "+UI.lineSoft,paddingTop:"10px"}}>
            {!renaming && <button onClick={() => { setRenaming(true); setCfmDel(false); }} style={css.aBtn}>重命名</button>}
            <button onClick={()=>upP(p.id,{archived:true})} style={css.aBtn}>归档</button>
            {!cfmDel
              ? <button onClick={()=>setCfmDel(true)} style={css.aBtn}>删除</button>
              : <span style={{display:"flex",alignItems:"center",gap:"6px"}}>
                  <span style={{fontSize:"12px",color:UI.danger}}>确定？</span>
                  <button onClick={()=>rmP(p.id)} style={{...css.aBtn,color:UI.danger}}>是</button>
                  <button onClick={()=>setCfmDel(false)} style={css.aBtn}>否</button>
                </span>
            }
          </div>
        </div>
      )}
    </div>
  );
}
