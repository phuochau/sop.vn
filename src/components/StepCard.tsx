export function StepCard({ index, title, description, clipUrl, posterUrl }: {
  index: number; title: string; description: string; clipUrl: string; posterUrl: string;
}) {
  return (
    <article className="rounded-lg border p-4 md:p-6 space-y-4">
      <header className="flex items-start gap-3">
        <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
          {index + 1}
        </span>
        <h3 className="text-lg font-semibold flex-1">{title}</h3>
      </header>
      <video src={clipUrl} poster={posterUrl} controls preload="metadata" className="w-full rounded-md bg-black" />
      <p className="text-sm leading-relaxed whitespace-pre-line">{description}</p>
    </article>
  );
}
