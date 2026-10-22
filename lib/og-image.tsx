import { ImageResponse } from "next/og";
import { SITE_NAME } from "./site";

export const ogSize = { width: 1200, height: 630 };
export const ogAlt = `${SITE_NAME}, Software Engineer`;

// One card for both Open Graph and Twitter. Plain monochrome, to match the site.
export function renderOgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0a0a0a",
          color: "#fafafa",
          padding: 80,
        }}
      >
        <div style={{ display: "flex", fontSize: 28, color: "#a1a1a1" }}>daivik-awasthi.me</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 92, fontWeight: 700, letterSpacing: -2 }}>{SITE_NAME}</div>
          <div style={{ display: "flex", fontSize: 44, marginTop: 16, color: "#d4d4d4" }}>Software Engineer | Problem Solver</div>
          <div style={{ display: "flex", fontSize: 30, marginTop: 28, color: "#a1a1a1" }}>
            Backend systems and AI tools. Former Goldman Sachs intern. NSUT, Delhi.
          </div>
        </div>
      </div>
    ),
    ogSize,
  );
}
