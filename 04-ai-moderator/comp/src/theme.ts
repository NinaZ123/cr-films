// atypica.ai 官网抓的 token（brand/tokens.json）：近黑底、霓虹绿强调。
// 官网字体 EuclidCircularA 本机没有，用 Inter Tight 代替。
import { loadFont as loadDisplay } from "@remotion/google-fonts/InterTight";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";

const display = loadDisplay("normal", { weights: ["300", "500", "600", "700"], subsets: ["latin"] });
const mono = loadMono("normal", { weights: ["400", "500"], subsets: ["latin"] });

export const T = {
  bg: "#0A0A0A",
  bgSoft: "#111111",
  card: "#1A1A1A",
  line: "rgba(255,255,255,0.10)",
  text: "#FAFAFA",
  dim: "rgba(250,250,250,0.55)",
  accent: "#18FF19",
  accentSoft: "rgba(24,255,25,0.35)",
  light: "#F4F3F0",
  ink: "#0A0A0B",
  display: display.fontFamily,
  mono: mono.fontFamily,
};
