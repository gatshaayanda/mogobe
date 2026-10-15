"use client";

import { addDoc, collection, onSnapshot, query, where } from "firebase/firestore";
import { GoogleAuthProvider, linkWithPopup, onAuthStateChanged, signInWithPopup, type User } from "firebase/auth";
import { useEffect, useState } from "react";
import Link from "next/link";
import { auth, db } from "@/lib/firebase/client";
import { getMogobeProducts, type MogobeProduct } from "@/lib/mogobe/catalogue";

type PostType = "recipe" | "braai-tip" | "cut-guide";
type CommunityPost = { id: string; authorUid: string; authorName: string; type: PostType; title: string; body: string; ingredients?: string; method?: string; linkedProductId?: string; status: string; createdAt: string };

const labels: Record<PostType,string> = { recipe: "Recipe", "braai-tip": "Braai tip", "cut-guide": "Meat-cut guide" };

export default function MogobeCommunity() {
  const [user,setUser]=useState<User|null>(null);
  const [products,setProducts]=useState<MogobeProduct[]>([]);
  const [posts,setPosts]=useState<CommunityPost[]>([]);
  const [type,setType]=useState<PostType>("recipe");
  const [title,setTitle]=useState("");
  const [body,setBody]=useState("");
  const [ingredients,setIngredients]=useState("");
  const [method,setMethod]=useState("");
  const [linkedProductId,setLinkedProductId]=useState("");
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");

  useEffect(()=>onAuthStateChanged(auth,setUser),[]);
  useEffect(()=>{let active=true;void getMogobeProducts().then(items=>{if(active)setProducts(items)});return()=>{active=false}},[]);
  useEffect(()=>onSnapshot(query(collection(db,"communityPosts"),where("status","==","published")),snapshot=>setPosts(snapshot.docs.map(d=>({id:d.id,...d.data()} as CommunityPost)).sort((a,b)=>b.createdAt.localeCompare(a.createdAt))),()=>setMessage("The community feed is temporarily unavailable.")),[]);

  async function connectAccount(){
    setMessage("");
    try{const provider=new GoogleAuthProvider();if(user?.isAnonymous)await linkWithPopup(user,provider);else await signInWithPopup(auth,provider);setMessage("Account connected. Your contribution can now be submitted for review.")}
    catch(error){const code=typeof error==="object"&&error&&"code" in error?String((error as {code?:unknown}).code):"";setMessage(code==="auth/popup-closed-by-user"?"Sign-in was cancelled.": "We could not connect your account. Your current session is unchanged.")}
  }

  async function submit(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();if(!user||user.isAnonymous){setMessage("Connect a Google account before submitting a community post.");return}
    const cleanTitle=title.trim(),cleanBody=body.trim();
    if(cleanTitle.length<4||cleanBody.length<12){setMessage("Add a clear title and a little more detail so the community can use your post.");return}
    setBusy(true);setMessage("");
    try{
      const now=new Date().toISOString();
      await addDoc(collection(db,"communityPosts"),{authorUid:user.uid,authorName:(user.displayName||"Mogobe customer").slice(0,60),type,title:cleanTitle,body:cleanBody,ingredients:ingredients.trim().slice(0,2000),method:method.trim().slice(0,3000),linkedProductId, status:"pending",createdAt:now,updatedAt:now});
      setTitle("");setBody("");setIngredients("");setMethod("");setLinkedProductId("");
      setMessage("Submitted for review. Your post will appear publicly only after Mogobe approves it.");
    }catch{setMessage("Your post could not be submitted. Check your connection and try again.")}
    finally{setBusy(false)}
  }

  return <main className="orderPage"><div className="orderWrap">
    <header className="orderHeader"><Link href="/" className="logo"><span className="logoMark">M</span><span>Mogobe Butchery</span></Link><nav className="accountTopNav"><Link href="/#shop" className="button buttonLight">Shop meat</Link><Link href="/account" className="button buttonLight">My account</Link></nav></header>
    <section className="orderCard accountHome" style={{maxWidth:1000,margin:"0 auto"}}>
      <div className="accountHero"><div><span className="kicker">MOGOBE COMMUNITY</span><h1>Good meat brings people together.</h1><p>Recipes, braai ideas, cooking tips and practical guides from customers and the Mogobe team.</p></div><span className="accountStatus">Community moderated</span></div>
      <p className="orderTruth">Community contributions are reviewed before publication. Do not include private contact details or sensitive personal information. Advice is shared by community members, not a guarantee of food safety or cooking results.</p>
      <section className="accountSection"><div className="panelHeading"><div><span className="kicker">THE COMMUNITY TABLE</span><h2>Ideas worth sharing.</h2></div><span>{posts.length} published</span></div>
        {posts.length===0?<article className="feedEmpty"><strong>Be the first to share.</strong><p>Start with a family recipe, a braai tip or a guide to a cut you enjoy.</p></article>:<div className="feedList">{posts.map(post=><article className="feedItem" key={post.id}><span className="kicker">{labels[post.type]||"Community post"}</span><h3>{post.title}</h3><p>{post.body}</p>{post.ingredients&&<><strong>Ingredients</strong><p>{post.ingredients}</p></>}{post.method&&<><strong>Method / tips</strong><p>{post.method}</p></>}{post.linkedProductId&&<p className="orderTruth">Related Mogobe product: {products.find(p=>p.id===post.linkedProductId)?.name||"See the shop catalogue"}</p>}<small>Shared by {post.authorName||"Mogobe community"} · {new Date(post.createdAt).toLocaleDateString()}</small></article>)}</div>}
      </section>
      <section className="accountSection"><div className="panelHeading"><div><span className="kicker">CONTRIBUTE</span><h2>Share your know-how.</h2></div></div>
        {!user||user.isAnonymous?<div className="accountConnect"><div><strong>Connect an account to contribute.</strong><p>This helps Mogobe moderate posts and protect the community from spam. Browsing stays open to everyone.</p></div><button type="button" className="button buttonPrimary" onClick={()=>void connectAccount()}>Continue with Google</button></div>:<form className="adminForm" onSubmit={submit}>
          <label>Contribution type<select value={type} onChange={e=>setType(e.target.value as PostType)}><option value="recipe">Recipe</option><option value="braai-tip">Braai tip</option><option value="cut-guide">Meat-cut guide</option></select></label>
          <label>Title<input required maxLength={100} value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Slow-cooked beef stew for Sunday"/></label>
          <label>What should people know?<textarea required minLength={12} maxLength={2000} rows={4} value={body} onChange={e=>setBody(e.target.value)} placeholder="Describe the idea, cut, technique or story."/></label>
          {type==="recipe"&&<><label>Ingredients (optional)<textarea maxLength={2000} rows={3} value={ingredients} onChange={e=>setIngredients(e.target.value)} placeholder="List ingredients and quantities."/></label><label>Method / preparation (optional)<textarea maxLength={3000} rows={4} value={method} onChange={e=>setMethod(e.target.value)} placeholder="Share the steps and practical tips."/></label></>}
          <label>Related Mogobe product (optional)<select value={linkedProductId} onChange={e=>setLinkedProductId(e.target.value)}><option value="">No specific product</option>{products.map(product=><option key={product.id} value={product.id}>{product.name}</option>)}</select></label>
          <button className="button buttonPrimary" type="submit" disabled={busy}>{busy?"Submitting…":"Submit for review"}</button>
        </form>}
        {message&&<p className="notice" role="status">{message}</p>}
      </section>
      <footer className="accountFooter"><Link href="/">← Back to Mogobe Butchery</Link><span>Share generously. Keep it respectful.</span></footer>
    </section>
  </div></main>;
}
