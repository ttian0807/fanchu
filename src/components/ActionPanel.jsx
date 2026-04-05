import React, { useState, useRef } from "react";
import { UI } from "../constants/ui.js";

export default function ActionPanel({ onExport, onImport }) {
  const [open, setOpen] = useState(false);
  const [confirmImport, setConfirmImport] = useState(false);
  const [importMsg, setImportMsg] = useState("");
  const fileRef = useRef(null);

  const toggle = () => {
    setOpen((prev) => !prev);
    setConfirmImport(false);
    setImportMsg("");
  };

  const close = () => {
    setOpen(false);
    setConfirmImport(false);
    setImportMsg("");
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      if (!json?.data) {
        setImportMsg("格式不对，找不到 data 字段。");
        return;
      }
      onImport(json.data);
      close();
    } catch {
      setImportMsg("解析失败，请确认是有效的导出文件。");
    }
  };

  return (
    <div style={{ position: "relative" }}>
      <input ref={fileRef} type="file" accept=".json" style={{ display: "none" }} onChange={handleFileChange} />
      <button onClick={toggle} className="btn-action" style={{
        padding: "8px 12px",
        background: "rgba(255,250,244,0.84)",
        border: "1px solid rgba(157,123,94,0.1)",
        borderRadius: "12px",
        color: UI.inkMute,
        fontSize: "16px",
        cursor: "pointer",
        lineHeight: 1,
      }}>
        ⋯
      </button>

      {open && (
        <>
          <div className="menu-overlay" onClick={close} />
          <div className="menu-dropdown">
            {importMsg && (
              <p style={{ fontSize: "11px", color: "#c87e68", padding: "6px 14px 4px", margin: 0 }}>{importMsg}</p>
            )}
            <button className="menu-item" onClick={() => { onExport(); close(); }}>导出 JSON</button>
            {!confirmImport ? (
              <button className="menu-item" onClick={() => setConfirmImport(true)}>导入 JSON</button>
            ) : (
              <div style={{ borderTop: "1px solid rgba(157,123,94,0.1)", padding: "6px 8px 2px" }}>
                <p style={{ fontSize: "11px", color: "#c87e68", margin: "0 0 4px", padding: "0 6px", lineHeight: 1.6 }}>
                  会覆盖当前所有数据，确定继续？
                </p>
                <button className="menu-item" onClick={() => fileRef.current?.click()}>选择文件并导入</button>
                <button className="menu-item" onClick={() => setConfirmImport(false)}>取消</button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
