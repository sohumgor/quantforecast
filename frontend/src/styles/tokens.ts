// Chart color tokens mirroring the values in globals.css. Kept as plain hex
// (not CSS variables) because Plotly's SVG renderer doesn't reliably resolve
// custom properties inside trace/layout config — chart components pick the
// right set at render time via `usePrefersDark()`.

export interface ChartTokens {
  background: string;
  foreground: string;
  surface: string;
  textSecondary: string;
  textMuted: string;
  gridline: string;
  baseline: string;
  series: string[];
  sequential: { 100: string; 400: string; 700: string };
  status: { good: string; warning: string; serious: string; critical: string };
}

export const lightTokens: ChartTokens = {
  background: "#f9f9f7",
  foreground: "#0b0b0b",
  surface: "#fcfcfb",
  textSecondary: "#52514e",
  textMuted: "#898781",
  gridline: "#e1e0d9",
  baseline: "#c3c2b7",
  series: [
    "#2a78d6", // blue
    "#eb6834", // orange
    "#1baf7a", // aqua
    "#eda100", // yellow
    "#e87ba4", // magenta
    "#008300", // green
    "#4a3aa7", // violet
    "#e34948", // red
  ],
  sequential: { 100: "#cde2fb", 400: "#3987e5", 700: "#0d366b" },
  status: { good: "#0ca30c", warning: "#fab219", serious: "#ec835a", critical: "#d03b3b" },
};

export const darkTokens: ChartTokens = {
  background: "#0d0d0d",
  foreground: "#ffffff",
  surface: "#1a1a19",
  textSecondary: "#c3c2b7",
  textMuted: "#898781",
  gridline: "#2c2c2a",
  baseline: "#383835",
  series: [
    "#3987e5",
    "#d95926",
    "#199e70",
    "#c98500",
    "#d55181",
    "#008300",
    "#9085e9",
    "#e66767",
  ],
  sequential: { 100: "#cde2fb", 400: "#3987e5", 700: "#0d366b" },
  status: { good: "#0ca30c", warning: "#fab219", serious: "#ec835a", critical: "#d03b3b" },
};
