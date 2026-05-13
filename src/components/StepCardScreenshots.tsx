"use client";
import { Camera } from "lucide-react";

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
          {sorted.map(s => (
            <figure key={s.frameId} className="space-y-1.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={s.url}
                alt={`${title} — ${fmt(s.t)}`}
                loading="lazy"
                className="w-full rounded-lg border border-gray-200 object-contain bg-[#FAFAFA]"
              />
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
    </article>
  );
}
