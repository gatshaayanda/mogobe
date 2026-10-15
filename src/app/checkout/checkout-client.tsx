"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { signInAnonymously } from "firebase/auth";
import { auth, db, hasFirebaseWebConfig } from "@/lib/firebase/client";
import { money, readMogobeCart, writeMogobeCart, type MogobeCartLine } from "@/lib/mogobe/catalogue";

function localDateTime() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60000).toISOString().slice(0, 16);
}

export default function CheckoutClient() {
  const [lines, setLines] = useState<MogobeCartLine[]>([]);
  const [mode, setMode] = useState<"pickup" | "delivery">("pickup");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");
  const [preferredAt, setPreferredAt] = useState("");
  useEffect(() => { setLines(readMogobeCart()); setPreferredAt(localDateTime()); }, []);
  const subtotal = useMemo(() => lines.reduce((sum, item) => sum + item.price * item.quantity, 0), [lines]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (!lines.length) { setError("Your basket is empty. Add some cuts before checking out."); return; }
    if (!hasFirebaseWebConfig) { setError("Ordering is not connected yet. Your basket is still saved on this device; please try again later."); return; }
    setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    const customerName = String(form.get("customerName") ?? "").trim();
    const phone = String(form.get("phone") ?? "").trim();
    const deliveryLocation = mode === "delivery" ? String(form.get("deliveryLocation") ?? "").trim() : "";
    const instructions = String(form.get("instructions") ?? "").trim();
    if (!customerName || !phone || !preferredAt || (mode === "delivery" && !deliveryLocation)) {
      setError("Please complete your name, phone number, preferred time and delivery location where needed.");
      setBusy(false); return;
    }
    if (new Date(preferredAt).getTime() < Date.now() - 60000) {
      setError("Choose a future preferred time.");
      setBusy(false); return;
    }
    try {
      const user = auth.currentUser ?? (await signInAnonymously(auth)).user;
      const id = doc(collectionRef()).id;
      const createdAt = new Date().toISOString();
      const order = {
        customerId: user.uid,
        createdAt,
        customerName,
        phone,
        mode,
        scheduledFor: new Date(preferredAt).toISOString(),
        deliveryLocation,
        instructions,
        items: lines.map((item) => ({ name: item.name, productId: item.productId, category: item.category, price: item.price, quantity: item.quantity, unit: item.unit, lineTotal: Math.round(item.price * item.quantity * 100) / 100 })),
        total: Math.round(subtotal * 100) / 100,
        status: "New"
      };
      await setDoc(doc(db, "orders", id), order);
      setReference(id);
      writeMogobeCart([]);
      setLines([]);
    } catch (caught) {
      console.error("Mogobe order request failed", caught);
      setError("We couldn’t send your request. Your basket has been kept; check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  function collectionRef() {
    // Generate an order reference using the configured Firestore collection.
    return doc(db, "orders");
  }

  if (reference) return <main className="mogobeInnerPage"><section className="mogobeSuccess"><span className="mogobeSuccessIcon">✓</span><span className="mogobeEyebrow">REQUEST RECEIVED</span><h1>Thank you.<br/><em>We’ll confirm next.</em></h1><p>Your reference is <strong>{reference.slice(0, 8).toUpperCase()}</strong>. Mogobe will review availability, actual weight, final pricing and your preferred time.</p><div className="mogobePendingNotice"><strong>This is not yet a confirmed order.</strong><span>Please wait for Mogobe to accept the request and confirm the details.</span></div><Link href="/" className="mogobePrimaryButton">Back to the counter ↗</Link></section></main>;

  if (!lines.length) return <main className="mogobeInnerPage"><Link href="/#shop" className="mogobeBackLink">← Browse the counter</Link><div className="mogobeEmpty mogobeEmptyLarge"><h1>Your basket is empty.</h1><p>Add your cuts before checking out.</p><Link href="/#shop" className="mogobePrimaryButton">Shop Mogobe ↗</Link></div></main>;

  return <main className="mogobeInnerPage"><header className="mogobeInnerHeader"><Link href="/basket" className="mogobeBackLink">← Back to basket</Link><span className="mogobeEyebrow">LAST STEP</span><h1>Send your request.</h1><p>Choose collection or delivery and tell us how to reach you. Your order stays pending until Mogobe confirms it.</p></header>
    <div className="mogobeCheckoutGrid"><form className="mogobeCheckoutForm" onSubmit={submit}>
      <section><h2>1. Your details</h2><div className="mogobeFormGrid"><label>Full name<input name="customerName" autoComplete="name" required maxLength={100} /></label><label>Phone number<input name="phone" type="tel" autoComplete="tel" required maxLength={30} placeholder="+267 …" /></label></div></section>
      <section><h2>2. Collection or delivery</h2><div className="mogobeModeChoices"><label className={mode === "pickup" ? "selected" : ""}><input type="radio" name="mode" checked={mode === "pickup"} onChange={() => setMode("pickup")} /> <span><strong>Collect at Mogobe</strong><small>African Mall, Unit 6</small></span></label><label className={mode === "delivery" ? "selected" : ""}><input type="radio" name="mode" checked={mode === "delivery"} onChange={() => setMode("delivery")} /> <span><strong>Delivery request</strong><small>We’ll confirm coverage and any fee</small></span></label></div>
      {mode === "delivery" && <label className="mogobeFormFull">Delivery address or landmark<textarea name="deliveryLocation" required rows={3} maxLength={500} placeholder="Area, plot, street or nearby landmark" /></label>}
      <label className="mogobeFormFull">Preferred collection/delivery time<input type="datetime-local" min={localDateTime()} value={preferredAt} onChange={(event) => setPreferredAt(event.target.value)} required /><small>This is a preference, not a reserved slot. Mogobe will confirm the time.</small></label>
      <label className="mogobeFormFull">Notes for the butchery (optional)<textarea name="instructions" rows={3} maxLength={1000} placeholder="Preferred cut, portioning, or other instructions" /></label></section>
      {error && <p className="mogobeFormError" role="alert">{error}</p>}
      <button className="mogobePrimaryButton" type="submit" disabled={busy}>{busy ? "Sending request…" : "Send order request"} <span aria-hidden="true">→</span></button>
      <p className="mogobeCheckoutFineprint">No payment is taken in this step. Your request is not accepted until Mogobe confirms it.</p>
    </form><aside className="mogobeCheckoutSummary"><span className="mogobeEyebrow">YOUR BASKET</span><h2>Order summary</h2>{lines.map((line) => <div className="mogobeSummaryLine" key={line.productId}><span>{line.quantity} {line.unit === "kg" ? "kg" : "×"} {line.name}</span><strong>{money(line.price * line.quantity)}</strong></div>)}<div className="mogobeSummaryTotal"><span>Estimated subtotal</span><strong>{money(subtotal)}</strong></div><p>Final weight and price are confirmed by Mogobe. Delivery fees, if any, are confirmed before acceptance.</p></aside></div>
  </main>;
}
