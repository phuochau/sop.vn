"use client";
import { useState } from "react";

export function StepCard({ index, title, description, clipUrl, posterUrl }: {
  index: number; title: string; description: string; clipUrl: string; posterUrl: string;
}) {
  const [playing, setPlaying] = useState(false);
  const n = String(index + 1).padStart(2, "0");

  return (
    <article id={`step-${index + 1}`} className="rounded-xl border bg-white p-5 md:p-6 shadow-sm">
      <div className="flex items-start gap-5">
        {/* Big number */}
        <div className="text-4xl md:text-5xl font-bold text-gray-200 leading-none tracking-tighter shrink-0 w-14 md:w-16">
          {n}
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0 space-y-2">
          <h3 className="text-base md:text-lg font-semibold">{title}</h3>
          <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{description}</p>
        </div>

        {/* Poster / video thumbnail */}
        <div className="w-32 md:w-44 shrink-0">
          {!playing ? (
            <button
              type="button"
              onClick={() => setPlaying(true)}
              className="group relative w-full aspect-video rounded-lg border bg-gray-100 overflow-hidden cursor-pointer"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={posterUrl} alt="" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition" />
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="w-10 h-10 rounded-full bg-white/95 shadow flex items-center justify-center">
                  <svg className="w-4 h-4 text-gray-900 ml-0.5" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                </span>
              </span>
            </button>
          ) : (
            <video
              src={clipUrl}
              poster={posterUrl}
              controls
              autoPlay
              preload="metadata"
              className="w-full aspect-video rounded-lg bg-black"
            />
          )}
        </div>
      </div>
    </article>
  );
}
