// atypica.ai 官网抓的 token（brand/tokens.json）：近黑底、霓虹绿强调。
// 字体和 atypica-llm-app 一致：EuclidCircularA（正文/大字）+ IBMPlexMono（等宽小字），
// 文件从 atypica-llm-app/public/_public/fonts 拷到 public/fonts。
// Euclid 只有 300/400/500 三个字重，大字统一用 500。
import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

const faces: [string, string, string][] = [
  ["EuclidCircularA", "Euclid-Circular-A-Light", "300"],
  ["EuclidCircularA", "Euclid-Circular-A-Regular", "400"],
  ["EuclidCircularA", "Euclid-Circular-A-Medium", "500"],
  ["IBMPlexMono", "IBMPlexMono-Light", "300"],
  ["IBMPlexMono", "IBMPlexMono-Regular", "400"],
];
for (const [family, file, weight] of faces) {
  loadFont({ family, url: staticFile(`fonts/${file}.woff2`), weight, format: "woff2" });
}

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
  display: "EuclidCircularA",
  mono: "IBMPlexMono",
  // 大字的字间距：原来 -0.045em 太挤，字粘在一起看不清
  tight: "-0.01em",
};
