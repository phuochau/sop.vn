"use client";
import { useState } from "react";
import { Play } from "lucide-react";

function fmt(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function StepCard({
  index, title, description, clipUrl, posterUrl, startTime, endTime,
}: {
  index: number;
  title: string;
  description: string;
  clipUrl: string;
  posterUrl: string;
  startTime?: number;
  endTime?: number;
}) {
  const [playing, setPlaying] = useState(false);
  const n = String(index + 1).padStart(2, "0");
  const hasRange = typeof startTime === "number" && typeof endTime === "number";
  const duration = hasRange ? fmt(endTime - startTime) : undefined;

  return (
    <article
      id={`step-${index + 1}`}
      className="rounded-[20px] border border-gray-200 bg-white p-6 flex flex-col md:flex-row gap-5"
      style={{ boxShadow: "0 6px 18px -4px rgba(10, 10, 10, 0.04)" }}
    >
      {/* Left: text */}
      <div className="flex-1 min-w-0 space-y-2.5">
        <div className="flex items-center gap-3.5">
          <span
            className="text-[36px] font-bold text-[#2563EB] tracking-[-0.04em] leading-none"
            style={{ fontFamily: "var(--font-inter)" }}
          >
            {n}
          </span>
          {hasRange && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F3F4F6] px-2.5 py-1">
              <Play className="w-2.5 h-2.5 text-[#374151]" strokeWidth={2} fill="#374151" />
              <span
                className="text-[11px] font-medium text-[#374151]"
                style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}
              >
                {fmt(startTime!)}
              </span>
            </span>
          )}
        </div>
        <h3
          className="text-[20px] font-semibold text-[#0A0A0A] leading-[1.25]"
          style={{ fontFamily: "var(--font-inter)" }}
        >
          {title}
        </h3>
        <p className="text-sm text-[#4B5563] leading-[1.6] whitespace-pre-line">{description}</p>
      </div>

      {/* Right: video card */}
      <div className="w-full md:w-[240px] shrink-0 space-y-2">
        {!playing ? (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            className="group relative w-full h-[135px] rounded-xl bg-[#E8EAED] overflow-hidden"
            style={{ boxShadow: "0 8px 20px -4px rgba(10, 10, 10, 0.1)" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={posterUrl} alt="" className="w-full h-full object-cover" />
            <span className="absolute inset-0 flex items-center justify-center">
              <span
                className="w-[60px] h-[60px] rounded-full bg-white flex items-center justify-center"
                style={{ boxShadow: "0 4px 12px rgba(10, 10, 10, 0.2)" }}
              >
                <Play className="w-5 h-5 text-[#0066FF] ml-0.5" strokeWidth={2} fill="#0066FF" />
              </span>
            </span>
            {duration && (
              <span
                className="absolute bottom-2 right-2 rounded-full bg-black/60 text-white text-[11px] font-medium px-2 py-0.5"
                style={{ fontFamily: "Funnel Sans, system-ui, sans-serif" }}
              >
                {duration}
              </span>
            )}
          </button>
        ) : (
          <video
            src={clipUrl}
            poster={posterUrl}
            controls
            autoPlay
            preload="metadata"
            className="w-full h-[135px] rounded-xl bg-black object-cover"
          />
        )}
        {hasRange && (
          <p className="text-[12px] text-[#666666]">
            Cắt từ video gốc · {fmt(startTime!)} → {fmt(endTime!)}
          </p>
        )}
      </div>
    </article>
  );
}
