import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { customAlphabet } from "nanoid";
import { config } from "@/config";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
export const newShareToken = customAlphabet(alphabet, config.app.shareTokenLength);

export function videoKey(sopId: string, ext: string) {
  return `sops/${sopId}/source.${ext}`;
}
export function keyframeKey(sopId: string, stepIndex: number, frameIndex: number) {
  return `sops/${sopId}/step-${stepIndex}-frame-${frameIndex}.jpg`;
}
export function screenshotKey(sopId: string, stepIndex: number, frameId: string) {
  return `sops/${sopId}/screenshots/step-${stepIndex}/${frameId}.jpg`;
}
export function clipKey(sopId: string, stepIndex: number, clipId: string) {
  return `sops/${sopId}/clips/step-${stepIndex}/${clipId}.mp4`;
}
export function clipPosterKey(sopId: string, stepIndex: number, clipId: string) {
  return `sops/${sopId}/clips/step-${stepIndex}/${clipId}-poster.jpg`;
}
export function extFromMime(mime: string): string {
  return ({ "video/mp4":"mp4","video/quicktime":"mov","video/webm":"webm","video/x-msvideo":"avi" } as Record<string, string>)[mime] ?? "mp4";
}
