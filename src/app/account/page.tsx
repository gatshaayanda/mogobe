"use client";

import Link from "next/link";
import { GoogleAuthProvider, linkWithPopup, onAuthStateChanged, signInWithPopup, signOut, type User } from "firebase/auth";
import { collection, doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { auth, db, hasFirebaseWebConfig } from "@/lib/firebase/client";
import { getCustomerProfile, saveCustomerProfile, subscribeToCustomerOrders, type CustomerProfile, type FoodOrder } from "@/lib/firebase/data";

type Membership = { uid: string; points: number; tier: string; createdAt: string; updatedAt: string };

export default function AccountPage() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [orders, setOrders] = useState<FoodOrder[]>([]);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [draft, setDraft] = useState({ name: "", phone: "", preferredDeliveryLocation: "", notes: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let stopOrders = () => {};
    let stopMembership = () => {};
    let active = true;
    const stopAuth = onAuthStateChanged(auth, async (nextUser) => {
      stopOrders(); stopMembership();
      setUser(nextUser); setOrders([]); setMembership(null); setProfile(null);
      if (!nextUser) { setDraft({ name: "", phone: "", preferredDeliveryLocation: "", notes: "" }); setLoading(false); return; }
      setLoading(true);
      try {
        const saved = await getCustomerProfile(nextUser.uid);
        if (!active) return;
        setProfile(saved);
        setDraft({ name: saved?.name ?? "", phone: saved?.phone ?? "", preferredDeliveryLocation: saved?.preferredDeliveryLocation ?? "", notes: saved?.notes ?? "" });
        stopOrders = subscribeToCustomerOrders(nextUser.uid, setOrders, () => setMessage("Order history could not be refreshed. Check your connection and try again."));
        if (!nextUser.isAnonymous) {
          const membershipRef = doc(db, "memberships", nextUser.uid);
          let membershipSnapshot = await getDoc(membershipRef);
          if (!membershipSnapshot.exists()) {
            const now = new Date().toISOString();
            await setDoc(membershipRef, { uid: nextUser.uid, points: 0, tier: "Member", createdAt: now, updatedAt: now });
            membershipSnapshot = await getDoc(membershipRef);
          }
          if (active) setMembership(membershipSnapshot.exists() ? { uid: membershipSnapshot.id, ...membershipSnapshot.data() } as Membership : null);
          stopMembership = onSnapshot(membershipRef, snapshot => {
            if (active) setMembership(snapshot.exists() ? { uid: snapshot.id, ...snapshot.data() } as Membership : null);
          }, () => { if (active) setMessage("Your loyalty balance is temporarily unavailable."); });
        }
      } catch {
        if (active) setMessage("Your account details could not be loaded. Your existing orders are not changed.");
      } finally { if (active) setLoading(false); }
    });
    return () => { active = false; stopOrders(); stopMembership(); stopAuth(); };
  }, []);

  async function connectAccount() {
    if (!hasFirebaseWebConfig) { setMessage("Account sign-in is not configured in this environment yet."); return; }
    setMessage("");
    try {
      const provider = new GoogleAuthProvider();
      if (user?.isAnonymous) await linkWithPopup(user, provider);
      else await signInWithPopup(auth, provider);
      setMessage("Your Google account is connected. Keep using this account to see your order history.");
    } catch (error) {
      const code = typeof error === "object" && error && "code" in error ? String((error as {code?:unknown}).code) : "";
      setMessage(code === "auth/credential-already-in-use" || code === "auth/account-exists-with-different-credential"
        ? "That Google account already has a separate Mogobe account. We have not merged histories or changed this session."
        : code === "auth/popup-closed-by-user" ? "Sign-in was cancelled. Your current session is unchanged."
        : "We could not connect that Google account. Your current session and orders are unchanged.");
    }
  }

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) { setMessage("Open your account session before saving details."); return; }
    setSaving(true); setMessage("");
    const now = new Date().toISOString();
    const next: CustomerProfile = { uid: user.uid, ...draft, email: user.email ?? profile?.email ?? "", createdAt: profile?.createdAt ?? now, updatedAt: now };
    try { await saveCustomerProfile(next); setProfile(next); setMessage("Your details have been saved for future orders."); }
    catch { setMessage("Your details could not be saved. Check your connection and try again."); }
    finally { setSaving(false); }
  }

  return <main className="orderPage"><div className="orderWrap">
    <div className="orderHeader"><Link href="/" className="logo"><span className="logoMark">M</span><span>Mogobe Butchery</span></Link><nav className="accountTopNav" aria-label="Account navigation"><Link className="button buttonLight" href="/">Shop meat</Link><Link className="button buttonLight" href="/community">Community</Link></nav></div>
    <section className="orderCard accountHome" style={{ maxWidth: 960, margin: "0 auto" }}>
      <div className="accountHero"><div><span className="kicker">MY MOGOBE</span><h1>Your orders, your way.</h1><p>Keep your details handy, follow order requests and build your Mogobe customer history.</p></div>{user && <span className="accountStatus">{user.isAnonymous ? "Guest session" : "Account connected"}</span>}</div>
      {message && <p className="notice" role="status">{message}</p>}
      {!user && !loading && <section className="accountConnect accountConnectPrimary"><div><strong>Keep your orders together.</strong><p>You can shop without an account. Connect Google when you want your order history and customer details to follow you across devices.</p></div><button className="button buttonPrimary" type="button" onClick={() => void connectAccount()}>Continue with Google</button></section>}
      {user?.isAnonymous && <section className="accountConnect accountConnectPrimary"><div><strong>Keep this guest order history.</strong><p>Connect Google to link this guest session instead of starting a separate account. If the Google account already belongs to another account, Mogobe will not merge the histories automatically.</p></div><button className="button buttonPrimary" type="button" onClick={() => void connectAccount()}>Connect Google</button></section>}
      {loading ? <p className="feedEmpty">Loading your Mogobe account…</p> : user ? <>
        <section className="accountSection"><div className="panelHeading"><div><span className="kicker">LOYALTY</span><h2>{membership?.points ?? 0} points</h2></div><span className="accountStatus">{membership?.tier ?? "Member"}</span></div><p className="orderTruth">Your balance reflects points recorded by Mogobe. Points are not a cash balance; any redemption offer will be shown here when the programme terms are published.</p></section>
        <section className="accountSection"><div className="panelHeading"><div><span className="kicker">ORDER HISTORY · {orders.length}</span><h2>Orders to keep track of.</h2></div><Link className="button buttonPrimary" href="/#shop">Shop again</Link></div>
          {orders.length === 0 ? <article className="feedEmpty"><strong>Your first order starts here.</strong><p>When you submit a request, it will appear here with its reference and current status.</p><Link className="button buttonPrimary" href="/#shop">Browse the butchery →</Link></article> : <div className="feedList">{orders.map(order => <article className="feedItem" key={order.id}><div className="panelHeading"><div><span className="kicker">ORDER · {order.id.slice(0, 8).toUpperCase()}</span><h3>{order.mode === "delivery" ? "Delivery request" : "Collection request"}</h3></div><span className="accountStatus">{order.status || "New"}</span></div><p>{order.items.map(item => item.name + " × " + item.quantity).join(" · ")}</p><p className="orderTruth">Estimated basket: P{Number(order.total ?? 0).toFixed(2)} · {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : "Date unavailable"}</p><p className="orderTruth">The request is not confirmed until Mogobe accepts it. Final packed weight, availability and price may change.</p><Link className="button buttonLight" href={"/orders/" + encodeURIComponent(order.id)}>Track this request →</Link></article>)}</div>}
        </section>
        <section className="accountSection" id="profile"><div className="panelHeading"><div><span className="kicker">YOUR DETAILS</span><h2>Faster next time.</h2></div></div><form className="adminForm" onSubmit={saveProfile}><label>Name<input required maxLength={100} value={draft.name} onChange={e=>setDraft(v=>({...v,name:e.target.value}))}/></label><label>Phone / WhatsApp<input required maxLength={40} value={draft.phone} onChange={e=>setDraft(v=>({...v,phone:e.target.value}))}/></label><label>Preferred delivery location<input maxLength={300} value={draft.preferredDeliveryLocation} onChange={e=>setDraft(v=>({...v,preferredDeliveryLocation:e.target.value}))}/></label><label>Order notes (optional)<textarea maxLength={500} rows={3} value={draft.notes} onChange={e=>setDraft(v=>({...v,notes:e.target.value}))}/></label><button className="button buttonPrimary" type="submit" disabled={saving}>{saving ? "Saving…" : "Save my details"}</button></form></section>
        <section className="accountSection"><div className="panelHeading"><div><span className="kicker">COMMUNITY</span><h2>Share a recipe or braai idea.</h2></div></div><p>Help other customers choose cuts, learn cooking tips and discover ideas from the Mogobe community. Posts are reviewed before they appear publicly.</p><Link className="button buttonPrimary" href="/community">Visit the community →</Link></section>
        {!user.isAnonymous && <button type="button" className="button buttonLight" onClick={() => void signOut(auth)}>Sign out</button>}
      </> : null}
      <footer className="accountFooter"><Link href="/">← Back to Mogobe Butchery</Link><span>African Mall · Unit 6 · Gaborone</span></footer>
    </section>
  </div></main>;
}
