/**
 * Grid overlay (Set-of-Mark prompting). LLMs cannot reliably emit pixel or
 * fraction coordinates — they hallucinate values and confuse coordinate scales.
 * Overlaying a labelled grid turns "where is it" into "which cell is it in",
 * which they answer far more reliably.
 *
 * Columns are numbered 0..cols-1 (labels along the top edge), rows 0..rows-1
 * (labels along the left edge). Cell (c,r) maps arithmetically to normalized
 * coordinates — no lookup table needed.
 */
import sharp from "sharp";

export type Grid = { cols: number; rows: number };

/** Normalized centre of cell (col,row). */
export function cellCenter(col: number, row: number, grid: Grid): { x: number; y: number } {
  return { x: (col + 0.5) / grid.cols, y: (row + 0.5) / grid.rows };
}

/** Normalized box covering the inclusive cell span [c0,r0]..[c1,r1]. */
export function cellSpanBox(
  c0: number, r0: number, c1: number, r1: number, grid: Grid,
): { x: number; y: number; w: number; h: number } {
  const lo = (c: number, r: number) => ({ x: c / grid.cols, y: r / grid.rows });
  const a = lo(Math.min(c0, c1), Math.min(r0, r1));
  const b = lo(Math.max(c0, c1) + 1, Math.max(r0, r1) + 1);
  return { x: a.x, y: a.y, w: b.x - a.x, h: b.y - a.y };
}

function gridSvg(W: number, H: number, grid: Grid): string {
  const parts: string[] = [`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">`];
  const stroke = Math.max(1, Math.round(W * 0.0009));
  const font = Math.max(11, Math.round(H * 0.016));

  for (let c = 1; c < grid.cols; c++) {
    const x = Math.round((c / grid.cols) * W);
    parts.push(`<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="#FF00AA" stroke-width="${stroke}" stroke-opacity="0.5"/>`);
  }
  for (let r = 1; r < grid.rows; r++) {
    const y = Math.round((r / grid.rows) * H);
    parts.push(`<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="#FF00AA" stroke-width="${stroke}" stroke-opacity="0.5"/>`);
  }
  // Column labels along the top, row labels down the left edge.
  for (let c = 0; c < grid.cols; c++) {
    const x = Math.round(((c + 0.5) / grid.cols) * W);
    parts.push(label(String(c), x, Math.round(font * 1.1), font));
  }
  for (let r = 0; r < grid.rows; r++) {
    const y = Math.round(((r + 0.5) / grid.rows) * H);
    parts.push(label(String(r), Math.round(font * 0.9), y, font));
  }
  parts.push("</svg>");
  return parts.join("");
}

function label(text: string, cx: number, cy: number, font: number): string {
  return (
    `<text x="${cx}" y="${cy}" font-family="monospace" font-size="${font}" ` +
    `font-weight="bold" fill="#FFEE00" stroke="#000000" stroke-width="${Math.max(2, font * 0.18)}" ` +
    `paint-order="stroke" text-anchor="middle" dominant-baseline="middle">${text}</text>`
  );
}

/** Composite a labelled grid onto `srcPath` and write it to `outPath`. */
export async function overlayGrid(
  srcPath: string,
  outPath: string,
  grid: Grid,
): Promise<void> {
  const meta = await sharp(srcPath).metadata();
  const W = meta.width ?? 0;
  const H = meta.height ?? 0;
  if (!W || !H) throw new Error("overlayGrid: missing image metadata");
  await sharp(srcPath)
    .composite([{ input: Buffer.from(gridSvg(W, H, grid)), top: 0, left: 0 }])
    .jpeg({ quality: 92 })
    .toFile(outPath);
}
