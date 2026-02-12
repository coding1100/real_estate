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
    const result = await new Promise<any>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "real-estate",
          resource_type: "image",
        },
        (error, uploaded) => {
          if (error) reject(error);
          else resolve(uploaded);
        },
      );
      stream.end(buffer);
    });

    return NextResponse.json(
      { url: result.secure_url as string },
      { status: 200 },
    );
  } catch (e) {
    console.error("Cloudinary upload failed", e);
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 },
    );
  }
}

