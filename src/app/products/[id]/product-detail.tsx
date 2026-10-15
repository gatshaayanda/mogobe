"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { currentProductPrice, getMogobeProducts, isProductSpecialActive, money, readMogobeCart, writeMogobeCart, type MogobeProduct, type MogobeCartLine } from "@/lib/mogobe/catalogue";

export default function ProductDetail() {
  const [product, setProduct] = useState<MogobeProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    const id = decodeURIComponent(window.location.pathname.split("/").pop() || "");
    void getMogobeProducts().then((items) => setProduct(items.find((item) => item.id === id) ?? null)).finally(() => setLoading(false));
  }, []);
  function add() {
    if (!product) return;
    const lines = readMogobeCart();
    const existing = lines.find((item) => item.productId === product.id);
    const line: MogobeCartLine = { productId: product.id, name: product.name, category: product.category, price: currentProductPrice(product), unit: product.unit, imageUrl: product.imageUrl, quantity: (existing?.quantity ?? 0) + quantity };
    writeMogobeCart(existing ? lines.map((item) => item.productId === product.id ? line : item) : [...lines, line]);
    setNotice("Added to your basket.");
  }
  if (loading) return <main className="mogobeInnerPage"><p>Loading the cut…</p></main>;
  if (!product) return <main className="mogobeInnerPage"><Link href="/#shop" className="mogobeBackLink">← Back to the counter</Link><h1>Cut not found.</h1><p>This listing may have changed. Browse the current counter for available items.</p><Link href="/#shop" className="mogobePrimaryButton">Shop Mogobe ↗</Link></main>;
  return <main className="mogobeInnerPage">
    <Link href="/#shop" className="mogobeBackLink">← Back to the counter</Link>
    <div className="mogobeProductDetailGrid"><div className="mogobeProductDetailImage"><img src={product.imageUrl || "/mogobe-meat-placeholder.svg"} alt={product.name}/></div><section className="mogobeProductDetailCopy"><span className="mogobeEyebrow">{product.category}</span><h1>{product.name}</h1><strong className="mogobeDetailPrice">{isProductSpecialActive(product) ? <><span className="mogobeSpecialPrice">{money(currentProductPrice(product))}</span> <del>{money(product.price)}</del></> : money(product.price)} <small>/ {product.unit === "kg" ? "kg" : product.unit}</small></strong>{isProductSpecialActive(product)&&<span className="mogobeSpecialBadge">{product.specialLabel||"Limited-time special"}</span>}<p>{product.description}</p><p className="mogobeDetailNote">Indicative pricing only. Final price, actual packed weight and availability are confirmed by Mogobe before the order is accepted.</p><label className="mogobeDetailQuantity">{product.unit === "kg" ? "Choose weight" : "Quantity"}<select value={quantity} onChange={(event) => setQuantity(Number(event.target.value))}>{(product.unit === "kg" ? [0.5,1,1.5,2,3,5] : [1,2,3,4,5]).map((value) => <option key={value} value={value}>{product.unit === "kg" ? value + " kg" : value}</option>)}</select></label><button type="button" className="mogobePrimaryButton" onClick={add}>Add to basket <span aria-hidden="true">＋</span></button>{notice && <p className="mogobeToast" role="status">{notice} <Link href="/basket">View basket ↗</Link></p>}<Link href="/basket" className="mogobeDetailBasketLink">Review basket ↗</Link></section></div>
  </main>;
}
