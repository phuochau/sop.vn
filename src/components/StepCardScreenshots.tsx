"use client";
import { useEffect, useState } from "react";
import { Camera } from "lucide-react";
import { Gallery, Item } from "react-photoswipe-gallery";

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

type Dim = { w: number; h: number };

function useImageDimensions(urls: string[]): Map<string, Dim> {
  const [dims, setDims] = useState<Map<string, Dim>>(new Map());
  useEffect(() => {
    let cancelled = false;
    const next = new Map<string, Dim>();
    Promise.all(
      urls.map(
        (url) =>
          new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = () => {
              next.set(url, { w: img.naturalWidth, h: img.naturalHeight });
              resolve();
            };
            img.onerror = () => resolve();
            img.src = url;
          }),
      ),
    ).then(() => {
      if (!cancelled) setDims(next);
    });
    return () => {
      cancelled = true;
    };
  }, [urls.join("|")]); // eslint-disable-line react-hooks/exhaustive-deps
  return dims;
}

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
  const urls = sorted.map(s => s.url);
  const dims = useImageDimensions(urls);

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
        <Gallery
          options={{
            showHideAnimationType: "fade",
            bgOpacity: 0.92,
            zoom: true,
            counter: true,
          }}
          withCaption
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {sorted.map((s) => {
              const d = dims.get(s.url);
              const caption = s.description ? `${s.description}  ·  ${fmt(s.t)}` : fmt(s.t);
              return (
                <figure key={s.frameId} className="space-y-1.5">
                  <Item
                    original={s.url}
                    thumbnail={s.url}
                    width={d?.w ?? 1920}
                    height={d?.h ?? 1080}
                    caption={caption}
                    alt={`${title} — ${fmt(s.t)}`}
                  >
                    {({ ref, open }) => (
                      <button
                        type="button"
                        ref={ref as React.Ref<HTMLButtonElement>}
                        onClick={open}
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
                    )}
                  </Item>
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
              );
            })}
          </div>
        </Gallery>
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
