import { useEffect } from "react";

export function useAutoGrowTextArea(textareaRef, value, minHeight = 56) {
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.max(el.scrollHeight, minHeight)}px`;
  }, [textareaRef, value, minHeight]);
}
