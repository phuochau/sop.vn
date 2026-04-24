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
export function clipKey(sopId: string, i: number) {
  return `sops/${sopId}/step-${i}.mp4`;
}
export function posterKey(sopId: string, i: number) {
  return `sops/${sopId}/step-${i}.jpg`;
}

export function extFromMime(mime: string): string {
  return ({ "video/mp4":"mp4","video/quicktime":"mov","video/webm":"webm","video/x-msvideo":"avi" } as Record<string, string>)[mime] ?? "mp4";
}
