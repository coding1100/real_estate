import { readFile } from "node:fs/promises";

const FAVICON_SOURCE_PATH =
  "C:\\Users\\dell\\.cursor\\projects\\c-real-estate\\assets\\c__Users_dell_AppData_Roaming_Cursor_User_workspaceStorage_5dee1dd2267d240bc5e3e4efc75d5f97_images_favicon__2_-b218bd21-0be5-4cea-8d78-1aec578925d5.png";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const bytes = await readFile(FAVICON_SOURCE_PATH);
    return new Response(bytes, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    });
  } catch {
    return new Response("Favicon not found.", { status: 404 });
  }
}
