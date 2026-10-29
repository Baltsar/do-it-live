// What a file really is, read from its first bytes. A folder of downloads lies: Giphy "gifs" are
// often WebP or MP4, names are "download (3)" or wrong. Shared by the browser and the server.

export interface Sniffed {
  mime: string;
  ext: string;
}

const ascii = (bytes: Uint8Array, from: number, to: number): string => String.fromCharCode(...bytes.subarray(from, to));

/** The real type of a file from its first 16 bytes, or null when a slide cannot show it. */
export function sniff(head: Uint8Array): Sniffed | null {
  if (head.length < 12) return null;
  if (ascii(head, 0, 6) === "GIF87a" || ascii(head, 0, 6) === "GIF89a") return { mime: "image/gif", ext: ".gif" };
  if (head[0] === 0x89 && ascii(head, 1, 4) === "PNG") return { mime: "image/png", ext: ".png" };
  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return { mime: "image/jpeg", ext: ".jpg" };
  if (ascii(head, 0, 4) === "RIFF" && ascii(head, 8, 12) === "WEBP") return { mime: "image/webp", ext: ".webp" };
  if (head[0] === 0x1a && head[1] === 0x45 && head[2] === 0xdf && head[3] === 0xa3) return { mime: "video/webm", ext: ".webm" };
  // ISO media: MP4 and its cousins. HEIC and AVIF stills share the box but browsers cannot all show them.
  if (ascii(head, 4, 8) === "ftyp") {
    const brand = ascii(head, 8, 12);
    if (/^(heic|heix|mif1|msf1|avif|avis)$/.test(brand)) return null;
    return { mime: "video/mp4", ext: ".mp4" };
  }
  return null;
}

/** First bytes of a browser File, for sniffing before anything is uploaded. */
export async function sniffFile(file: Blob): Promise<Sniffed | null> {
  return sniff(new Uint8Array(await file.slice(0, 16).arrayBuffer()));
}

/**
 * Animated WebP and APNG move, a one-frame GIF does not. Only the container is checked here; the
 * browser counts GIF frames while it extracts them, which is exact where a byte scan is not.
 */
export function stillContainerMoves(bytes: Uint8Array, mime: string): boolean {
  if (mime === "image/webp") return ascii(bytes, 12, 16) === "VP8X" && (bytes[20] & 0x02) !== 0;
  if (mime === "image/png") {
    // acTL comes before the first IDAT in an animated PNG.
    const text = ascii(bytes, 0, Math.min(bytes.length, 4096));
    const actl = text.indexOf("acTL");
    return actl >= 0 && (text.indexOf("IDAT") < 0 || actl < text.indexOf("IDAT"));
  }
  return false;
}
