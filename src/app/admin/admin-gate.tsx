"use client";

import { onAuthStateChanged, signInWithCustomToken, signOut, type User } from "firebase/auth";
import Link from "next/link";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import { auth, db, hasFirebaseWebConfig } from "@/lib/firebase/client";

function hasAdminRole(data: Record<string, unknown> | undefined) {
  return ["owner", "staff"].includes(String(data?.role ?? "").toLowerCase());
}

function friendlyError(error: unknown) {
  const code = typeof error === "object" && error !== null && "code" in error ? String((error as {code?: unknown}).code) : "";
  if (code === "auth/too-many-requests") return "Too many attempts. Please wait a moment and try again.";
  if (code === "auth/network-request-failed") return "We could not reach the sign-in service. Check your connection.";
  if (["auth/invalid-custom-token", "auth/custom-token-mismatch", "auth/invalid-user-token"].includes(code)) return "Admin sign-in could not be verified. Check the access word and try again.";
  return error instanceof Error ? error.message : "We could not sign you in. Check the access word and try again.";
}

export default function AdminGate({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [accessError, setAccessError] = useState("");
  const [accessWord, setAccessWord] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let stopAdmin: (() => void) | undefined;
    const stopAuth = onAuthStateChanged(auth, (next) => {
      stopAdmin?.();
      stopAdmin = undefined;
      setUser(next);
      setAuthorized(false);
      setChecking(Boolean(next));
      setAccessError("");
      if (!next) { setChecking(false); return; }
      stopAdmin = onSnapshot(doc(db, "admins", next.uid), (snapshot) => {
        const allowed = snapshot.exists() && hasAdminRole(snapshot.data());
        setAuthorized(allowed);
        setChecking(false);
        if (!allowed) {
          setAccessError("This account does not have a Mogobe owner or staff role.");
          void signOut(auth);
        }
      }, () => {
        setChecking(false);
        setAccessError("We could not verify your admin role. Check your connection and try again.");
      });
    });
    return () => { stopAdmin?.(); stopAuth(); };
  }, []);

  async function signIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setAccessError("");
    if (!hasFirebaseWebConfig) {
      setAccessError("Mogobe sign-in is not configured in this environment. Set the Mogobe Firebase web configuration before testing admin access.");
      setBusy(false);
      return;
    }
    try {
      const response = await fetch("/api/operations-login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ word: accessWord }),
      });
      const payload = await response.json() as { token?: string; error?: string };
      if (!response.ok || !payload.token) throw new Error(payload.error ?? "Access denied. Check the access word and try again.");
      const credential = await signInWithCustomToken(auth, payload.token);
      const role = await getDoc(doc(db, "admins", credential.user.uid));
      if (!role.exists() || !["owner", "staff"].includes(String(role.data().role).toLowerCase())) {
        await signOut(auth);
        throw new Error("This access account is not authorised for Mogobe Admin.");
      }
      setAccessWord("");
    } catch (error) {
      setAccessError(friendlyError(error));
    } finally {
      setBusy(false);
    }
  }

  if (checking) return <main className="mogobeAdmin"><div className="mogobeAdminShell"><p role="status">Checking Mogobe admin access…</p></div></main>;
  if (user && authorized) return <div className="mogobeAdminAuthorized"><div className="mogobeAdminAccount"><span><strong>Mogobe Admin</strong><small>{user.email ?? "Authorised staff"}</small></span><button type="button" onClick={() => void signOut(auth)}>Sign out</button></div>{children}</div>;

  return <main className="mogobeAdmin"><div className="mogobeAdminShell"><Link className="mogobeAdminBack" href="/">← Back to Mogobe Butchery</Link><section className="mogobeAdminLogin"><span className="mogobeAdminEyebrow">MOGOBE · ADMIN ACCESS</span><h1>Good to see you.</h1><p>Enter the Mogobe admin access word to continue. Access is granted only to the server-provisioned owner account or an authorised staff role.</p><form onSubmit={signIn}><label>Access word<input type="password" autoComplete="current-password" required autoFocus value={accessWord} onChange={event=>setAccessWord(event.target.value)} /></label><button type="submit" disabled={busy}>{busy ? "Checking access…" : "Enter Admin"}</button></form>{accessError && <p role="alert" className="mogobeAdminError">{accessError}</p>}<p className="mogobeAdminHint">Customer accounts cannot grant themselves staff access. The access word is checked on the server and is never stored in the browser.</p></section></div></main>;
}
