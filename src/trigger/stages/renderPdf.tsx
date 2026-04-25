import path from "node:path";
import React from "react";
import {
  Document, Page, Text, View, Image, Font, StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";

// Fonts live at <projectRoot>/public/fonts in dev and at <workerRoot>/public/fonts in
// the deployed Trigger.dev worker (via the additionalFiles build extension in trigger.config.ts).
// In both cases process.cwd() points to the right root.
const FONT_DIR = path.join(process.cwd(), "public/fonts");

Font.register({
  family: "BeVietnamPro",
  fonts: [
    { src: path.join(FONT_DIR, "BeVietnamPro-Regular.ttf"), fontWeight: 400 },
    { src: path.join(FONT_DIR, "BeVietnamPro-Bold.ttf"),    fontWeight: 700 },
  ],
});

const COLORS = {
  body:   "#0A0A0A",
  meta:   "#6B7280",
  accent: "#0066FF",
  rule:   "#E5E7EB",
  warn:   "#F59E0B",
  tip:    "#10B981",
  note:   "#6B7280",
};

const s = StyleSheet.create({
  page:        { paddingTop: 56, paddingBottom: 64, paddingHorizontal: 56, fontFamily: "BeVietnamPro", color: COLORS.body, fontSize: 11, lineHeight: 1.5 },
  brand:       { fontSize: 9, color: COLORS.meta, letterSpacing: 1 },
  categoryPill:{ marginTop: 16, alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: "#F3F4F6", fontSize: 9, color: COLORS.meta },
  title:       { fontSize: 26, fontWeight: 700, marginTop: 12 },
  metaRow:     { flexDirection: "row", marginTop: 8, fontSize: 10, color: COLORS.meta },
  metaItem:    { marginRight: 16 },
  rule:        { borderBottomWidth: 1, borderBottomColor: COLORS.rule, marginVertical: 16 },

  sectionLabel:{ fontSize: 10, fontWeight: 700, color: COLORS.body, marginTop: 12, marginBottom: 4 },
  sectionBody: { fontSize: 11, color: COLORS.body },
  bullet:      { flexDirection: "row", marginBottom: 2 },
  bulletDot:   { width: 12, fontSize: 11 },
  bulletText:  { flex: 1, fontSize: 11 },

  tocItem:     { flexDirection: "row", marginVertical: 3, fontSize: 11 },
  tocNum:      { width: 28, fontWeight: 700, color: COLORS.accent },
  tocTitle:    { flex: 1 },
  tocTime:     { color: COLORS.meta, fontSize: 10 },

  stepHeader:  { fontSize: 9, color: COLORS.meta, marginBottom: 4 },
  stepTitle:   { fontSize: 18, fontWeight: 700, marginBottom: 12 },
  frameStrip:  { flexDirection: "row", marginBottom: 12 },
  frame:       { width: 150, height: 84, marginRight: 8, objectFit: "cover", borderRadius: 4, backgroundColor: "#F3F4F6" },
  prose:       { marginBottom: 8 },
  callout:     { marginTop: 8, padding: 8, borderLeftWidth: 3, borderLeftColor: COLORS.warn, backgroundColor: "#FFFBEB", fontSize: 10 },
  calloutTip:  { borderLeftColor: COLORS.tip, backgroundColor: "#ECFDF5" },
  calloutNote: { borderLeftColor: COLORS.note, backgroundColor: "#F9FAFB" },

  footer:      { position: "absolute", bottom: 32, left: 56, right: 56, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: COLORS.rule, paddingTop: 8, fontSize: 9, color: COLORS.meta },
});

export type RenderInput = {
  title: string;
  category: string;
  createdAt: Date;
  overview: {
    purpose: string;
    audience: string;
    prerequisites: string[];
    toolsMaterials: string[];
    estimatedDuration: string;
  } | null;
  steps: Array<{
    index: number;
    title: string;
    startTime: number;
    endTime: number;
    rewrite: {
      prose: string;
      subBullets: string[];
      callouts: Array<{ kind: "warning" | "tip" | "note"; text: string }>;
    } | null;
    keyframes: Buffer[]; // 0 to 3 image buffers
    posterImage: Buffer | null; // fallback when keyframes is empty
  }>;
};

function fmtTimestamp(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function fmtDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function calloutStyle(kind: "warning" | "tip" | "note") {
  if (kind === "tip") return [s.callout, s.calloutTip];
  if (kind === "note") return [s.callout, s.calloutNote];
  return [s.callout];
}

const Footer = ({ title }: { title: string }) => (
  <View style={s.footer} fixed>
    <Text>{title}</Text>
    <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
  </View>
);

export function SopPdfDocument(input: RenderInput) {
  const totalDuration = input.steps.length > 0
    ? input.steps[input.steps.length - 1].endTime
    : 0;

  return (
    <Document>
      {/* Cover page */}
      <Page size="A4" style={s.page}>
        <Text style={s.brand}>SOPVN</Text>
        <Text style={s.categoryPill}>{input.category}</Text>
        <Text style={s.title}>{input.title}</Text>
        <View style={s.metaRow}>
          <Text style={s.metaItem}>Tạo lúc {fmtDate(input.createdAt)}</Text>
          <Text style={s.metaItem}>{Math.round(totalDuration)}s · {input.steps.length} bước</Text>
        </View>
        <View style={s.rule} />
        {input.overview && (
          <>
            <Text style={s.sectionLabel}>Mục đích</Text>
            <Text style={s.sectionBody}>{input.overview.purpose}</Text>
            <Text style={s.sectionLabel}>Đối tượng</Text>
            <Text style={s.sectionBody}>{input.overview.audience}</Text>
            {input.overview.prerequisites.length > 0 && (
              <>
                <Text style={s.sectionLabel}>Yêu cầu trước</Text>
                {input.overview.prerequisites.map((p, i) => (
                  <View key={i} style={s.bullet}>
                    <Text style={s.bulletDot}>•</Text><Text style={s.bulletText}>{p}</Text>
                  </View>
                ))}
              </>
            )}
            {input.overview.toolsMaterials.length > 0 && (
              <>
                <Text style={s.sectionLabel}>Công cụ / Nguyên liệu</Text>
                {input.overview.toolsMaterials.map((p, i) => (
                  <View key={i} style={s.bullet}>
                    <Text style={s.bulletDot}>•</Text><Text style={s.bulletText}>{p}</Text>
                  </View>
                ))}
              </>
            )}
            <Text style={s.sectionLabel}>Thời lượng ước tính</Text>
            <Text style={s.sectionBody}>{input.overview.estimatedDuration}</Text>
          </>
        )}
        <Footer title={input.title} />
      </Page>

      {/* Table of contents (skipped if ≤3 steps) */}
      {input.steps.length > 3 && (
        <Page size="A4" style={s.page}>
          <Text style={s.title}>Mục lục</Text>
          <View style={s.rule} />
          {input.steps.map((step, i) => (
            <View key={i} style={s.tocItem}>
              <Text style={s.tocNum}>{String(i + 1).padStart(2, "0")}</Text>
              <Text style={s.tocTitle}>{step.title}</Text>
              <Text style={s.tocTime}>{fmtTimestamp(step.startTime)}</Text>
            </View>
          ))}
          <Footer title={input.title} />
        </Page>
      )}

      {/* One page per step */}
      {input.steps.map((step, i) => {
        const images = step.keyframes.length > 0
          ? step.keyframes
          : (step.posterImage ? [step.posterImage] : []);
        return (
          <Page key={i} size="A4" style={s.page}>
            <Text style={s.stepHeader}>
              Bước {String(i + 1).padStart(2, "0")} · {fmtTimestamp(step.startTime)} – {fmtTimestamp(step.endTime)}
            </Text>
            <Text style={s.stepTitle}>{step.title}</Text>
            {images.length > 0 && (
              <View style={s.frameStrip}>
                {images.map((img, fi) => (
                  <Image key={fi} src={img} style={s.frame} />
                ))}
              </View>
            )}
            {step.rewrite && (
              <>
                <Text style={s.prose}>{step.rewrite.prose}</Text>
                {step.rewrite.subBullets.map((b, bi) => (
                  <View key={bi} style={s.bullet}>
                    <Text style={s.bulletDot}>•</Text><Text style={s.bulletText}>{b}</Text>
                  </View>
                ))}
                {step.rewrite.callouts.map((c, ci) => (
                  <View key={ci} style={calloutStyle(c.kind)}>
                    <Text>{c.kind === "warning" ? "⚠ " : c.kind === "tip" ? "💡 " : "ℹ "}{c.text}</Text>
                  </View>
                ))}
              </>
            )}
            <Footer title={input.title} />
          </Page>
        );
      })}
    </Document>
  );
}

export async function renderSopPdf(input: RenderInput): Promise<Buffer> {
  const doc = SopPdfDocument(input);
  return renderToBuffer(doc);
}
