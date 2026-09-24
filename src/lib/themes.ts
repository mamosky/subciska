export type ThemeId =
  | "auto"
  | "oatmeal"
  | "paper"
  | "porcelain"
  | "sand"
  | "cream"
  | "blush"
  | "peach"
  | "mint"
  | "sage"
  | "sky"
  | "lavender"
  | "arctic"
  | "fog"
  | "sandstone"
  | "dusk"
  | "taupe"
  | "slate"
  | "moss"
  | "mauve"
  | "denim"
  | "clay"
  | "olive"
  | "midnight"
  | "charcoal"
  | "espresso"
  | "forest"
  | "ocean"
  | "plum"
  | "ember";

export type ThemeMode = "auto" | "light" | "mid" | "dark";

export type ThemeMeta = {
  id: ThemeId;
  label: string;
  mode: ThemeMode;
  /** Colors for the swatch preview in App Settings */
  canvas: string;
  surface: string;
  accent: string;
  ink: string;
  themeColor: string;
};

export const DEFAULT_THEME: ThemeId = "auto";

export const THEME_OPTIONS: ThemeMeta[] = [
  {
    id: "auto",
    label: "System",
    mode: "auto",
    canvas: "#ece9e2",
    surface: "#ffffff",
    accent: "#3a6b52",
    ink: "#212121",
    themeColor: "#ece9e2",
  },
  {
    id: "oatmeal",
    label: "Oatmeal",
    mode: "light",
    canvas: "#ece9e2",
    surface: "#ffffff",
    accent: "#3a6b52",
    ink: "#212121",
    themeColor: "#ece9e2",
  },
  {
    id: "paper",
    label: "Paper",
    mode: "light",
    canvas: "#f6f5f2",
    surface: "#ffffff",
    accent: "#2f5fa8",
    ink: "#1a1a1a",
    themeColor: "#f6f5f2",
  },
  {
    id: "porcelain",
    label: "Porcelain",
    mode: "light",
    canvas: "#f0f3f6",
    surface: "#ffffff",
    accent: "#3d6f8e",
    ink: "#15202b",
    themeColor: "#f0f3f6",
  },
  {
    id: "sand",
    label: "Sand",
    mode: "light",
    canvas: "#f3ead8",
    surface: "#fffdf7",
    accent: "#8a5a2b",
    ink: "#2c2416",
    themeColor: "#f3ead8",
  },
  {
    id: "cream",
    label: "Cream",
    mode: "light",
    canvas: "#f7f0e0",
    surface: "#fffdf6",
    accent: "#b07820",
    ink: "#2a2418",
    themeColor: "#f7f0e0",
  },
  {
    id: "blush",
    label: "Blush",
    mode: "light",
    canvas: "#f6ebe8",
    surface: "#ffffff",
    accent: "#a84d5a",
    ink: "#2a1a1c",
    themeColor: "#f6ebe8",
  },
  {
    id: "peach",
    label: "Peach",
    mode: "light",
    canvas: "#f8ece3",
    surface: "#ffffff",
    accent: "#c45c26",
    ink: "#2b1c14",
    themeColor: "#f8ece3",
  },
  {
    id: "mint",
    label: "Mint",
    mode: "light",
    canvas: "#e7f2ec",
    surface: "#ffffff",
    accent: "#1f7a55",
    ink: "#14201a",
    themeColor: "#e7f2ec",
  },
  {
    id: "sage",
    label: "Sage",
    mode: "light",
    canvas: "#e9eee6",
    surface: "#fbfcfa",
    accent: "#4a6b4f",
    ink: "#1a1f1a",
    themeColor: "#e9eee6",
  },
  {
    id: "sky",
    label: "Sky",
    mode: "light",
    canvas: "#e8f1f8",
    surface: "#ffffff",
    accent: "#1a6fa8",
    ink: "#12202a",
    themeColor: "#e8f1f8",
  },
  {
    id: "lavender",
    label: "Lavender",
    mode: "light",
    canvas: "#efeaf6",
    surface: "#ffffff",
    accent: "#6b4fa3",
    ink: "#1e1a28",
    themeColor: "#efeaf6",
  },
  {
    id: "arctic",
    label: "Arctic",
    mode: "light",
    canvas: "#eef2f5",
    surface: "#ffffff",
    accent: "#2a6f97",
    ink: "#12181e",
    themeColor: "#eef2f5",
  },
  {
    id: "fog",
    label: "Fog",
    mode: "mid",
    canvas: "#9aa0a6",
    surface: "#a8aeb4",
    accent: "#3d6a8a",
    ink: "#1a1e22",
    themeColor: "#9aa0a6",
  },
  {
    id: "sandstone",
    label: "Sandstone",
    mode: "mid",
    canvas: "#b7a68c",
    surface: "#c4b49a",
    accent: "#6b4a28",
    ink: "#2a2218",
    themeColor: "#b7a68c",
  },
  {
    id: "dusk",
    label: "Dusk",
    mode: "mid",
    canvas: "#3f3a48",
    surface: "#4a4555",
    accent: "#c4a0e0",
    ink: "#ebe6f2",
    themeColor: "#3f3a48",
  },
  {
    id: "taupe",
    label: "Taupe",
    mode: "mid",
    canvas: "#6a6258",
    surface: "#786f64",
    accent: "#e0c8a0",
    ink: "#f4efe6",
    themeColor: "#6a6258",
  },
  {
    id: "slate",
    label: "Slate",
    mode: "mid",
    canvas: "#4a5562",
    surface: "#556170",
    accent: "#8ebcd8",
    ink: "#e8eef4",
    themeColor: "#4a5562",
  },
  {
    id: "moss",
    label: "Moss",
    mode: "mid",
    canvas: "#4a5848",
    surface: "#556454",
    accent: "#a8c890",
    ink: "#e8f0e4",
    themeColor: "#4a5848",
  },
  {
    id: "mauve",
    label: "Mauve",
    mode: "mid",
    canvas: "#5a4e58",
    surface: "#665a64",
    accent: "#d4a0c0",
    ink: "#f0e8ee",
    themeColor: "#5a4e58",
  },
  {
    id: "denim",
    label: "Denim",
    mode: "mid",
    canvas: "#3e4a5c",
    surface: "#4a5668",
    accent: "#90b8e0",
    ink: "#e4ecf6",
    themeColor: "#3e4a5c",
  },
  {
    id: "clay",
    label: "Clay",
    mode: "mid",
    canvas: "#6a5048",
    surface: "#785c54",
    accent: "#e0a888",
    ink: "#f4ece6",
    themeColor: "#6a5048",
  },
  {
    id: "olive",
    label: "Olive",
    mode: "mid",
    canvas: "#4a4e38",
    surface: "#565a42",
    accent: "#c8d080",
    ink: "#eef0e0",
    themeColor: "#4a4e38",
  },
  {
    id: "midnight",
    label: "Midnight",
    mode: "dark",
    canvas: "#0f1218",
    surface: "#171b23",
    accent: "#7fb397",
    ink: "#eef1f5",
    themeColor: "#0f1218",
  },
  {
    id: "charcoal",
    label: "Charcoal",
    mode: "dark",
    canvas: "#141414",
    surface: "#1c1c1c",
    accent: "#c5c5c5",
    ink: "#f0f0f0",
    themeColor: "#141414",
  },
  {
    id: "espresso",
    label: "Espresso",
    mode: "dark",
    canvas: "#17120e",
    surface: "#211a14",
    accent: "#d4a57e",
    ink: "#f3ebe3",
    themeColor: "#17120e",
  },
  {
    id: "forest",
    label: "Forest",
    mode: "dark",
    canvas: "#0e1612",
    surface: "#15201a",
    accent: "#7fb397",
    ink: "#e8f2ec",
    themeColor: "#0e1612",
  },
  {
    id: "ocean",
    label: "Ocean",
    mode: "dark",
    canvas: "#0b1220",
    surface: "#121b2c",
    accent: "#6eb5e0",
    ink: "#e8eef6",
    themeColor: "#0b1220",
  },
  {
    id: "plum",
    label: "Plum",
    mode: "dark",
    canvas: "#150f18",
    surface: "#1e1624",
    accent: "#c4a0e0",
    ink: "#f2ebf6",
    themeColor: "#150f18",
  },
  {
    id: "ember",
    label: "Ember",
    mode: "dark",
    canvas: "#16110e",
    surface: "#1f1814",
    accent: "#e0a070",
    ink: "#f5ede6",
    themeColor: "#16110e",
  },
];

