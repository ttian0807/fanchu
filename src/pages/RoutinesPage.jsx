import React, { useState } from "react";
import { UI } from "../constants/ui.js";
import { css } from "../styles/theme.js";
import { normalizeRoutines, normalizeRoutineChecks } from "../utils/normalize.js";
import { createRoutineDraft, addRoutine, saveRoutine, moveRoutine, deleteRoutine, toggleRoutineActive } from "../data/operations.js";

export default function RoutinesPage({ data, up, setView }) {
  const routines = normalizeRoutines(data?.routines || [])
    .slice()
    .sort((a, b) => (a.order || 0) - (b.order || 0));
  const [editingId, setEditingId] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [showAdd, setShowAdd] = useState(false);
  const [newDraft, setNewDraft] = useState(createRoutineDraft());
  const [notice, setNotice] = useState("");

  const beginEdit = (routine) => {
    setEditingId(routine.id);
    setDrafts((prev) => ({ ...prev, [routine.id]: createRoutineDraft(routine) }));
    setNotice("");
  };

  const cancelEdit = (routineId) => {
    setEditingId((prev) => (prev === routineId ? null : prev));
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[routineId];
      return next;
    });
  };

  const updateDraft = (routineId, updater) => {
    setDrafts((prev) => {
      const routine = routines.find((item) => item.id === routineId);
      const current = prev[routineId] || createRoutineDraft(routine);
      const nextValue = typeof updater === "function" ? updater(current) : updater;
      return { ...prev, [routineId]: nextValue };
    });
  };

  const updateNewDraft = (updater) => {
    setNewDraft((prev) => (typeof updater === "function" ? updater(prev) : updater));
  };

  const saveCurrentRoutine = (routine) => {
    const draft = drafts[routine.id];
    if (!draft) return;
    up(saveRoutine(data, routine.id, draft));
    cancelEdit(routine.id);
    setNotice(`已更新「${draft.name.trim() || routine.name}」。`);
  };

  const addNewRoutine = () => {
    if (!newDraft.name.trim()) {
      setNotice("先给 routine 起个名字会更顺。");
      return;
    }
    const nextData = addRoutine(data, newDraft);
    up(nextData);
    setShowAdd(false);
    setNewDraft(createRoutineDraft());
    setNotice(`已创建「${newDraft.name.trim()}」，它现在会出现在今日面板。`);
  };

  const toggleActive = (routine) => {
    up(toggleRoutineActive(data, routine.id, routine.active === false));
    setNotice(routine.active === false ? `已启用「${routine.name}」。` : `已停用「${routine.name}」，今日面板会先隐藏它。`);
  };

  const removeRoutine = (routine) => {
    up(deleteRoutine(data, routine.id));
    if (editingId === routine.id) cancelEdit(routine.id);
    setNotice(`已删除「${routine.name}」。历史记录仍会保留当天快照。`);
  };

  return (
    <div>
      <div style={css.typePageHead}>
        <div>
          <h2 style={css.typePageTitle}>Routine</h2>
          <p style={css.typePageSub}>这里管理 routine 模板。你在这里改名字、图标、颜色和输入提示，今日面板会自动跟着更新。</p>
        </div>
        <button onClick={() => { setShowAdd((prev) => !prev); setNotice(""); }} style={css.addPBtn}>+ 新 routine</button>
      </div>

      {notice && <div style={css.typeNotice}>{notice}</div>}

      {showAdd && (
        <div style={css.typeEditor}>
          <div style={css.typeEditorGrid}>
            <label style={css.fieldLabel}>
              <span>名字</span>
              <input value={newDraft.name} onChange={(e) => updateNewDraft((draft) => ({ ...draft, name: e.target.value }))} placeholder="比如：早晨拉伸" style={css.addInp}/>
            </label>
            <label style={css.fieldLabel}>
              <span>图标</span>
              <input value={newDraft.icon} onChange={(e) => updateNewDraft((draft) => ({ ...draft, icon: e.target.value }))} placeholder="🌿" style={css.addInp}/>
            </label>
          </div>
          <label style={css.fieldLabel}>
            <span>颜色</span>
            <div style={css.colorRow}>
              <input type="color" value={newDraft.color} onChange={(e) => updateNewDraft((draft) => ({ ...draft, color: e.target.value }))} style={css.colorInput}/>
              <input value={newDraft.color} onChange={(e) => updateNewDraft((draft) => ({ ...draft, color: e.target.value }))} style={css.addInp}/>
            </div>
          </label>
          <label style={css.fieldLabel}>
            <span>今日输入提示</span>
            <input value={newDraft.prompt} onChange={(e) => updateNewDraft((draft) => ({ ...draft, prompt: e.target.value }))} placeholder="比如：今天练了什么？" style={css.addInp}/>
          </label>
          <div style={css.routinePreview}>
            <span style={{ ...css.typeIcon, color:newDraft.color, borderColor:newDraft.color+"35" }}>{newDraft.icon}</span>
            <div>
              <p style={css.routinePreviewName}>{newDraft.name || "新的 routine"}</p>
              <p style={css.routinePreviewPrompt}>{newDraft.prompt || "今天做了什么？"}</p>
            </div>
          </div>
          <div style={css.typeEditorActions}>
            <button onClick={addNewRoutine} style={css.actionBtnStrong}>创建 routine</button>
            <button onClick={() => { setShowAdd(false); setNewDraft(createRoutineDraft()); }} style={css.actionBtn}>取消</button>
          </div>
        </div>
      )}

      <div style={css.typeCardList}>
        {routines.length === 0 ? (
          <div style={css.typeCard}>
            <p style={css.emptyText}>你还没有 routine。先建几个会每天重复出现的小动作，Today 页就会自动生成对应的卡片。</p>
            <button onClick={() => setShowAdd(true)} style={css.emptyCta}>现在创建</button>
          </div>
        ) : routines.map((routine, index) => {
          const editing = editingId === routine.id;
          const draft = drafts[routine.id] || createRoutineDraft(routine);
          const historyCount = normalizeRoutineChecks(data?.routineChecks || []).filter((check) => check.routineId === routine.id).length;

          return (
            <div key={routine.id} className="type-card" style={css.typeCard}>
              <div style={css.typeCardHead}>
                <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
                  <div className="type-icon" style={{ ...css.typeIcon, color:routine.color, borderColor:routine.color+"35" }}>{routine.icon}</div>
                  <div>
                    <div style={css.typeNameRow}>
                      <h3 style={css.typeName}>{routine.name}</h3>
                      {routine.active === false && <span style={css.typeInactive}>已停用</span>}
                    </div>
                    <p style={css.typeMeta}>排序 {index + 1} · 历史天数 {historyCount}</p>
                  </div>
                </div>
                <div style={css.typeHeadActions}>
                  <button onClick={() => setView("today")} className="btn-mini" style={css.miniBtn}>看今日面板</button>
                  <button onClick={() => editing ? cancelEdit(routine.id) : beginEdit(routine)} className="btn-mini" style={css.miniBtn}>{editing ? "收起" : "编辑"}</button>
                </div>
              </div>

              <p style={css.routinePreviewPrompt}>{routine.prompt}</p>

              <div style={css.typeHeadActions}>
                <button onClick={() => up(moveRoutine(data, routine.id, -1))} disabled={index === 0} className="btn-mini" style={index === 0 ? css.miniBtnDisabled : css.miniBtn}>上移</button>
                <button onClick={() => up(moveRoutine(data, routine.id, 1))} disabled={index === routines.length - 1} className="btn-mini" style={index === routines.length - 1 ? css.miniBtnDisabled : css.miniBtn}>下移</button>
                <button onClick={() => toggleActive(routine)} className="btn-mini" style={css.miniBtn}>{routine.active === false ? "启用" : "停用"}</button>
                <button onClick={() => removeRoutine(routine)} className="btn-mini" style={css.miniBtn}>删除</button>
              </div>

              {editing && (
                <div style={css.typeEditor}>
                  <div style={css.typeEditorGrid}>
                    <label style={css.fieldLabel}>
                      <span>名字</span>
                      <input value={draft.name} onChange={(e) => updateDraft(routine.id, (current) => ({ ...current, name: e.target.value }))} style={css.addInp}/>
                    </label>
                    <label style={css.fieldLabel}>
                      <span>图标</span>
                      <input value={draft.icon} onChange={(e) => updateDraft(routine.id, (current) => ({ ...current, icon: e.target.value }))} style={css.addInp}/>
                    </label>
                  </div>
                  <label style={css.fieldLabel}>
                    <span>颜色</span>
                    <div style={css.colorRow}>
                      <input type="color" value={draft.color} onChange={(e) => updateDraft(routine.id, (current) => ({ ...current, color: e.target.value }))} style={css.colorInput}/>
                      <input value={draft.color} onChange={(e) => updateDraft(routine.id, (current) => ({ ...current, color: e.target.value }))} style={css.addInp}/>
                    </div>
                  </label>
                  <label style={css.fieldLabel}>
                    <span>今日输入提示</span>
                    <input value={draft.prompt} onChange={(e) => updateDraft(routine.id, (current) => ({ ...current, prompt: e.target.value }))} style={css.addInp}/>
                  </label>
                  <div style={css.typeEditorActions}>
                    <button onClick={() => saveCurrentRoutine(routine)} style={css.actionBtnStrong}>保存修改</button>
                    <button onClick={() => cancelEdit(routine.id)} style={css.actionBtn}>取消</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
