// Product photos come straight from a camera or design tool (a single PNG can weigh 1.5 MB), and the
// store shows them on every catalog card. Before uploading we shrink them to at most MAX_SIDE pixels
// and re-encode as JPEG. JPEG (not WebP) on purpose: Meta's product catalog, WhatsApp link previews
// and e-mail clients all accept it, while WebP is not universally supported there — Google Merchant
// Center flagged a WebP photo with "Tipo de imagem não aceito" (see docs/marketing-integrations.md).
// Transparent areas become white. If the JPEG re-encode fails outright, the original file is
// uploaded untouched as a last resort — but only a JPEG/PNG original is allowed to win on "the
// re-encode wasn't smaller"; any other original format (WebP, AVIF, HEIC, BMP, TIFF, ...) always
// gets converted, even if that means a slightly bigger file, because shipping a rejected format is
// worse than shipping a few extra KB.
const MAX_SIDE = 1400;
const JPEG_QUALITY = 0.85;
const ACCEPTED_ORIGINAL_TYPES = new Set(["image/jpeg", "image/png"]);

export type PreparedImage = {
  body: Blob;
  extension: string;
  contentType: string;
};

function original(file: File): PreparedImage {
  return {
    body: file,
    extension: file.name.split(".").pop()?.toLowerCase() || "jpg",
    contentType: file.type || "application/octet-stream",
  };
}

export async function prepareProductImage(file: File, maxSide: number = MAX_SIDE): Promise<PreparedImage> {
  // Animated / vector formats would lose their nature when drawn on a canvas.
  if (!file.type.startsWith("image/") || file.type === "image/gif" || file.type === "image/svg+xml") {
    return original(file);
  }

  try {
    const bitmap = await createImageBitmap(file); // honours the EXIF orientation
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      bitmap.close();
      return original(file);
    }
    // JPEG has no transparency: paint white first so transparent PNGs do not turn black.
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.imageSmoothingQuality = "high";
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
    );
    if (!blob || blob.type !== "image/jpeg") return original(file);

    // A JPEG/PNG original is allowed to stay as-is when the re-encode didn't help; anything else
    // (WebP, AVIF, HEIC, ...) always takes the JPEG version, win or lose on size.
    if (ACCEPTED_ORIGINAL_TYPES.has(file.type) && blob.size >= file.size) return original(file);

    return { body: blob, extension: "jpg", contentType: "image/jpeg" };
  } catch {
    return original(file);
  }
}
