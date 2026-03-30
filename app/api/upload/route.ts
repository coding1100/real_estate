import { NextRequest, NextResponse } from "next/server";
import { cloudinary } from "@/lib/cloudinary";
import { getServerAuthSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getServerAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  try {
    // Use Cloudinary "image" type for images, "raw" for documents (PDF, DOC, etc.).
    const isImage = file.type.startsWith("image/");
    const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: isImage ? "real-estate" : "real-estate-docs",
          resource_type: isImage ? "image" : "raw",
          // For documents, let Cloudinary derive a filename from the original
          // while keeping the asset public and avoiding ACL issues.
          ...(isImage
            ? {}
            : {
                use_filename: true,
                unique_filename: true,
              }),
        },
        (error, uploaded) => {
          if (error) reject(error);
          else resolve(uploaded);
        },
      );
      stream.end(buffer);
    });

    return NextResponse.json({
      url: result.secure_url,
      mimeType: file.type || null,
      originalName: file.name || null,
    });
  } catch (e) {
    console.error("Cloudinary upload failed", e);
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 },
    );
  }
}

