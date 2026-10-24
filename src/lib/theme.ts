export type Theme = "light" | "dark" | "system";
const KEY = "pi-theme";

export function readTheme(): Theme {
  const v = typeof localStorage !== "undefined" ? localStorage.getItem(KEY) : null;
  return v === "dark" || v === "system" ? v : "light";
}

export function applyTheme(theme: Theme = readTheme()) {
  if (typeof document === "undefined") return;
  localStorage.setItem(KEY, theme);
  const dark = theme === "dark" || (theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}
