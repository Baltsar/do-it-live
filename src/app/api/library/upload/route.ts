import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { libraryPrefix, withLibrary } from "@/lib/library-store";

// Hosted uploads go from the browser straight to Blob (a function takes at most 4.5 MB). This route only
// signs the upload, and only into the visitor's own folder.
const TYPES = ["image/gif", "image/webp", "image/png", "image/jpeg", "video/mp4", "video/webm"];

export async function POST(req: Request): Promise<Response> {
  return withLibrary(req, async () => {
    try {
      const body = (await req.json()) as HandleUploadBody;
      const signed = await handleUpload({
        body,
        request: req,
        onBeforeGenerateToken: async (pathname) => {
          const prefix = libraryPrefix();
          if (!prefix || !pathname.startsWith(`${prefix}/uploads/`) || pathname.includes("..")) throw new Error("Not your library.");
          return { allowedContentTypes: TYPES, maximumSizeInBytes: 40 * 1024 * 1024, addRandomSuffix: true };
        },
      });
      return Response.json(signed);
    } catch (err) {
      return Response.json({ error: err instanceof Error ? err.message : "upload refused" }, { status: 400 });
    }
  });
}
