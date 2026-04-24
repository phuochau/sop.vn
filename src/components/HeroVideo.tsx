"use client";
import { useState } from "react";
import { Play } from "lucide-react";

function fmtClock(seconds: number) {
  if (seconds <= 0) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function HeroVideo({
  sopId,
  posterUrl,
  totalSeconds,
}: {
  sopId: string;
  posterUrl: string;
  totalSeconds: number;
}) {
  const [playing, setPlaying] = useState(false);
  const src = `/api/clips/${sopId}/source.mp4`;
  return (
    <div
      className="rounded-[20px] border border-gray-200 bg-white p-6 space-y-4"
      style={{ boxShadow: "0 8px 24px -4px rgba(10, 10, 10, 0.04)" }}
    >
      <div className="relative rounded-[14px] overflow-hidden bg-black aspect-video">
        {!playing ? (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            className="absolute inset-0"
            aria-label="Phát video gốc"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={posterUrl} alt="" className="w-full h-full object-contain" />
            <span className="absolute inset-0 flex items-center justify-center">
              <span
                className="w-16 h-16 rounded-full bg-white/95 flex items-center justify-center"
                style={{ boxShadow: "0 6px 20px rgba(10, 10, 10, 0.25)" }}
              >
                <Play className="w-6 h-6 text-[#0066FF] ml-1" strokeWidth={2} fill="#0066FF" />
              </span>
            </span>
          </button>
        ) : (
          <video
            src={src}
            poster={posterUrl}
            controls
            autoPlay
            preload="metadata"
            className="w-full h-full object-contain bg-black"
          />
        )}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[13px] text-[#6B7280]">Video gốc đính kèm</span>
        <span
          className="text-[13px] font-medium text-[#0A0A0A]"
          style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}
        >
          {fmtClock(totalSeconds)}
        </span>
      </div>
    </div>
  );
}
