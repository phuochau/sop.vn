export type ClipItem = {
  clipId: string;
  url: string;
  posterUrl: string;
  startTime: number;
  endTime: number;
  order: number;
};

export function StepCardClips({
  index,
  title,
  description,
  clips,
  clipsError,
}: {
  index: number;
  title: string;
  description: string;
  clips: ClipItem[];
  clipsError?: string;
}) {
  const n = String(index + 1).padStart(2, "0");
  const sorted = [...clips].sort((a, b) => a.order - b.order);

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
        <div className="grid grid-cols-1 gap-3">
          {sorted.map((c) => (
            <video
              key={c.clipId}
              controls
              preload="metadata"
              poster={c.posterUrl}
              src={c.url}
              className="w-full rounded-lg border border-gray-200 bg-black"
            />
          ))}
        </div>
      ) : clipsError ? (
        <p className="text-[13px] text-[#B45309] bg-[#FFFBEB] border border-[#FDE68A] rounded-lg px-3 py-2">
          Clip không khả dụng cho bước này.
        </p>
      ) : null}
    </article>
  );
}
