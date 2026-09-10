import { useCallback, useEffect, useState } from "react";

const KEY = "velora-theme";

export function useTheme() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const stored = window.localStorage.getItem(KEY);
    const next = stored === "light" ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.toggle("light", next === "light");
  }, []);

  const apply = useCallback((next: "dark" | "light") => {
    setTheme(next);
    window.localStorage.setItem(KEY, next);
    document.documentElement.classList.toggle("light", next === "light");
  }, []);

  const toggle = useCallback(
    () => apply(document.documentElement.classList.contains("light") ? "dark" : "light"),
    [apply],
  );

  return { theme, setTheme: apply, toggle };
}
