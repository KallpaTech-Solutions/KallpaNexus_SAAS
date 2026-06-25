export type PlatformTheme = "light" | "dark";

const STORAGE_KEY = "knx-platform-theme";

export function readPlatformTheme(): PlatformTheme {
  if (typeof window === "undefined") return "light";
  const v = localStorage.getItem(STORAGE_KEY);
  return v === "dark" ? "dark" : "light";
}

export function writePlatformTheme(theme: PlatformTheme) {
  localStorage.setItem(STORAGE_KEY, theme);
  document.documentElement.setAttribute("data-platform-theme", theme);
}

export function applyPlatformTheme(theme: PlatformTheme) {
  document.documentElement.setAttribute("data-platform-theme", theme);
}
