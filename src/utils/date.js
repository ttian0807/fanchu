export const getToday = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const fmtDate = (d) => {
  const dt = new Date(d + "T00:00:00");
  return (dt.getMonth() + 1) + "/" + dt.getDate();
};

export const fmtStamp = (v) => {
  if (!v) return "";
  const dt = new Date(v);
  if (Number.isNaN(dt.getTime())) return "";
  return dt.toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
};

export const fmtClock = (v) => {
  if (!v) return "";
  const dt = new Date(v);
  if (Number.isNaN(dt.getTime())) return "";
  return dt.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
};

export const fmtLongDate = (d) =>
  new Date(d + "T00:00:00").toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric", weekday: "long" });

export const shiftDate = (dateStr, days) => {
  const dt = new Date(dateStr + "T00:00:00");
  dt.setDate(dt.getDate() + days);
  return getToday(dt);
};