export function isThemeId(value: unknown): value is ThemeId {
  return THEME_OPTIONS.some((o) => o.id === value);
}

export function coerceTheme(value: unknown): ThemeId {
  return isThemeId(value) ? value : DEFAULT_THEME;
}

export function getTheme(id: ThemeId): ThemeMeta {
  return THEME_OPTIONS.find((o) => o.id === id) ?? THEME_OPTIONS[0];
}

/** Group themes for the App Settings picker (auto first, then light / mid / dark). */
export function themeGroups(): { label: string; themes: ThemeMeta[] }[] {
  const auto = THEME_OPTIONS.filter((t) => t.mode === "auto");
  const light = THEME_OPTIONS.filter((t) => t.mode === "light");
  const mid = THEME_OPTIONS.filter((t) => t.mode === "mid");
  const dark = THEME_OPTIONS.filter((t) => t.mode === "dark");
  return [
    { label: "Default", themes: auto },
    { label: "Light", themes: light },
    { label: "Mid", themes: mid },
    { label: "Dark", themes: dark },
  ].filter((g) => g.themes.length > 0);
}

/** Mid themes need dark form controls but are not full dark — pick color-scheme from mode. */
function colorSchemeFor(mode: ThemeMode): "light" | "dark" | "" {
  if (mode === "light" || mode === "auto") return "light";
  if (mode === "mid" || mode === "dark") return "dark";
  return "";
}

/** Apply theme via `data-theme` on <html>; "auto" clears it so system dark mode applies. */
export function applyTheme(id: ThemeId): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const meta = getTheme(id);
  if (id === "auto") {
    root.removeAttribute("data-theme");
    root.style.colorScheme = "";
  } else {
    root.setAttribute("data-theme", id);
    root.style.colorScheme = colorSchemeFor(meta.mode);
  }
  const themeColor = document.querySelector('meta[name="theme-color"]');
  if (themeColor) themeColor.setAttribute("content", meta.themeColor);
}
