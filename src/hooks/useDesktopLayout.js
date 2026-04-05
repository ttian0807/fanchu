import { useState, useEffect } from "react";

export function useDesktopLayout() {
  const [isDesktop, setIsDesktop] = useState(() => (
    typeof window !== "undefined" ? window.innerWidth >= 1024 : false
  ));

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const onResize = () => setIsDesktop(window.innerWidth >= 1024);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return isDesktop;
}
