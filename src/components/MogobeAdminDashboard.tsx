"use client";

import Link from "next/link";
import { addDoc, collection, deleteDoc, doc, onSnapshot, updateDoc } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { db } from "@/lib/firebase/client";
import { money, SEED_PRODUCTS, type MogobeProduct } from "@/lib/mogobe/catalogue";

type Order = { id: string; customerName?: string; phone?: string; mode?: string; scheduledFor?: string; deliveryLocation?: string; instructions?: string; items?: Array<{name?:string;quantity?:number;unit?:string;price?:number}>; total?: number; status?: string; createdAt?: string };
type ProductDraft = Omit<MogobeProduct,"id">;
const emptyDraft: ProductDraft = { name:"", category:"Beef", description:"", price:0, unit:"kg", imageUrl:"/mogobe-meat-placeholder.svg", available:true, sortOrder:50 };
const statuses = ["New","Reviewing","Accepted","Preparing","Ready","Completed","Declined"];

export default function MogobeAdminDashboard() {
  const [products,setProducts]=useState<MogobeProduct[]>([]);
  const [orders,setOrders]=useState<Order[]>([]);
  const [tab,setTab]=useState<"orders"|"catalogue">("orders");
  const [draft,setDraft]=useState<ProductDraft>(emptyDraft);
  const [editing,setEditing]=useState<string|null>(null);
  const [search,setSearch]=useState("");
  const [loadingProducts,setLoadingProducts]=useState(true);
  const [loadingOrders,setLoadingOrders]=useState(true);
  const [errors,setErrors]=useState("");
  const [notice,setNotice]=useState("");
  const [saving,setSaving]=useState(false);

  useEffect(()=>{
    const stopProducts=onSnapshot(collection(db,"products"),snapshot=>{
      setProducts(snapshot.docs.map(item=>({id:item.id,...item.data()} as MogobeProduct)).sort((a,b)=>(a.sortOrder??999)-(b.sortOrder??999)||a.name.localeCompare(b.name)));
      setLoadingProducts(false);
    },()=>{setErrors("Catalogue could not be loaded. Check Firestore access and your connection.");setLoadingProducts(false)});
    const stopOrders=onSnapshot(collection(db,"orders"),snapshot=>{
      setOrders(snapshot.docs.map(item=>({id:item.id,...item.data()} as Order)).sort((a,b)=>(b.createdAt??"").localeCompare(a.createdAt??"")));
      setLoadingOrders(false);
    },()=>{setErrors("Orders could not be loaded. Check Firestore access and your connection.");setLoadingOrders(false)});
    return ()=>{stopProducts();stopOrders()};
  },[]);

  const filtered=useMemo(()=>products.filter(p=>(p.name+" "+p.category+" "+p.description).toLowerCase().includes(search.toLowerCase())),[products,search]);
  const activeOrders=orders.filter(o=>!["Completed","Declined"].includes(o.status??""));
  const setField=<K extends keyof ProductDraft>(key:K,value:ProductDraft[K])=>setDraft(old=>({...old,[key]:value}));

  function startEdit(product:MogobeProduct){setEditing(product.id);setDraft({name:product.name,category:product.category,description:product.description,price:product.price,unit:product.unit,imageUrl:product.imageUrl,available:product.available,sortOrder:product.sortOrder});setErrors("");setNotice("");}
  function resetDraft(){setEditing(null);setDraft(emptyDraft);}

  async function saveProduct(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();setErrors("");setNotice("");
    const name=draft.name.trim(),category=draft.category.trim();
    if(!name||!category||!Number.isFinite(draft.price)||draft.price<0){setErrors("Enter a product name, category and valid non-negative price.");return;}
    setSaving(true);
    const now=new Date().toISOString();
    const data={...draft,name,category,description:draft.description.trim(),imageUrl:draft.imageUrl.trim()||"/mogobe-meat-placeholder.svg",updatedAt:now,...(editing?{}:{createdAt:now})};
    try{
      if(editing) await updateDoc(doc(db,"products",editing),data);
      else await addDoc(collection(db,"products"),data);
      setNotice(editing?"Product updated.":"Product added to the catalogue.");resetDraft();
    }catch{setErrors("Could not save the product. Confirm your admin role and Firestore rules.");}
    finally{setSaving(false)}
  }

  async function changeStatus(order:Order,status:string){
    setErrors("");setNotice("");
    try{await updateDoc(doc(db,"orders",order.id),{status,adminUpdatedAt:new Date().toISOString()});setNotice("Order "+order.id.slice(0,8)+" updated to "+status+".")}
    catch{setErrors("Could not update this order. Check your connection and admin permissions.")}
  }

  async function removeProduct(product:MogobeProduct){
    if(!window.confirm("Delete "+product.name+" from the Mogobe catalogue? This cannot be undone.")) return;
    try{await deleteDoc(doc(db,"products",product.id));if(editing===product.id)resetDraft();setNotice(product.name+" was deleted from the catalogue.");}
    catch{setErrors("Could not delete this product. Check Firestore rules and admin access.");}
  }

  async function toggleAvailability(product:MogobeProduct){
    try{await updateDoc(doc(db,"products",product.id),{available:!product.available,updatedAt:new Date().toISOString()});setNotice(product.name+" is now "+(!product.available?"available":"unavailable")+".")}
    catch{setErrors("Could not change availability. Check Firestore rules and admin access.")}
  }

  return <main className="mogobeAdmin"><div className="mogobeAdminShell">
    <header className="mogobeAdminHeading"><div><span className="mogobeAdminEyebrow">MOGOBE BUTCHERY · OPERATIONS</span><h1>Your counter,<br/><em>under control.</em></h1><p>Review incoming requests and keep your product catalogue current.</p></div><Link href="/">View customer shop ↗</Link></header>
    <section className="mogobeAdminStats" aria-label="Store overview"><article><span>Open order requests</span><strong>{activeOrders.length}</strong><small>Needs review or fulfilment</small></article><article><span>Listed products</span><strong>{products.length}</strong><small>{products.filter(p=>p.available).length} currently available</small></article><article><span>New requests</span><strong>{orders.filter(o=>o.status==="New"||!o.status).length}</strong><small>Awaiting first review</small></article></section>
    <div className="mogobeAdminTabs" role="tablist" aria-label="Admin sections"><button role="tab" aria-selected={tab==="orders"} className={tab==="orders"?"active":""} onClick={()=>setTab("orders")}>Order requests <span>{activeOrders.length}</span></button><button role="tab" aria-selected={tab==="catalogue"} className={tab==="catalogue"?"active":""} onClick={()=>setTab("catalogue")}>Product catalogue <span>{products.length}</span></button></div>
    {errors&&<p className="mogobeAdminError" role="alert">{errors}</p>}{notice&&<p className="mogobeAdminNotice" role="status">{notice}</p>}
    {tab==="orders" ? <section className="mogobeAdminSection"><div className="mogobeAdminSectionTitle"><div><span className="mogobeAdminEyebrow">CUSTOMER REQUESTS</span><h2>Orders to look after</h2></div><p>Requests stay unconfirmed until you explicitly accept them.</p></div>
      {loadingOrders?<p className="mogobeAdminEmpty">Loading order requests…</p>:orders.length===0?<div className="mogobeAdminEmpty"><strong>You're all caught up.</strong><p>New customer requests will appear here when submitted.</p></div>:<div className="mogobeOrderList">{orders.map(order=><article className="mogobeOrderCard" key={order.id}><div className="mogobeOrderTop"><div><span className="mogobeAdminEyebrow">ORDER · {order.id.slice(0,8).toUpperCase()}</span><h3>{order.customerName||"Customer request"}</h3><p>{order.phone||"No phone supplied"} · {order.mode==="delivery"?"Delivery":"Collection"} · {order.createdAt?new Date(order.createdAt).toLocaleString():"Time not available"}</p></div><span className={"mogobeOrderStatus "+String(order.status||"New").toLowerCase()}>{order.status||"New"}</span></div><div className="mogobeOrderDetails"><div><strong>Items requested</strong>{(order.items??[]).map((item,i)=><p key={i}>{item.name||"Item"} · {item.quantity??1} {item.unit==="kg"?"kg":item.unit||"unit"} · {money(Number(item.price??0)*Number(item.quantity??1))}</p>)}</div><div><strong>Estimated basket</strong><b>{money(Number(order.total??0))}</b><small>Final packed weight and price require confirmation.</small></div></div>{order.scheduledFor&&<p className="mogobeOrderNote">Preferred time: {order.scheduledFor} (not yet confirmed)</p>}{order.deliveryLocation&&<p className="mogobeOrderNote">Location: {order.deliveryLocation}</p>}{order.instructions&&<p className="mogobeOrderNote">Notes: {order.instructions}</p>}<div className="mogobeOrderActions"><label>Update status<select value={order.status||"New"} onChange={e=>void changeStatus(order,e.target.value)}>{statuses.map(status=><option key={status}>{status}</option>)}</select></label><Link href={"/orders/"+encodeURIComponent(order.id)}>Open customer view ↗</Link></div></article>)}</div>}
    </section>:<section className="mogobeAdminSection"><div className="mogobeAdminSectionTitle"><div><span className="mogobeAdminEyebrow">THE MOGOBE COUNTER</span><h2>Product catalogue</h2></div><p>Prices and availability here control what customers can browse.</p></div>
      <div className="mogobeCatalogueLayout"><form className="mogobeProductEditor" onSubmit={saveProduct}><span className="mogobeAdminEyebrow">{editing?"EDIT PRODUCT":"ADD A PRODUCT"}</span><h3>{editing?"Update this cut":"List a new cut"}</h3><label>Product name<input required maxLength={100} value={draft.name} onChange={e=>setField("name",e.target.value)}/></label><label>Category<input required maxLength={60} value={draft.category} onChange={e=>setField("category",e.target.value)}/></label><label>Description<textarea maxLength={1000} rows={3} value={draft.description} onChange={e=>setField("description",e.target.value)}/></label><div className="mogobeProductEditorRow"><label>Price (BWP)<input type="number" min="0" step="0.01" required value={draft.price} onChange={e=>setField("price",Number(e.target.value))}/></label><label>Sold by<select value={draft.unit} onChange={e=>setField("unit",e.target.value as ProductDraft["unit"])}><option value="kg">Kilogram</option><option value="pack">Pack</option><option value="each">Each</option></select></label></div><label>Image URL<input value={draft.imageUrl} onChange={e=>setField("imageUrl",e.target.value)} placeholder="/mogobe-meat-placeholder.svg or image URL"/></label><label>Display order<input type="number" value={draft.sortOrder} onChange={e=>setField("sortOrder",Number(e.target.value))}/></label><label className="mogobeAdminCheckbox"><input type="checkbox" checked={draft.available} onChange={e=>setField("available",e.target.checked)}/> Available to customers</label><div className="mogobeProductEditorActions"><button type="submit" disabled={saving}>{saving?"Saving…":editing?"Save changes":"Add product"}</button><button type="button" className="secondary" onClick={resetDraft}>Clear</button></div><p className="mogobeAdminHint">Prices shown to customers are indicative. Image URL editing is enabled; direct image uploads require a separately verified Mogobe upload configuration.</p></form>
      <div className="mogobeProductInventory"><div className="mogobeInventoryTools"><label>Find a product<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search catalogue"/></label><button type="button" onClick={()=>{setDraft({...emptyDraft});setEditing(null)}}>＋ New product</button></div>{loadingProducts?<p className="mogobeAdminEmpty">Loading catalogue…</p>:filtered.length===0?<p className="mogobeAdminEmpty">No products match. Add your first product using the form.</p>:<div className="mogobeInventoryList">{filtered.map(product=><article key={product.id} className="mogobeInventoryItem"><img src={product.imageUrl||"/mogobe-meat-placeholder.svg"} alt=""/><div><strong>{product.name}</strong><span>{product.category} · {money(Number(product.price||0))} / {product.unit}</span><small>{product.available?"Available to customers":"Hidden from customers"}</small></div><div className="mogobeInventoryActions"><button type="button" onClick={()=>startEdit(product)}>Edit</button><button type="button" className="secondary" onClick={()=>void toggleAvailability(product)}>{product.available?"Pause":"List"}</button><button type="button" className="danger" onClick={()=>void removeProduct(product)}>Delete</button></div></article>)}</div>}</div></div>
    </section>}
    <footer className="mogobeAdminFooter"><Link href="/">← Return to customer shop</Link><span>Mogobe Butchery · African Mall, Unit 6</span></footer>
  </div></main>;
}
