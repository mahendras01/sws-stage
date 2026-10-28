import assert from "node:assert/strict";
import test from "node:test";

import { detectImageMimeType, inferImageMimeFromSignature, resolveImageExtensionForMime, validateQrImageFile } from "../lib/image-file-validation.ts";

function imageBytesWithSignature(signature: Uint8Array, extra = Buffer.from("test")): Blob {
  return new Blob([Buffer.concat([Buffer.from(signature), Buffer.from(extra)])]);
}

test("detectImageMimeType recognizes PNG signature even when browser MIME is empty", async () => {
  const file = new File([imageBytesWithSignature(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x00]))], "qr.png", { type: "" });

  const mimeType = await detectImageMimeType(file);
  assert.equal(mimeType, "image/png");
});

test("detectImageMimeType recognizes JPEG signature with a misleading MIME label", async () => {
  const file = new File([imageBytesWithSignature(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]))], "qr.jpg", { type: "image/pjpeg" });

  const mimeType = await detectImageMimeType(file);
  assert.equal(mimeType, "image/jpeg");
});

test("detectImageMimeType recognizes WebP signature even when the extension is not present", async () => {
  const file = new File([imageBytesWithSignature(new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]))], "qr.bin", { type: "" });

  const mimeType = await detectImageMimeType(file);
  assert.equal(mimeType, "image/webp");
});

test("inferImageMimeFromSignature rejects non-image data", () => {
  assert.equal(inferImageMimeFromSignature(new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b])), null);
});

test("validateQrImageFile rejects unsupported or empty files", async () => {
  const empty = new File([new Blob([])], "empty.png", { type: "image/png" });
  const invalid = new File(["not an image"], "bad.txt", { type: "text/plain" });

  const emptyResult = await validateQrImageFile(empty);
  assert.equal(emptyResult.valid, false);

  const invalidResult = await validateQrImageFile(invalid);
  assert.equal(invalidResult.valid, false);
});

test("resolveImageExtensionForMime keeps the correct extension for accepted image types", () => {
  assert.equal(resolveImageExtensionForMime("image/png"), ".png");
  assert.equal(resolveImageExtensionForMime("image/jpeg"), ".jpg");
  assert.equal(resolveImageExtensionForMime("image/webp"), ".webp");
});
