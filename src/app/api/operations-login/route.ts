import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Mogobe admin access is not enabled yet. Please use the customer storefront." },
    { status: 503, headers: { "Cache-Control": "no-store" } }
  );
}
