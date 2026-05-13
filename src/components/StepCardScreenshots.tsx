"use client";
import { useState } from "react";
import { Camera } from "lucide-react";
import Lightbox from "yet-another-react-lightbox";
import { Captions, Counter, Zoom } from "yet-another-react-lightbox/plugins";

function fmt(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export type ScreenshotItem = {
  frameId: string;
  url: string;
  t: number;
  order: number;
  description?: string;
};

export function StepCardScreenshots({
  index, title, description, screenshots, screenshotsError,
}: {
  index: number;
  title: string;
  description: string;
  screenshots: ScreenshotItem[];
  screenshotsError?: string;
}) {
  const n = String(index + 1).padStart(2, "0");
  const sorted = [...screenshots].sort((a, b) => a.order - b.order);
  const [openIndex, setOpenIndex] = useState<number>(-1);

  const slides = sorted.map(s => ({
    src: s.url,
    alt: `${title} — ${fmt(s.t)}`,
    description: s.description ? `${s.description}  ·  ${fmt(s.t)}` : fmt(s.t),
  }));

  return (
    <article
      id={`step-${index + 1}`}
      className="rounded-[20px] border border-gray-200 bg-white p-6 space-y-4"
      style={{ boxShadow: "0 6px 18px -4px rgba(10, 10, 10, 0.04)" }}
    >
      <div className="flex items-center gap-3.5">
        <span
          className="text-[36px] font-bold text-[#2563EB] tracking-[-0.04em] leading-none"
          style={{ fontFamily: "var(--font-inter)" }}
        >
          {n}
        </span>
      </div>
      <h3
        className="text-[20px] font-semibold text-[#0A0A0A] leading-[1.25]"
        style={{ fontFamily: "var(--font-inter)" }}
      >
        {title}
      </h3>
      <p className="text-sm text-[#4B5563] leading-[1.6] whitespace-pre-line">{description}</p>

      {sorted.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {sorted.map((s, i) => (
            <figure key={s.frameId} className="space-y-1.5">
              <button
                type="button"
                onClick={() => setOpenIndex(i)}
                className="block w-full overflow-hidden rounded-lg border border-gray-200 bg-[#FAFAFA] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-2 group"
                aria-label={`Phóng to ảnh tại ${fmt(s.t)}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={s.url}
                  alt={`${title} — ${fmt(s.t)}`}
                  loading="lazy"
                  className="w-full object-contain transition-transform duration-200 group-hover:scale-[1.02] cursor-zoom-in"
                />
              </button>
              <figcaption className="space-y-1">
                {s.description && (
                  <p className="text-[13px] text-[#0A0A0A] leading-[1.5] whitespace-pre-line">
                    {s.description}
                  </p>
                )}
                <span className="inline-flex items-center gap-1.5 text-[11px] text-[#9CA3AF]">
                  <Camera className="w-3 h-3" strokeWidth={2} />
                  {fmt(s.t)}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      ) : screenshotsError ? (
        <p className="text-[13px] text-[#B45309] bg-[#FFFBEB] border border-[#FDE68A] rounded-lg px-3 py-2">
          Screenshots unavailable for this step.
        </p>
      ) : (
        <p className="text-[13px] text-[#6B7280] italic">No screenshots needed for this step.</p>
      )}

      <Lightbox
        open={openIndex >= 0}
        index={openIndex >= 0 ? openIndex : 0}
        close={() => setOpenIndex(-1)}
        slides={slides}
        plugins={[Captions, Counter, Zoom]}
        captions={{ descriptionTextAlign: "center", descriptionMaxLines: 3 }}
        counter={{ container: { style: { top: 0, bottom: "unset" } } }}
        zoom={{ maxZoomPixelRatio: 3, scrollToZoom: true }}
        controller={{ closeOnBackdropClick: true }}
        carousel={{ finite: slides.length <= 1 }}
        styles={{
          root: { "--yarl__color_backdrop": "rgba(0, 0, 0, 0.92)", zIndex: 9999 },
        }}
      />
    </article>
  );
}
