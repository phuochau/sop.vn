import ffmpeg from "fluent-ffmpeg";

/**
 * Trims `srcPath` to the span [startSec, endSec] and writes an mp4 to `outPath`.
 * Re-encodes (libx264/aac) so cut boundaries are frame-accurate rather than
 * snapped to keyframes; `-preset veryfast` keeps re-encode time low.
 * `-movflags +faststart` enables progressive web playback.
 */
export function extractClip(
  srcPath: string,
  outPath: string,
  startSec: number,
  endSec: number,
): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(srcPath)
      .seekInput(startSec)
      .duration(endSec - startSec)
      .videoCodec("libx264")
      .audioCodec("aac")
      .outputOptions(["-preset veryfast", "-movflags +faststart"])
      .on("end", () => resolve())
      .on("error", reject)
      .save(outPath);
  });
}
