"use client";

import Link from "next/link";
import { addDoc, collection, deleteDoc, deleteField, doc, onSnapshot, runTransaction, updateDoc } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { auth, db } from "@/lib/firebase/client";
import { uploadFiles } from "@/lib/uploadthing";
import { money, type MogobeProduct } from "@/lib/mogobe/catalogue";

type Order = { id: string; customerId?: string; loyaltyPointsAwarded?: number; customerName?: string; phone?: string; mode?: string; scheduledFor?: string; deliveryLocation?: string; instructions?: string; items?: Array<{name?:string;quantity?:number;unit?:string;price?:number}>; total?: number; status?: string; createdAt?: string };
type ProductDraft = Omit<MogobeProduct,"id">;
const emptyDraft: ProductDraft = { name:"", category:"Beef", description:"", price:0, unit:"kg", imageUrl:"/mogobe-meat-placeholder.svg", available:true, sortOrder:50 };
const statuses = ["New","Reviewing","Accepted","Preparing","Ready","Delivering","Collected","Delivered","Completed","Declined","Cancelled"];

export default function MogobeAdminDashboard() {
  const [products,setProducts]=useState<MogobeProduct[]>([]);
  const [orders,setOrders]=useState<Order[]>([]);
  const [communityPosts,setCommunityPosts]=useState<Array<{id:string;title:string;body:string;type:string;authorName?:string;authorUid:string;status:string;createdAt:string;ingredients?:string;method?:string;linkedProductId?:string}>>([]);
  const [pointsDraft,setPointsDraft]=useState<Record<string,string>>({});
  const [tab,setTab]=useState<"orders"|"catalogue"|"community">("orders");
  const [draft,setDraft]=useState<ProductDraft>(emptyDraft);
  const [editing,setEditing]=useState<string|null>(null);
  const [search,setSearch]=useState("");
  const [loadingProducts,setLoadingProducts]=useState(true);
  const [loadingOrders,setLoadingOrders]=useState(true);
  const [errors,setErrors]=useState("");
  const [notice,setNotice]=useState("");
  const [saving,setSaving]=useState(false);
  const [uploadingImage,setUploadingImage]=useState(false);

  useEffect(()=>{
    const stopProducts=onSnapshot(collection(db,"products"),snapshot=>{
      setProducts(snapshot.docs.map(item=>({id:item.id,...item.data()} as MogobeProduct)).sort((a,b)=>(a.sortOrder??999)-(b.sortOrder??999)||a.name.localeCompare(b.name)));
      setLoadingProducts(false);
    },()=>{setErrors("Catalogue could not be loaded. Check Firestore access and your connection.");setLoadingProducts(false)});
    const stopCommunity=onSnapshot(collection(db,"communityPosts"),snapshot=>{
      setCommunityPosts(snapshot.docs.map(item=>({id:item.id,...item.data()} as {id:string;title:string;body:string;type:string;authorName?:string;authorUid:string;status:string;createdAt:string;ingredients?:string;method?:string;linkedProductId?:string})).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)));
    },()=>setErrors("Community moderation queue could not be loaded. Check admin access and your connection."));
    const stopOrders=onSnapshot(collection(db,"orders"),snapshot=>{
      setOrders(snapshot.docs.map(item=>({id:item.id,...item.data()} as Order)).sort((a,b)=>(b.createdAt??"").localeCompare(a.createdAt??"")));
      setLoadingOrders(false);
    },()=>{setErrors("Orders could not be loaded. Check Firestore access and your connection.");setLoadingOrders(false)});
    return ()=>{stopProducts();stopOrders();stopCommunity()};
  },[]);

  const filtered=useMemo(()=>products.filter(p=>(p.name+" "+p.category+" "+p.description).toLowerCase().includes(search.toLowerCase())),[products,search]);
  const activeOrders=orders.filter(o=>!["Completed","Declined"].includes(o.status??""));
  const setField=<K extends keyof ProductDraft>(key:K,value:ProductDraft[K])=>setDraft(old=>({...old,[key]:value}));

  function startEdit(product:MogobeProduct){setEditing(product.id);setDraft({name:product.name,category:product.category,description:product.description,price:product.price,unit:product.unit,imageUrl:product.imageUrl,available:product.available,sortOrder:product.sortOrder,specialPrice:product.specialPrice,specialLabel:product.specialLabel,specialStartsAt:product.specialStartsAt,specialEndsAt:product.specialEndsAt});setErrors("");setNotice("");}
  function resetDraft(){setEditing(null);setDraft(emptyDraft);}

  async function uploadProductImage(file: File) {
    setErrors(""); setNotice("");
    if (!file.type.startsWith("image/")) { setErrors("Choose an image file."); return; }
    if (file.size > 4 * 1024 * 1024) { setErrors("Choose an image smaller than 4 MB."); return; }
    const user = auth.currentUser;
    if (!user) { setErrors("Your admin session has expired. Sign in again before uploading."); return; }
    setUploadingImage(true);
    try {
      const token = await user.getIdToken();
      const uploaded = await uploadFiles("fileUploader", {
        files: [file],
        headers: { Authorization: "Bearer " + token },
      });
      const imageUrl = uploaded[0]?.url;
      if (!imageUrl) throw new Error("The upload completed without returning an image URL.");
      setField("imageUrl", imageUrl);
      setNotice("Image uploaded. Save the product to publish this image.");
    } catch (error) {
      setErrors(error instanceof Error ? error.message : "Image upload failed. Check the upload service configuration and try again.");
    } finally {
      setUploadingImage(false);
    }
  }

  async function saveProduct(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();setErrors("");setNotice("");
    const name=draft.name.trim(),category=draft.category.trim();
    if(!name||!category||!Number.isFinite(draft.price)||draft.price<0){setErrors("Enter a product name, category and valid non-negative price.");return;}if(draft.specialPrice!==undefined&&(!Number.isFinite(draft.specialPrice)||draft.specialPrice<0||draft.specialPrice>=draft.price)){setErrors("A special price must be lower than the normal price.");return;}if(draft.specialStartsAt&&draft.specialEndsAt&&new Date(draft.specialEndsAt).getTime()<new Date(draft.specialStartsAt).getTime()){setErrors("The special end time must be after its start time.");return;}
    setSaving(true);
    const now=new Date().toISOString();
    const data: Record<string, unknown> = {...draft,name,category,description:draft.description.trim(),imageUrl:draft.imageUrl.trim()||"/mogobe-meat-placeholder.svg",updatedAt:now,...(editing?{}:{createdAt:now})};
    for (const key of ["specialPrice","specialLabel","specialStartsAt","specialEndsAt"]) {
      const value = data[key];
      if (value === undefined || value === "" || (key === "specialLabel" && typeof value === "string" && !value.trim())) delete data[key];
    }
    try{
      if(editing) {
        const updates: Record<string, unknown> = {...data};
        for (const key of ["specialPrice","specialLabel","specialStartsAt","specialEndsAt"]) if (!(key in data)) updates[key] = deleteField();
        await updateDoc(doc(db,"products",editing),updates);
      } else await addDoc(collection(db,"products"),data);
      setNotice(editing?"Product updated.":"Product added to the catalogue.");resetDraft();
    }catch{setErrors("Could not save the product. Confirm your admin role and Firestore rules.");}
    finally{setSaving(false)}
  }

  async function changeStatus(order:Order,status:string){
    setErrors("");setNotice("");
    try{await updateDoc(doc(db,"orders",order.id),{status,adminUpdatedAt:new Date().toISOString()});setNotice("Order "+order.id.slice(0,8)+" updated to "+status+".")}
    catch{setErrors("Could not update this order. Check your connection and admin permissions.")}
  }

  async function moderateCommunityPost(postId:string,status:"published"|"rejected") {
    setErrors(""); setNotice("");
    try {
      await updateDoc(doc(db,"communityPosts",postId),{status,updatedAt:new Date().toISOString(),moderatedAt:new Date().toISOString()});
      setNotice(status==="published"?"Community post approved and published.":"Community post rejected; it will not appear publicly.");
    } catch { setErrors("Could not update this community post. Check admin permissions and Firestore rules."); }
  }

  async function awardLoyalty(order:Order) {
    const points=Number(pointsDraft[order.id]);
    if(!order.customerId){setErrors("This order has no linked customer account, so points cannot be credited safely.");return;}
    if(!Number.isInteger(points)||points<1||points>10000){setErrors("Enter a whole-number points amount from 1 to 10,000.");return;}
    if(!["Collected","Delivered"].includes(order.status??"")){setErrors("Loyalty points can only be credited after collection or delivery.");return;}
    setErrors("");setNotice("");
    try {
      const orderRef=doc(db,"orders",order.id), membershipRef=doc(db,"memberships",order.customerId), now=new Date().toISOString();
      await runTransaction(db,async transaction=>{
        const orderSnapshot=await transaction.get(orderRef);
        if(!orderSnapshot.exists())throw new Error("Order not found.");
        if(Number(orderSnapshot.data().loyaltyPointsAwarded??0)>0)throw new Error("Points have already been credited for this order.");
        const memberSnapshot=await transaction.get(membershipRef);
        const currentPoints=Number(memberSnapshot.data()?.points??0);
        transaction.set(membershipRef,{uid:order.customerId,points:currentPoints+points,tier:String(memberSnapshot.data()?.tier??"Member"),createdAt:String(memberSnapshot.data()?.createdAt??now),updatedAt:now},{merge:true});
        transaction.update(orderRef,{loyaltyPointsAwarded:points,loyaltyPointsAwardedAt:now});
      });
      setPointsDraft(old=>({...old,[order.id]:""}));setNotice(points+" loyalty point"+(points===1?"":"s")+" credited to the customer.");
    } catch(error) { setErrors(error instanceof Error?error.message:"Could not credit loyalty points. Check permissions and try again."); }
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
    <div className="mogobeAdminTabs" role="tablist" aria-label="Admin sections"><button role="tab" aria-selected={tab==="orders"} className={tab==="orders"?"active":""} onClick={()=>setTab("orders")}>Order requests <span>{activeOrders.length}</span></button><button role="tab" aria-selected={tab==="catalogue"} className={tab==="catalogue"?"active":""} onClick={()=>setTab("catalogue")}>Product catalogue <span>{products.length}</span></button><button role="tab" aria-selected={tab==="community"} className={tab==="community"?"active":""} onClick={()=>setTab("community")}>Community review <span>{communityPosts.filter(post=>post.status==="pending").length}</span></button></div>
    {errors&&<p className="mogobeAdminError" role="alert">{errors}</p>}{notice&&<p className="mogobeAdminNotice" role="status">{notice}</p>}
    {tab==="orders" ? <section className="mogobeAdminSection"><div className="mogobeAdminSectionTitle"><div><span className="mogobeAdminEyebrow">CUSTOMER REQUESTS</span><h2>Orders to look after</h2></div><p>Requests stay unconfirmed until you explicitly accept them.</p></div>
      {loadingOrders?<p className="mogobeAdminEmpty">Loading order requests…</p>:orders.length===0?<div className="mogobeAdminEmpty"><strong>You&apos;re all caught up.</strong><p>New customer requests will appear here when submitted.</p></div>:<div className="mogobeOrderList">{orders.map(order=><article className="mogobeOrderCard" key={order.id}><div className="mogobeOrderTop"><div><span className="mogobeAdminEyebrow">ORDER · {order.id.slice(0,8).toUpperCase()}</span><h3>{order.customerName||"Customer request"}</h3><p>{order.phone||"No phone supplied"} · {order.mode==="delivery"?"Delivery":"Collection"} · {order.createdAt?new Date(order.createdAt).toLocaleString():"Time not available"}</p></div><span className={"mogobeOrderStatus "+String(order.status||"New").toLowerCase()}>{order.status||"New"}</span></div><div className="mogobeOrderDetails"><div><strong>Items requested</strong>{(order.items??[]).map((item,i)=><p key={i}>{item.name||"Item"} · {item.quantity??1} {item.unit==="kg"?"kg":item.unit||"unit"} · {money(Number(item.price??0)*Number(item.quantity??1))}</p>)}</div><div><strong>Estimated basket</strong><b>{money(Number(order.total??0))}</b><small>Final packed weight and price require confirmation.</small></div></div>{order.scheduledFor&&<p className="mogobeOrderNote">Preferred time: {order.scheduledFor} (not yet confirmed)</p>}{order.deliveryLocation&&<p className="mogobeOrderNote">Location: {order.deliveryLocation}</p>}{order.instructions&&<p className="mogobeOrderNote">Notes: {order.instructions}</p>}<div className="mogobeOrderActions"><label>Update status<select value={order.status||"New"} onChange={e=>void changeStatus(order,e.target.value)}>{statuses.map(status=><option key={status}>{status}</option>)}</select></label><Link href={"/orders/"+encodeURIComponent(order.id)}>Open customer view ↗</Link></div>{["Collected","Delivered"].includes(order.status||"")&&order.customerId&&<div className="mogobeLoyaltyAward"><p>{order.loyaltyPointsAwarded?("Loyalty credited: "+order.loyaltyPointsAwarded+" point"+(order.loyaltyPointsAwarded===1?"":"s")):"Award points after verifying the completed order."}</p>{!order.loyaltyPointsAwarded&&<div><label>Points to credit<input type="number" min="1" max="10000" step="1" value={pointsDraft[order.id]||""} onChange={e=>setPointsDraft(old=>({...old,[order.id]:e.target.value}))} placeholder="Enter points"/></label><button type="button" onClick={()=>void awardLoyalty(order)}>Credit points</button></div>}</div>}</article>)}</div>}
    </section>:tab==="community"?<section className="mogobeAdminSection"><div className="mogobeAdminSectionTitle"><div><span className="mogobeAdminEyebrow">COMMUNITY CARE</span><h2>Review customer contributions</h2></div><p>Posts remain private until approved. Reject spam or unsafe claims; do not present user posts as verified food-safety advice.</p></div>{communityPosts.filter(post=>post.status==="pending").length===0?<div className="mogobeAdminEmpty"><strong>No posts waiting for review.</strong><p>New customer recipes and braai tips will appear here.</p></div>:<div className="mogobeOrderList">{communityPosts.filter(post=>post.status==="pending").map(post=><article className="mogobeOrderCard" key={post.id}><div className="mogobeOrderTop"><div><span className="mogobeAdminEyebrow">{post.type.replace("-"," ").toUpperCase()} · PENDING</span><h3>{post.title}</h3><p>By {post.authorName||"Mogobe customer"} · {post.createdAt?new Date(post.createdAt).toLocaleString():"Date unavailable"}</p></div><span className="mogobeOrderStatus new">Pending</span></div><p>{post.body}</p>{post.ingredients&&<p><strong>Ingredients:</strong> {post.ingredients}</p>}{post.method&&<p><strong>Method / tips:</strong> {post.method}</p>}<div className="mogobeOrderActions"><button type="button" onClick={()=>void moderateCommunityPost(post.id,"published")}>Approve & publish</button><button type="button" className="danger" onClick={()=>void moderateCommunityPost(post.id,"rejected")}>Reject</button></div></article>)}</div>}</section>:<section className="mogobeAdminSection"><div className="mogobeAdminSectionTitle"><div><span className="mogobeAdminEyebrow">THE MOGOBE COUNTER</span><h2>Product catalogue</h2></div><p>Prices and availability here control what customers can browse.</p></div>
      <div className="mogobeCatalogueLayout"><form className="mogobeProductEditor" onSubmit={saveProduct}><span className="mogobeAdminEyebrow">{editing?"EDIT PRODUCT":"ADD A PRODUCT"}</span><h3>{editing?"Update this cut":"List a new cut"}</h3><label>Product name<input required maxLength={100} value={draft.name} onChange={e=>setField("name",e.target.value)}/></label><label>Category<input required maxLength={60} value={draft.category} onChange={e=>setField("category",e.target.value)}/></label><label>Description<textarea maxLength={1000} rows={3} value={draft.description} onChange={e=>setField("description",e.target.value)}/></label><div className="mogobeProductEditorRow"><label>Price (BWP)<input type="number" min="0" step="0.01" required value={draft.price} onChange={e=>setField("price",Number(e.target.value))}/></label><label>Sold by<select value={draft.unit} onChange={e=>setField("unit",e.target.value as ProductDraft["unit"])}><option value="kg">Kilogram</option><option value="pack">Pack</option><option value="each">Each</option></select></label></div><label>Product image<input type="file" accept="image/*" disabled={uploadingImage||saving} onChange={e=>{const file=e.currentTarget.files?.[0];if(file)void uploadProductImage(file);e.currentTarget.value="";}}/><small>{uploadingImage?"Uploading image…":"Upload an image (max 4 MB), or paste a hosted image URL below."}</small></label><div className="mogobeSpecialEditor"><span className="mogobeAdminEyebrow">OPTIONAL SPECIAL</span><div className="mogobeProductEditorRow"><label>Special price (BWP)<input type="number" min="0" step="0.01" value={draft.specialPrice??""} onChange={e=>setField("specialPrice",e.target.value===""?undefined:Number(e.target.value))} placeholder="No special"/></label><label>Special label<input maxLength={80} value={draft.specialLabel??""} onChange={e=>setField("specialLabel",e.target.value||undefined)} placeholder="e.g. Weekend braai"/></label></div><div className="mogobeProductEditorRow"><label>Starts (optional)<input type="datetime-local" value={draft.specialStartsAt??""} onChange={e=>setField("specialStartsAt",e.target.value||undefined)}/></label><label>Ends (optional)<input type="datetime-local" value={draft.specialEndsAt??""} onChange={e=>setField("specialEndsAt",e.target.value||undefined)}/></label></div><small>Customers see the special price only during the configured window. The normal price remains saved.</small></div><label>Image URL<input value={draft.imageUrl} onChange={e=>setField("imageUrl",e.target.value)} placeholder="/mogobe-meat-placeholder.svg or image URL"/></label><label>Display order<input type="number" value={draft.sortOrder} onChange={e=>setField("sortOrder",Number(e.target.value))}/></label><label className="mogobeAdminCheckbox"><input type="checkbox" checked={draft.available} onChange={e=>setField("available",e.target.checked)}/> Available to customers</label><div className="mogobeProductEditorActions"><button type="submit" disabled={saving||uploadingImage}>{saving?"Saving…":editing?"Save changes":"Add product"}</button><button type="button" className="secondary" onClick={resetDraft}>Clear</button></div><p className="mogobeAdminHint">Prices shown to customers are indicative. Images can be uploaded by authorised staff; image URLs remain available as a fallback.</p></form>
      <div className="mogobeProductInventory"><div className="mogobeInventoryTools"><label>Find a product<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search catalogue"/></label><button type="button" onClick={()=>{setDraft({...emptyDraft});setEditing(null)}}>＋ New product</button></div>{loadingProducts?<p className="mogobeAdminEmpty">Loading catalogue…</p>:filtered.length===0?<p className="mogobeAdminEmpty">No products match. Add your first product using the form.</p>:<div className="mogobeInventoryList">{filtered.map(product=><article key={product.id} className="mogobeInventoryItem"><img src={product.imageUrl||"/mogobe-meat-placeholder.svg"} alt=""/><div><strong>{product.name}</strong><span>{product.category} · {money(Number(product.price||0))} / {product.unit}</span><small>{product.available?"Available to customers":"Hidden from customers"}</small></div><div className="mogobeInventoryActions"><button type="button" onClick={()=>startEdit(product)}>Edit</button><button type="button" className="secondary" onClick={()=>void toggleAvailability(product)}>{product.available?"Pause":"List"}</button><button type="button" className="danger" onClick={()=>void removeProduct(product)}>Delete</button></div></article>)}</div>}</div></div>
    </section>}
    <footer className="mogobeAdminFooter"><Link href="/">← Return to customer shop</Link><span>Mogobe Butchery · African Mall, Unit 6</span></footer>
  </div></main>;
}
