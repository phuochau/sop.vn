import type { Clip } from "@/lib/mongo";

/** A clip as exposed by the share API — presigned, ready for the UI. */
export interface ClipItem {
  clipId: string;
  url: string;
  posterUrl: string;
  startTime: number;
  endTime: number;
  order: number;
}

export type PresignFn = (key: string) => Promise<string>;

/** Presigns a step's clips for the share response. `presign` is injectable. */
export async function mapClipsForStep(
  clips: Clip[] | undefined,
  presign: PresignFn,
): Promise<ClipItem[]> {
  return Promise.all((clips ?? []).map(async (c) => ({
    clipId: c.clipId,
    url: await presign(c.r2Key),
    posterUrl: await presign(c.posterR2Key),
    startTime: c.startTime,
    endTime: c.endTime,
    order: c.order,
  })));
}
