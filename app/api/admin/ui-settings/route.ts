import { NextRequest, NextResponse } from "next/server";
import {
  getAdminUiSettings,
  updateAdminUiSettings,
} from "@/lib/uiSettings";

export async function GET() {
  const { settings, theme } = await getAdminUiSettings();
  return NextResponse.json({ settings, theme });
}

export async function PATCH(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Partial<{
    toastSuccessBg: string;
    toastSuccessText: string;
    toastErrorBg: string;
    toastErrorText: string;
    toastAlertBg: string;
    toastAlertText: string;
    toastInfoBg: string;
    toastInfoText: string;
    toastIconSize: number;
    toastSuccessTitle: string;
    toastSuccessBody: string;
    toastErrorTitle: string;
    toastErrorBody: string;
    toastAlertTitle: string;
    toastAlertBody: string;
  }>;

  const allowed: Record<string, string | number | undefined> = {};
  if (typeof body.toastSuccessBg === "string") {
    allowed.toastSuccessBg = body.toastSuccessBg;
  }
  if (typeof body.toastSuccessText === "string") {
    allowed.toastSuccessText = body.toastSuccessText;
  }
  if (typeof body.toastErrorBg === "string") {
    allowed.toastErrorBg = body.toastErrorBg;
  }
  if (typeof body.toastErrorText === "string") {
    allowed.toastErrorText = body.toastErrorText;
  }
  if (typeof body.toastAlertBg === "string") {
    allowed.toastAlertBg = body.toastAlertBg;
  }
  if (typeof body.toastAlertText === "string") {
    allowed.toastAlertText = body.toastAlertText;
  }
  if (typeof body.toastInfoBg === "string") {
    allowed.toastInfoBg = body.toastInfoBg;
  }
  if (typeof body.toastInfoText === "string") {
    allowed.toastInfoText = body.toastInfoText;
  }
  if (
    typeof body.toastIconSize === "number" &&
    body.toastIconSize >= 14 &&
    body.toastIconSize <= 40
  ) {
    allowed.toastIconSize = body.toastIconSize;
  }
  if (typeof body.toastSuccessTitle === "string") {
    allowed.toastSuccessTitle = body.toastSuccessTitle;
  }
  if (typeof body.toastSuccessBody === "string") {
    allowed.toastSuccessBody = body.toastSuccessBody;
  }
  if (typeof body.toastErrorTitle === "string") {
    allowed.toastErrorTitle = body.toastErrorTitle;
  }
  if (typeof body.toastErrorBody === "string") {
    allowed.toastErrorBody = body.toastErrorBody;
  }
  if (typeof body.toastAlertTitle === "string") {
    allowed.toastAlertTitle = body.toastAlertTitle;
  }
  if (typeof body.toastAlertBody === "string") {
    allowed.toastAlertBody = body.toastAlertBody;
  }

  const { settings, theme } = await updateAdminUiSettings(allowed);
  return NextResponse.json({ settings, theme });
}

