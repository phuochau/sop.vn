import { test } from "node:test";
import assert from "node:assert";
import { renderSopPdf } from "./renderPdf";

test("renderSopPdf produces a non-empty PDF buffer", async () => {
  const buf = await renderSopPdf({
    title: "Pha cà phê espresso",
    category: "Coffee & Drinks",
    createdAt: new Date("2026-04-25T10:00:00Z"),
    overview: {
      purpose: "Hướng dẫn pha một ly espresso chuẩn.",
      audience: "Nhân viên pha chế mới.",
      prerequisites: ["Máy espresso đã được làm nóng"],
      toolsMaterials: ["Cà phê xay mịn", "Tamper"],
      estimatedDuration: "~3 phút",
    },
    steps: [
      {
        index: 0,
        title: "Xay cà phê",
        startTime: 0,
        endTime: 30,
        rewrite: {
          prose: "Xay 18g cà phê ở mức mịn vừa.",
          subBullets: ["Cân 18g hạt", "Xay ở mức 3"],
          callouts: [{ kind: "tip", text: "Xay ngay trước khi pha." }],
        },
        keyframes: [], // empty in test — renderer must handle missing images
        posterImage: null,
      },
    ],
  });
  assert.ok(buf instanceof Buffer);
  assert.ok(buf.length > 1000, `expected > 1KB PDF, got ${buf.length}`);
  // PDF magic number
  assert.equal(buf.subarray(0, 4).toString(), "%PDF");
});
