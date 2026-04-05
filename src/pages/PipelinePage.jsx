import React, { useState, useEffect } from "react";
import { UI } from "../constants/ui.js";
import { css } from "../styles/theme.js";
import { uid } from "../utils/id.js";
import { fmtDate, fmtLongDate } from "../utils/date.js";
import { normalizeEntryNotes, getStageId, getStageName, collapseEntryItems, getStageEntryText } from "../utils/normalize.js";
import { getProjectTypeConfig, getProjectsForTypeId, createProjectWithInitialEntry, getLatestStageEntryForProjectDay } from "../data/operations.js";
import PCard from "../components/ProjectCard.jsx";

export default function Pipeline({ typeId, data, up, today, systemDate, expanded, setExpanded }) {
  const cfg = getProjectTypeConfig(data, typeId) || {
    typeId: null,
    legacyKey: null,
    label: "项目",
    icon: "📁",
    stages: ["待办"],
    color: UI.accent,
    projectType: null,
  };
  const projects = cfg.typeId ? getProjectsForTypeId(data, cfg.typeId) : [];
  const [showAdd, setShowAdd] = useState(false);
  const [nn, setNn] = useState("");
  const [ns, setNs] = useState(cfg.stages[0]);
  const [archivedRenameId, setArchivedRenameId] = useState("");
  const [archivedRenameDraft, setArchivedRenameDraft] = useState("");
  const viewingToday = today === systemDate;
  const projectItems = data.projectItems || [];
  const entryItems = data.entryItems || [];

  useEffect(() => {
    setShowAdd(false);
    setNn("");
    setNs(cfg.stages[0]);
    setArchivedRenameId("");
    setArchivedRenameDraft("");
  }, [typeId]);

  const addP = () => {
    if (!nn.trim() || !cfg.projectType) return;
    const nextData = createProjectWithInitialEntry(data, {
      typeId: cfg.projectType.id,
      name: nn,
      stageName: ns,
      date: today,
    });
    const createdProject = nextData.projectItems?.[nextData.projectItems.length - 1];
    up(nextData);
    setNn("");
    setShowAdd(false);
    if (createdProject) setExpanded(createdProject.id);
  };
  const upP = (pid, ch) => {
    const all = projectItems.map((project) => {
      if (project.id !== pid) return project;
      return {
        ...project,
        ...ch,
        ...(Object.prototype.hasOwnProperty.call(ch, "stage") && cfg.projectType
          ? { currentStageId: getStageId(cfg.projectType, ch.stage) }
          : {}),
      };
    });
    up({...data, projectItems:all});
  };
  const changeStage = (pid, nextStage) => {
    if (!cfg.projectType) return;
    const stageId = getStageId(cfg.projectType, nextStage);
    const currentProject = projectItems.find((project) => project.id === pid);
    if (!currentProject || currentProject.currentStageId === stageId) return;
    const existingStageEntry = getLatestStageEntryForProjectDay(entryItems, pid, today);
    const allProjects = projectItems.map((project) => {
      if (project.id !== pid) return project;
      return { ...project, currentStageId: stageId };
    });
    const allEntries = collapseEntryItems([
      ...entryItems.filter((entry) => !(entry.projectId === pid && entry.date === today && entry.kind === "stage_change")),
      {
        id: uid(),
        date: today,
        text: getStageEntryText(cfg.legacyKey, nextStage),
        createdAt: new Date().toISOString(),
        kind: "stage_change",
        stageId,
        auto: true,
        projectId: pid,
        notes: normalizeEntryNotes(existingStageEntry?.notes, existingStageEntry?.id || `entry_${pid}`, today),
      },
    ]);
    up({...data, projectItems:allProjects, entryItems:allEntries});
  };
  const addE = (pid, text) => {
    const currentStageEntry = getLatestStageEntryForProjectDay(entryItems, pid, today);
    const createdAt = new Date().toISOString();
    const all = currentStageEntry
      ? collapseEntryItems(
          entryItems.map((entry) => (
            entry.id !== currentStageEntry.id
              ? entry
              : {
                  ...entry,
                  notes: [
                    ...normalizeEntryNotes(entry.notes, entry.id, entry.date),
                    { id: `project_note_${uid()}`, text, createdAt },
                  ],
                }
          )),
        )
      : collapseEntryItems([
          ...entryItems,
          { id: uid(), date: today, text, createdAt, kind: "manual", stageId: null, auto: false, projectId: pid },
        ]);
    up({...data, entryItems:all});
  };
  const rmE = (pid, eid, noteId = "") => {
    if (noteId) {
      const all = collapseEntryItems(entryItems.map((entry) => {
        if (!(entry.projectId === pid && entry.id === eid)) return entry;
        return { ...entry, notes: normalizeEntryNotes(entry.notes, entry.id, entry.date).filter((note) => note.id !== noteId) };
      }));
      up({...data, entryItems:all});
      return;
    }
    up({...data, entryItems:entryItems.filter((entry) => !(entry.projectId === pid && entry.id === eid))});
  };
  const rmP = pid => {
    up({
      ...data,
      projectItems: projectItems.filter((project) => project.id !== pid),
      entryItems: entryItems.filter((entry) => entry.projectId !== pid),
    });
    if(expanded===pid) setExpanded(null);
  };
  const beginArchivedRename = (project) => {
    setArchivedRenameId(project.id);
    setArchivedRenameDraft(project.name);
  };
  const cancelArchivedRename = () => {
    setArchivedRenameId("");
    setArchivedRenameDraft("");
  };
  const saveArchivedRename = (projectId) => {
    const nextName = archivedRenameDraft.trim();
    if (!nextName) return;
    upP(projectId, { name: nextName });
    cancelArchivedRename();
  };

  const active = projects.filter(p=>!p.archived);
  const archived = projects.filter(p=>p.archived);
  const hasAnyProject = projects.length > 0;
  const byStage = {};
  cfg.stages.forEach(s=>{byStage[s]=[];});
  active.forEach(p => { (byStage[p.stage]||byStage[cfg.stages[0]]).push(p); });

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"20px"}}>
        <div>
          <h2 style={{fontSize:"18px",fontWeight:700,margin:"0 0 4px",color:cfg.color,display:"flex",alignItems:"center",gap:"10px"}}>
            <span style={{fontSize:"22px"}}>{cfg.icon}</span>{cfg.label}
          </h2>
          <p style={css.pipelineDate}>{viewingToday ? "正在查看今天" : `正在查看 ${fmtLongDate(today)}`}</p>
        </div>
        <button onClick={()=>setShowAdd(!showAdd)} className="add-btn" style={{...css.addPBtn,borderColor:cfg.color+"60",color:cfg.color}}>+ 新项目</button>
      </div>

      {!hasAnyProject && (
        <div style={{...css.emptyState, borderColor:cfg.color+"26", background:`linear-gradient(180deg, ${cfg.color}12 0%, rgba(255,250,244,0.94) 100%)`}}>
          <div style={{fontSize:"22px"}}>{cfg.icon}</div>
          <h3 style={{...css.emptyTitle, color:cfg.color}}>{cfg.label} 里还没有项目</h3>
          <p style={css.emptyText}>先点右上角的 `+ 新项目`，创建一个具体项目后，阶段切换和当日记录才会真正保存到本地文件。</p>
          {!showAdd && (
            <button onClick={()=>setShowAdd(true)} style={{...css.emptyCta, borderColor:cfg.color+"55", color:cfg.color}}>现在创建</button>
          )}
        </div>
      )}

      {showAdd && (
        <div style={css.addForm}>
          <input value={nn} onChange={e=>setNn(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addP()}
            placeholder={cfg.legacyKey==="job"?"公司/岗位名称":"项目名称"} style={css.addInp} autoFocus/>
          <div style={{display:"flex",gap:"6px",flexWrap:"wrap"}}>
            {cfg.stages.map(s => (
              <button key={s} onClick={()=>setNs(s)}
                style={ns===s ? {...css.pill,background:cfg.color+"25",borderColor:cfg.color+"50",color:cfg.color} : css.pill}>{s}</button>
            ))}
          </div>
          <div style={{display:"flex",gap:"8px"}}>
            <button onClick={addP} style={{...css.cfmBtn,background:cfg.color+"20",borderColor:cfg.color+"40",color:cfg.color}}>添加</button>
            <button onClick={()=>setShowAdd(false)} style={css.canBtn}>取消</button>
          </div>
        </div>
      )}

      {cfg.stages.map(stage => {
        const sp = byStage[stage];
        return (
          <div key={stage} style={{marginBottom:"18px"}}>
            <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"8px"}}>
              <span style={{fontSize:"13px",fontWeight:600,color:cfg.color}}>{stage}</span>
              <span style={css.cnt}>{sp.length}</span>
            </div>
            {sp.map(p => (
              <PCard key={p.id} p={p} cfg={cfg} exp={expanded===p.id}
                onTog={()=>setExpanded(expanded===p.id?null:p.id)}
                upP={upP} changeStage={changeStage} addE={addE} rmE={rmE} rmP={rmP} today={today}/>
            ))}
            {sp.length===0 && <p style={{fontSize:"12px",color:UI.inkMute,margin:"4px 0",fontStyle:"italic"}}>暂无项目</p>}
          </div>
        );
      })}

      {archived.length > 0 && (
        <div style={{marginTop:"30px",padding:"18px",background:"linear-gradient(180deg, rgba(255,250,244,0.92) 0%, rgba(247,236,223,0.9) 100%)",border:"1px solid "+UI.lineSoft,borderRadius:"18px",boxShadow:UI.shadowSoft}}>
          <h4 style={{fontSize:"13px",color:UI.inkMute,margin:"0 0 10px"}}>已归档 ({archived.length})</h4>
          {archived.map(p => (
            <div key={p.id} style={{display:"flex",alignItems:"center",gap:"8px",padding:"6px 0",borderBottom:"1px solid "+UI.lineSoft}}>
              {archivedRenameId === p.id ? (
                <div style={css.archivedRenameWrap}>
                  <input
                    value={archivedRenameDraft}
                    onChange={(e) => setArchivedRenameDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.nativeEvent.isComposing) return;
                      if (e.key === "Enter") saveArchivedRename(p.id);
                      if (e.key === "Escape") cancelArchivedRename();
                    }}
                    style={css.archivedRenameInp}
                    autoFocus
                  />
                  <button onClick={() => saveArchivedRename(p.id)} style={css.aBtn}>保存</button>
                  <button onClick={cancelArchivedRename} style={css.aBtn}>取消</button>
                </div>
              ) : (
                <span style={{fontSize:"13px",color:UI.inkSoft,flex:1}}>{p.name}</span>
              )}
              <span style={{fontSize:"11px",color:UI.inkMute}}>{p.stage}</span>
              {archivedRenameId !== p.id && <button onClick={() => beginArchivedRename(p)} style={{background:"none",border:"none",color:UI.inkMute,fontSize:"11px",cursor:"pointer"}}>重命名</button>}
              <button onClick={()=>upP(p.id,{archived:false})} style={{background:"none",border:"none",color:UI.accentStrong,fontSize:"11px",cursor:"pointer"}}>恢复</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
