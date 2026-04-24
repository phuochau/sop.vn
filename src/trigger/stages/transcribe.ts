import { transcribeVideo } from "@/lib/fal";
export async function runTranscribe(signedVideoUrl: string) {
  return transcribeVideo(signedVideoUrl);
}
