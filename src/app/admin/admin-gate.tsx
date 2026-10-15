"use client";

import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import { auth, db, hasFirebaseWebConfig } from "@/lib/firebase/client";

function hasAdminRole(data: Record<string, unknown> | undefined) {
  return ["owner", "staff"].includes(String(data?.role ?? "").toLowerCase());
}

function friendlyError(error: unknown) {
  const code = typeof error === "object" && error !== null && "code" in error ? String((error as {code?: unknown}).code) : "";
  if (["auth/invalid-credential", "auth/wrong-password", "auth/user-not-found", "auth/invalid-login-credentials"].includes(code)) return "Email or password was not recognised.";
  if (code === "auth/too-many-requests") return "Too many attempts. Please wait a moment and try again.";
  if (code === "auth/network-request-failed") return "We could not reach the sign-in service. Check your connection.";
  if (code === "auth/operation-not-allowed") return "Email/password sign-in is not enabled for this Firebase project.";
  return error instanceof Error ? error.message : "We could not sign you in.";
}

export default function AdminGate({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [accessError, setAccessError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      await signInWithEmailAndPassword(auth, email.trim(), password);
      setPassword("");
    } catch (error) {
      setAccessError(friendlyError(error));
    } finally {
      setBusy(false);
    }
  }

  if (checking) return <main className="mogobeAdmin"><div className="mogobeAdminShell"><p role="status">Checking Mogobe admin access…</p></div></main>;
  if (user && authorized) return <div className="mogobeAdminAuthorized"><div className="mogobeAdminAccount"><span><strong>Mogobe Admin</strong><small>{user.email ?? "Authorised staff"}</small></span><button type="button" onClick={() => void signOut(auth)}>Sign out</button></div>{children}</div>;

  return <main className="mogobeAdmin"><div className="mogobeAdminShell"><a className="mogobeAdminBack" href="/">← Back to Mogobe Butchery</a><section className="mogobeAdminLogin"><span className="mogobeAdminEyebrow">OWNER & STAFF ACCESS</span><h1>Good to see you.</h1><p>Sign in with your Mogobe staff account. Access is granted only when your Firebase account has an owner or staff role.</p><form onSubmit={signIn}><label>Email address<input type="email" autoComplete="username" required value={email} onChange={event=>setEmail(event.target.value)} /></label><label>Password<input type="password" autoComplete="current-password" required value={password} onChange={event=>setPassword(event.target.value)} /></label><button type="submit" disabled={busy}>{busy ? "Checking access…" : "Sign in to Mogobe"}</button></form>{accessError && <p role="alert" className="mogobeAdminError">{accessError}</p>}<p className="mogobeAdminHint">Admin accounts are provisioned separately. Customer accounts cannot grant themselves staff access.</p></section></div></main>;
}
