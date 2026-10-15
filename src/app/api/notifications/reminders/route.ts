import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { ok: false, error: "Mogobe reminders are not configured yet." },
    { status: 503, headers: { "Cache-Control": "no-store" } }
  );
}
