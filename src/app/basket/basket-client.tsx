"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { money, readMogobeCart, writeMogobeCart, type MogobeCartLine } from "@/lib/mogobe/catalogue";

export default function BasketClient() {
  const [lines, setLines] = useState<MogobeCartLine[]>([]);
  useEffect(() => { setLines(readMogobeCart()); }, []);
  const total = useMemo(() => lines.reduce((sum, item) => sum + item.price * item.quantity, 0), [lines]);
  function save(next: MogobeCartLine[]) { setLines(next); writeMogobeCart(next); }
  function change(line: MogobeCartLine, quantity: number) {
    if (quantity <= 0) save(lines.filter((item) => item.productId !== line.productId));
    else save(lines.map((item) => item.productId === line.productId ? { ...item, quantity } : item));
  }

  return <main className="mogobeInnerPage"><header className="mogobeInnerHeader"><Link href="/" className="mogobeBackLink">← Continue shopping</Link><span className="mogobeEyebrow">YOUR SELECTION</span><h1>Your basket.</h1><p>Check your cuts and quantities before sending Mogobe your order request.</p></header>
    {lines.length ? <><div className="mogobeBasketList">{lines.map((line) => <article className="mogobeBasketRow" key={line.productId}><img src={line.imageUrl || "/mogobe-meat-placeholder.svg"} alt="" /><div className="mogobeBasketItem"><strong>{line.name}</strong><small>{money(line.price)} / {line.unit === "kg" ? "kg" : line.unit}</small><label>Quantity <select value={line.quantity} onChange={(event) => change(line, Number(event.target.value))}>{(line.unit === "kg" ? [0.5, 1, 1.5, 2, 2.5, 3, 4, 5] : [1, 2, 3, 4, 5, 6, 8, 10]).map((value) => <option key={value} value={value}>{line.unit === "kg" ? value + " kg" : value}</option>)}</select></label></div><div className="mogobeBasketLineTotal"><strong>{money(line.price * line.quantity)}</strong><button type="button" onClick={() => change(line, 0)} aria-label={"Remove " + line.name}>Remove</button></div></article>)}</div><aside className="mogobeBasketSummary"><div><span>Estimated subtotal</span><strong>{money(total)}</strong></div><p>This is an estimate. Final weight, price, delivery charges (if applicable) and availability are confirmed by Mogobe.</p><Link href="/checkout" className="mogobePrimaryButton">Continue to checkout <span aria-hidden="true">→</span></Link></aside></> : <div className="mogobeEmpty mogobeEmptyLarge"><img src="/mogobe-meat-placeholder.svg" alt="" /><h2>Your basket is waiting.</h2><p>Pick your cuts from the Mogobe counter and they’ll appear here.</p><Link href="/#shop" className="mogobePrimaryButton">Browse the counter ↗</Link></div>}
  </main>;
}
