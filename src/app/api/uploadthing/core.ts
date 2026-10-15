import { cert, getApp, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { UploadThingError } from "uploadthing/server";
import { createUploadthing, type FileRouter } from "uploadthing/next";

const f = createUploadthing();

function adminApp() {
  if (getApps().length) return getApp();
  const raw = process.env.FIREBASE_ADMIN_KEY;
  if (!raw) throw new UploadThingError("Mogobe uploads are not configured.");
  let serviceAccount: Record<string, unknown>;
  try { serviceAccount = JSON.parse(raw) as Record<string, unknown>; }
  catch { throw new UploadThingError("Mogobe upload credentials are invalid."); }
  return initializeApp({ credential: cert(serviceAccount as Parameters<typeof cert>[0]) });
}

export const ourFileRouter = {
  fileUploader: f({
    image: { maxFileSize: "4MB", maxFileCount: 1 },
    pdf: { maxFileSize: "4MB", maxFileCount: 1 },
  }).middleware(async ({ req }) => {
    const header = req.headers.get("authorization") || "";
    const match = header.match(/^Bearer\\s+(.+)$/i);
    if (!match) throw new UploadThingError("Sign in with a Mogobe staff account to upload files.");
    const app = adminApp();
    let uid: string;
    try { uid = (await getAuth(app).verifyIdToken(match[1])).uid; }
    catch { throw new UploadThingError("Your Mogobe staff session is invalid or expired."); }
    const admin = await getFirestore(app).collection("admins").doc(uid).get();
    const role = String(admin.data()?.role ?? "").toLowerCase();
    if (!admin.exists || !["owner", "staff"].includes(role)) throw new UploadThingError("Only authorised Mogobe staff can upload files.");
    return { uid };
  }).onUploadComplete(async ({ file, metadata }) => {
    console.info("[Mogobe] staff attachment uploaded", {
      uid: metadata.uid,
      name: file.name,
      size: file.size,
      type: file.type,
      urlAvailable: Boolean(file.url || file.ufsUrl),
    });
  }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
