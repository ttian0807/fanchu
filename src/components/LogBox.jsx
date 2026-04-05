import React, { useState } from "react";
import { UI } from "../constants/ui.js";
import { css } from "../styles/theme.js";
import { uid } from "../utils/id.js";
import { getLogStore } from "../data/operations.js";

export default function LogBox({ lk, cfg, data, up, today }) {
  const [inp, setInp] = useState("");
  const logStore = getLogStore(data);
  const entries = (logStore[lk]||[]).filter(e => e.date===today);
  const add = () => {
    if (!inp.trim()) return;
    const all = [...(logStore[lk]||[]), {id:uid(),date:today,text:inp.trim(),ts:Date.now()}];
    up({
      ...data,
      legacy: {
        ...(data.legacy || {}),
        logs: { ...logStore, [lk]: all },
      },
    });
    setInp("");
  };
  const rm = id => {
    const f = (logStore[lk]||[]).filter(e=>e.id!==id);
    up({
      ...data,
      legacy: {
        ...(data.legacy || {}),
        logs: { ...logStore, [lk]: f },
      },
    });
  };
  return (
    <div style={{...css.logW, borderLeftColor:cfg.color}}>
      <div style={css.logH}>
        <span style={{fontSize:"16px"}}>{cfg.icon}</span>
        <span style={{fontSize:"14px",fontWeight:600,color:UI.ink}}>{cfg.label}</span>
        {entries.length>0 && <span style={css.logC}>{entries.length}条</span>}
      </div>
      {entries.map(e => (
        <div key={e.id} style={css.logE}>
          <p style={{fontSize:"13px",color:UI.inkSoft,margin:0,flex:1,lineHeight:1.6}}>{e.text}</p>
          <button onClick={()=>rm(e.id)} style={css.xBtn}>{"×"}</button>
        </div>
      ))}
      <div style={{display:"flex",gap:"6px",marginTop:"6px"}}>
        <input value={inp} onChange={e=>setInp(e.target.value)} onKeyDown={e=>{ if (e.nativeEvent.isComposing) return; if (e.key==="Enter") add(); }}
          placeholder={lk==="fitness"?"这一天练了什么？":lk==="news"?"这一天看到了什么？你怎么想？":"记录这一天..."}
          style={css.inp}/>
        <button onClick={add} style={css.addB}>+</button>
      </div>
    </div>
  );
}
