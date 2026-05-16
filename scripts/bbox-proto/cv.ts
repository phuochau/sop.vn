/**
 * OpenCV (WASM) loader.
 *
 * Two traps this works around:
 *  1. The WASM runtime initializes asynchronously after import — we poll for
 *     `cv.Mat` becoming a function.
 *  2. The Emscripten module object is a *thenable* (it has a `.then`). Returning
 *     it from an async function makes the promise machinery try to unwrap the
 *     thenable, which chains to itself and never settles. So once initialized
 *     we delete `.then`, making it a plain object that is safe to await on.
 */
import cvModule from "@techstark/opencv-js";

const ready: Promise<typeof cvModule> = (async () => {
  const deadline = Date.now() + 60_000;
  while (typeof (cvModule as { Mat?: unknown }).Mat !== "function") {
    if (Date.now() > deadline) throw new Error("OpenCV WASM failed to initialize in 60s");
    await new Promise<void>((r) => setTimeout(r, 50));
  }
  // Strip the thenable trap before this object becomes a promise resolution value.
  if ("then" in (cvModule as object)) {
    delete (cvModule as { then?: unknown }).then;
  }
  return cvModule;
})();

export function getCv(): Promise<typeof cvModule> {
  return ready;
}
