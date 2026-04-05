import React, { useState } from "react";
import { UI } from "../constants/ui.js";
import { css } from "../styles/theme.js";
import { uid } from "../utils/id.js";
import { withSequentialTypeOrder } from "../utils/normalize.js";
import { getProjectTypes, getTypeProjectCount, getStageUsageCount, createTypeDraft, normalizeTypeDraft } from "../data/operations.js";

export default function ProjectTypesPage({ data, up, setView }) {
  const types = getProjectTypes(data, { includeInactive: true });
  const [editingId, setEditingId] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [showAdd, setShowAdd] = useState(false);
  const [newDraft, setNewDraft] = useState(createTypeDraft());
  const [notice, setNotice] = useState("");

  const beginEdit = (type) => {
    setEditingId(type.id);
    setDrafts((prev) => ({ ...prev, [type.id]: createTypeDraft(type) }));
    setNotice("");
  };

  const cancelEdit = (typeId) => {
    setEditingId((prev) => (prev === typeId ? null : prev));
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[typeId];
      return next;
    });
  };

  const updateDraft = (typeId, updater) => {
    setDrafts((prev) => {
      const current = prev[typeId] || createTypeDraft(types.find((type) => type.id === typeId));
      const nextValue = typeof updater === "function" ? updater(current) : updater;
      return { ...prev, [typeId]: nextValue };
    });
  };

  const updateNewDraft = (updater) => {
    setNewDraft((prev) => (typeof updater === "function" ? updater(prev) : updater));
  };

  const addStageToDraft = (typeId) => {
    updateDraft(typeId, (draft) => ({
      ...draft,
      stages: [...draft.stages, { id: `stage_${uid()}`, name: `阶段 ${draft.stages.length + 1}` }],
    }));
  };

  const addStageToNewDraft = () => {
    updateNewDraft((draft) => ({
      ...draft,
      stages: [...draft.stages, { id: `stage_${uid()}`, name: `阶段 ${draft.stages.length + 1}` }],
    }));
  };

  const moveStage = (typeId, stageIndex, direction) => {
    updateDraft(typeId, (draft) => {
      const targetIndex = stageIndex + direction;
      if (targetIndex < 0 || targetIndex >= draft.stages.length) return draft;
      const stages = draft.stages.slice();
      const [stage] = stages.splice(stageIndex, 1);
      stages.splice(targetIndex, 0, stage);
      return { ...draft, stages };
    });
  };

  const moveNewStage = (stageIndex, direction) => {
    updateNewDraft((draft) => {
      const targetIndex = stageIndex + direction;
      if (targetIndex < 0 || targetIndex >= draft.stages.length) return draft;
      const stages = draft.stages.slice();
      const [stage] = stages.splice(stageIndex, 1);
      stages.splice(targetIndex, 0, stage);
      return { ...draft, stages };
    });
  };

  const removeStageFromDraft = (type, stageId) => {
    const draft = drafts[type.id] || createTypeDraft(type);
    if (draft.stages.length <= 1) {
      setNotice("每个项目类型至少要保留一个阶段。");
      return;
    }
    if (getStageUsageCount(data, type.id, stageId) > 0) {
      setNotice("这个阶段已经被项目或历史记录使用了，暂时不能删除。");
      return;
    }
    updateDraft(type.id, {
      ...draft,
      stages: draft.stages.filter((stage) => stage.id !== stageId),
    });
    setNotice("");
  };

  const removeStageFromNewDraft = (stageId) => {
    if (newDraft.stages.length <= 1) {
      setNotice("每个项目类型至少要保留一个阶段。");
      return;
    }
    updateNewDraft((draft) => ({
      ...draft,
      stages: draft.stages.filter((stage) => stage.id !== stageId),
    }));
    setNotice("");
  };

  const saveType = (type) => {
    const draft = drafts[type.id];
    if (!draft) return;
    const normalizedType = normalizeTypeDraft(draft, type, type.order);
    const nextTypes = withSequentialTypeOrder(
      (data.projectTypes || []).map((item) => (item.id === type.id ? normalizedType : item)),
    );
    up({ ...data, projectTypes: nextTypes });
    cancelEdit(type.id);
    setNotice("项目类型已更新。");
  };

  const addType = () => {
    const normalizedType = normalizeTypeDraft(newDraft, null, types.length + 1);
    const nextTypes = withSequentialTypeOrder([...(data.projectTypes || []), normalizedType]);
    up({ ...data, projectTypes: nextTypes });
    setShowAdd(false);
    setNewDraft(createTypeDraft());
    setView(`type:${normalizedType.id}`);
    setNotice(`已创建「${normalizedType.name}」。`);
  };

  const toggleTypeActive = (type) => {
    const nextTypes = (data.projectTypes || []).map((item) => (
      item.id === type.id ? { ...item, active: item.active === false } : item
    ));
    up({ ...data, projectTypes: nextTypes });
    setNotice(type.active === false ? `已启用「${type.name}」。` : `已停用「${type.name}」。`);
  };

  const deleteType = (type) => {
    if (type.legacyKey) {
      setNotice("默认类型先不删，避免影响当前导航和已有习惯。");
      return;
    }
    if (getTypeProjectCount(data, type.id) > 0) {
      setNotice("这个类型下面还有项目，先处理项目再删除会更稳。");
      return;
    }
    const nextTypes = withSequentialTypeOrder((data.projectTypes || []).filter((item) => item.id !== type.id));
    up({ ...data, projectTypes: nextTypes });
    if (editingId === type.id) cancelEdit(type.id);
    setNotice(`已删除「${type.name}」。`);
  };

  return (
    <div>
      <div style={css.typePageHead}>
        <div>
          <h2 style={css.typePageTitle}>项目类型</h2>
          <p style={css.typePageSub}>这里定义你的项目模板。名字、图标、颜色和阶段顺序都可以改。</p>
        </div>
        <button onClick={() => { setShowAdd((prev) => !prev); setNotice(""); }} className="add-btn" style={css.addPBtn}>+ 新类型</button>
      </div>

      {notice && <div style={css.typeNotice}>{notice}</div>}

      {showAdd && (
        <div style={css.typeEditor}>
          <div style={css.typeEditorGrid}>
            <label style={css.fieldLabel}>
              <span>类型名</span>
              <input value={newDraft.name} onChange={(e) => updateNewDraft((draft) => ({ ...draft, name: e.target.value }))} placeholder="比如：副业项目" style={css.addInp}/>
            </label>
            <label style={css.fieldLabel}>
              <span>图标</span>
              <input value={newDraft.icon} onChange={(e) => updateNewDraft((draft) => ({ ...draft, icon: e.target.value }))} placeholder="🌱" style={css.addInp}/>
            </label>
          </div>
          <label style={css.fieldLabel}>
            <span>颜色</span>
            <div style={css.colorRow}>
              <input type="color" value={newDraft.color} onChange={(e) => updateNewDraft((draft) => ({ ...draft, color: e.target.value }))} style={css.colorInput}/>
              <input value={newDraft.color} onChange={(e) => updateNewDraft((draft) => ({ ...draft, color: e.target.value }))} style={css.addInp}/>
            </div>
          </label>
          <div>
            <div style={css.typeSectionHead}>
              <span style={css.fieldSectionTitle}>阶段</span>
              <button onClick={addStageToNewDraft} style={css.miniBtn}>+ 加阶段</button>
            </div>
            {newDraft.stages.map((stage, index) => (
              <div key={stage.id} style={css.stageEditorRow}>
                <input value={stage.name} onChange={(e) => updateNewDraft((draft) => ({
                  ...draft,
                  stages: draft.stages.map((item) => item.id === stage.id ? { ...item, name: e.target.value } : item),
                }))} style={css.addInp}/>
                <div style={css.stageEditorActions}>
                  <button onClick={() => moveNewStage(index, -1)} disabled={index === 0} style={index === 0 ? css.miniBtnDisabled : css.miniBtn}>↑</button>
                  <button onClick={() => moveNewStage(index, 1)} disabled={index === newDraft.stages.length - 1} style={index === newDraft.stages.length - 1 ? css.miniBtnDisabled : css.miniBtn}>↓</button>
                  <button onClick={() => removeStageFromNewDraft(stage.id)} style={css.miniBtn}>删</button>
                </div>
              </div>
            ))}
          </div>
          <div style={css.typeEditorActions}>
            <button onClick={addType} style={css.actionBtnStrong}>创建类型</button>
            <button onClick={() => { setShowAdd(false); setNewDraft(createTypeDraft()); }} style={css.actionBtn}>取消</button>
          </div>
        </div>
      )}

      <div style={css.typeCardList}>
        {types.map((type) => {
          const projectCount = getTypeProjectCount(data, type.id);
          const editing = editingId === type.id;
          const draft = drafts[type.id] || createTypeDraft(type);

          return (
            <div key={type.id} className="type-card" style={css.typeCard}>
              <div style={css.typeCardHead}>
                <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
                  <div className="type-icon" style={{ ...css.typeIcon, color:type.color, borderColor:type.color+"35" }}>{type.icon}</div>
                  <div>
                    <div style={css.typeNameRow}>
                      <h3 style={css.typeName}>{type.name}</h3>
                      {type.active === false && <span style={css.typeInactive}>已停用</span>}
                    </div>
                    <p style={css.typeMeta}>{projectCount} 个项目 · {type.stages.length} 个阶段</p>
                  </div>
                </div>
                <div style={css.typeHeadActions}>
                  <button onClick={() => setView(`type:${type.id}`)} className="btn-mini" style={css.miniBtn}>看项目</button>
                  <button onClick={() => editing ? cancelEdit(type.id) : beginEdit(type)} className="btn-mini" style={css.miniBtn}>{editing ? "收起" : "编辑"}</button>
                </div>
              </div>

              <div style={css.typeStageStrip}>
                {type.stages.map((stage) => (
                  <span key={stage.id} className="stage-pill" style={{ ...css.typeStagePill, borderColor:type.color+"32", color:type.color }}>{stage.name}</span>
                ))}
              </div>

              {editing && (
                <div style={css.typeEditor}>
                  <div style={css.typeEditorGrid}>
                    <label style={css.fieldLabel}>
                      <span>类型名</span>
                      <input value={draft.name} onChange={(e) => updateDraft(type.id, (current) => ({ ...current, name: e.target.value }))} style={css.addInp}/>
                    </label>
                    <label style={css.fieldLabel}>
                      <span>图标</span>
                      <input value={draft.icon} onChange={(e) => updateDraft(type.id, (current) => ({ ...current, icon: e.target.value }))} style={css.addInp}/>
                    </label>
                  </div>
                  <label style={css.fieldLabel}>
                    <span>颜色</span>
                    <div style={css.colorRow}>
                      <input type="color" value={draft.color} onChange={(e) => updateDraft(type.id, (current) => ({ ...current, color: e.target.value }))} style={css.colorInput}/>
                      <input value={draft.color} onChange={(e) => updateDraft(type.id, (current) => ({ ...current, color: e.target.value }))} style={css.addInp}/>
                    </div>
                  </label>
                  <div>
                    <div style={css.typeSectionHead}>
                      <span style={css.fieldSectionTitle}>阶段</span>
                      <button onClick={() => addStageToDraft(type.id)} style={css.miniBtn}>+ 加阶段</button>
                    </div>
                    {draft.stages.map((stage, index) => (
                      <div key={stage.id} style={css.stageEditorRow}>
                        <input value={stage.name} onChange={(e) => updateDraft(type.id, (current) => ({
                          ...current,
                          stages: current.stages.map((item) => item.id === stage.id ? { ...item, name: e.target.value } : item),
                        }))} style={css.addInp}/>
                        <div style={css.stageEditorActions}>
                          <button onClick={() => moveStage(type.id, index, -1)} disabled={index === 0} style={index === 0 ? css.miniBtnDisabled : css.miniBtn}>↑</button>
                          <button onClick={() => moveStage(type.id, index, 1)} disabled={index === draft.stages.length - 1} style={index === draft.stages.length - 1 ? css.miniBtnDisabled : css.miniBtn}>↓</button>
                          <button onClick={() => removeStageFromDraft(type, stage.id)} style={css.miniBtn}>删</button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={css.typeEditorActions}>
                    <button onClick={() => saveType(type)} style={css.actionBtnStrong}>保存修改</button>
                    <button onClick={() => toggleTypeActive(type)} style={css.actionBtn}>{type.active === false ? "启用" : "停用"}</button>
                    <button onClick={() => deleteType(type)} style={css.actionBtn}>删除</button>
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
