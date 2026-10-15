"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getMogobeProducts, money, readMogobeCart, writeMogobeCart, type MogobeCartLine, type MogobeProduct } from "@/lib/mogobe/catalogue";

const categories = ["All", "Beef", "Boroso", "Offal", "Specials"];

export default function MogobeStorefront() {
  const [products, setProducts] = useState<MogobeProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [cartCount, setCartCount] = useState(0);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    void getMogobeProducts().then((items) => { if (active) setProducts(items); }).finally(() => { if (active) setLoading(false); });
    const refreshCart = () => setCartCount(readMogobeCart().reduce((sum, item) => sum + item.quantity, 0));
    refreshCart();
    window.addEventListener("mogobe-cart-updated", refreshCart);
    return () => { active = false; window.removeEventListener("mogobe-cart-updated", refreshCart); };
  }, []);

  const visible = useMemo(() => products.filter((item) =>
    (category === "All" || item.category === category) &&
    (item.name + " " + item.category + " " + item.description).toLowerCase().includes(search.toLowerCase())
  ), [products, category, search]);

  function add(product: MogobeProduct) {
    const quantity = quantities[product.id] ?? (product.unit === "kg" ? 1 : 1);
    const cart = readMogobeCart();
    const existing = cart.find((line) => line.productId === product.id);
    const line: MogobeCartLine = { productId: product.id, name: product.name, category: product.category, price: product.price, unit: product.unit, imageUrl: product.imageUrl, quantity: (existing?.quantity ?? 0) + quantity };
    writeMogobeCart(existing ? cart.map((item) => item.productId === product.id ? line : item) : [...cart, line]);
    setNotice(product.name + " added to your basket.");
    window.setTimeout(() => setNotice(""), 2600);
  }

  return <main className="mogobeStore">
    <div className="mogobeTopline"><span>AFRICAN MALL · UNIT 6 · GABORONE</span><span>MON–SAT · 08:00–18:00</span></div>
    <header className="mogobeHeader">
      <Link href="/" className="mogobeWordmark" aria-label="Mogobe Butchery home"><span className="mogobeBrandIcon">M</span><span><strong>MOGOBE</strong><small>BUTCHERY · GABORONE</small></span></Link>
      <nav aria-label="Main navigation"><Link href="#shop">Shop meat</Link><Link href="#how-it-works">How it works</Link></nav>
      <div className="mogobeHeaderActions"><button type="button" className="mogobeInstallButton" onClick={() => window.dispatchEvent(new Event("theplug-open-install"))}>Install app</button><Link href="/basket" className="mogobeBasketLink">Basket <span>{Math.round(cartCount * 100) / 100}</span></Link></div>
    </header>

    <section className="mogobeHero">
      <div className="mogobeHeroCopy">
        <span className="mogobeEyebrow">GOOD MEAT. GOOD PEOPLE.</span>
        <h1>Bring the<br/><em>braai home.</em></h1>
        <p>Shop Mogobe favourites, choose your quantities and send your order request in minutes. We’ll confirm availability, final weight and collection details before your order is accepted.</p>
        <div className="mogobeHeroActions"><a href="#shop" className="mogobePrimaryButton">Shop the butchery <span aria-hidden="true">↘</span></a><Link href="/basket" className="mogobeTextLink">View basket ↗</Link></div>
        <div className="mogobeTrustLine"><span>01 / Choose your cuts</span><span>02 / Request collection or delivery</span><span>03 / Mogobe confirms your order</span></div>
      </div>
      <div className="mogobeHeroImage"><img src="/mogobe-meat-placeholder.svg" alt="Illustration of fresh meat cuts" /><span className="mogobeImageStamp">MADE FOR<br/>THE TABLE</span></div>
    </section>

    <section className="mogobeShopSection" id="shop">
      <div className="mogobeSectionIntro"><div><span className="mogobeEyebrow">FROM OUR COUNTER</span><h2>Shop the cuts.</h2></div><p>Prices shown are guides. Final price and availability are confirmed by Mogobe before acceptance.</p></div>
      <div className="mogobeShopTools"><label className="mogobeSearch"><span aria-hidden="true">⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search beef, boroso, offal…" aria-label="Search products" /></label><div className="mogobeCategoryTabs" aria-label="Product categories">{categories.map((item) => <button type="button" key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)} aria-pressed={category === item}>{item}</button>)}</div></div>
      {notice && <p className="mogobeToast" role="status">{notice}</p>}
      {loading ? <div className="mogobeEmpty">Loading the counter…</div> : visible.length ? <div className="mogobeProductGrid">{visible.map((product, index) => <article className="mogobeProductCard" key={product.id}>
        <Link href={"/products/" + encodeURIComponent(product.id)} className="mogobeProductImage"><img src={product.imageUrl || "/mogobe-meat-placeholder.svg"} alt={product.name} loading={index > 3 ? "lazy" : "eager"} /><span>{product.category}</span></Link>
        <div className="mogobeProductCardBody"><div className="mogobeProductTitleRow"><h3>{product.name}</h3><strong>{money(product.price)}<small> / {product.unit === "kg" ? "kg" : product.unit}</small></strong></div><p>{product.description}</p><div className="mogobeProductControls"><label htmlFor={"qty-" + product.id}>{product.unit === "kg" ? "Weight" : "Quantity"}<select id={"qty-" + product.id} value={quantities[product.id] ?? 1} onChange={(event) => setQuantities((old) => ({ ...old, [product.id]: Number(event.target.value) }))}>{(product.unit === "kg" ? [0.5, 1, 1.5, 2, 3, 5] : [1, 2, 3, 4, 5]).map((value) => <option value={value} key={value}>{product.unit === "kg" ? value + " kg" : value}</option>)}</select></label><button type="button" onClick={() => add(product)} className="mogobeAddButton">Add to basket <span aria-hidden="true">＋</span></button></div></div>
      </article>)}</div> : <div className="mogobeEmpty"><strong>No cuts match that search.</strong><p>Try another name or category.</p></div>}
      <p className="mogobePriceNote">Indicative pricing only. Weight-based orders are finalised against the actual packed weight and confirmed price.</p>
    </section>

    <section className="mogobeHowSection" id="how-it-works"><span className="mogobeEyebrow">SIMPLE FROM START TO PICKUP</span><h2>Your order.<br/><em>Your way.</em></h2><div className="mogobeHowGrid"><article><span>01</span><h3>Fill your basket</h3><p>Choose the cuts and quantities that suit your table.</p></article><article><span>02</span><h3>Send a request</h3><p>Choose collection or delivery and leave any useful notes.</p></article><article><span>03</span><h3>We confirm</h3><p>Mogobe checks availability, actual weight, final price and timing before accepting.</p></article></div></section>

    <footer className="mogobeFooter"><div><Link href="/" className="mogobeWordmark"><span className="mogobeBrandIcon">M</span><span><strong>MOGOBE</strong><small>BUTCHERY · GABORONE</small></span></Link><p>African Mall, Unit 6, Gaborone, Botswana</p></div><div className="mogobeFooterLinks"><a href="tel:+26772815632">+267 72 815 632</a><a href="tel:+26778024125">+267 78 024 125</a><Link href="/basket">Your basket ↗</Link><Link href="/admin">Admin</Link></div><small>© {new Date().getFullYear()} Mogobe Butchery</small></footer>
  </main>;
}
