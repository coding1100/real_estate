import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getServerAuthSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getServerAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { domain, slug } = await req.json();
  if (!domain || !slug) {
    return NextResponse.json(
      { error: "Missing domain or slug" },
      { status: 400 },
    );
  }

  const path = `/${domain}/${slug}`;
  revalidatePath(path);

  return NextResponse.json({ revalidated: true, path });
}

