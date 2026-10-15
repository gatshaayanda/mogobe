import { createHash, timingSafeEqual } from "node:crypto";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const APP_NAME = "mogobe-one-word-admin";

function getServerApp() {
  const existing = getApps().find((app) => app.name === APP_NAME);
  if (existing) return existing;

  const raw = process.env.FIREBASE_ADMIN_KEY;
  if (!raw) throw new Error("FIREBASE_ADMIN_KEY is not configured.");

  const account = JSON.parse(raw) as {
    project_id: string;
    client_email: string;
    private_key: string;
  };

  return initializeApp({
    credential: cert({
      projectId: account.project_id,
      clientEmail: account.client_email,
      privateKey: account.private_key.replace(/\\n/g, "\n"),
    }),
    projectId: account.project_id,
  }, APP_NAME);
}

function matchesAccessWord(input: string, expected: string) {
  if (!input || input.length > 256) return false;
  const actualDigest = createHash("sha256").update(input).digest();
  const expectedDigest = createHash("sha256").update(expected).digest();
  return timingSafeEqual(actualDigest, expectedDigest);
}

export async function POST(request: Request) {
  try {
    const expected = process.env.ADMIN_PASSWORD;
    if (!expected) {
      return NextResponse.json(
        { error: "Mogobe admin access is not configured yet. Set ADMIN_PASSWORD in the server environment." },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }

    const body = await request.json().catch(() => null) as { word?: unknown } | null;
    const word = typeof body?.word === "string" ? body.word : "";
    if (!matchesAccessWord(word, expected)) {
      return NextResponse.json(
        { error: "Access denied. Check the access word and try again." },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      );
    }

    const uid = "mogobe-one-word-admin";
    const app = getServerApp();
    const db = getFirestore(app);
    const adminRef = db.collection("admins").doc(uid);
    const existing = await adminRef.get();

    if (!existing.exists) {
      await adminRef.set({
        role: "owner",
        temporaryAccess: true,
        accessMethod: "one-word-admin",
        createdAt: new Date().toISOString(),
      });
    } else if (!["owner", "staff"].includes(String(existing.data()?.role ?? "").toLowerCase())) {
      return NextResponse.json(
        { error: "This access account is not authorised for Mogobe Admin." },
        { status: 403, headers: { "Cache-Control": "no-store" } },
      );
    }

    const token = await getAuth(app).createCustomToken(uid);
    return NextResponse.json({ token }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[Mogobe] Admin sign-in failed:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json(
      { error: "Admin sign-in is temporarily unavailable. Check the server configuration." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
