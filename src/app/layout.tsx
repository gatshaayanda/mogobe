import type {Metadata,Viewport} from "next";
import {headers} from "next/headers";
import {Analytics} from "@vercel/analytics/next";
import {SpeedInsights} from "@vercel/speed-insights/next";
import PwaRegister from "@/app/pwa-register";
import Script from "next/script";
import "./globals.css"; import "./pwa.css"; import "./mogobe.css";
const siteUrl=process.env.NEXT_PUBLIC_BASE_URL||"http://localhost:3000";
const EMBEDDED_BROWSER_PATTERN=/WhatsApp|Instagram|FBAN|FBAV|Messenger|Line[/]|Twitter|TikTok|Snapchat/i;
export const metadata:Metadata={metadataBase:new URL(siteUrl),title:{default:"Mogobe Butchery | Shop Meat Online",template:"%s | Mogobe Butchery"},description:"Shop Mogobe Butchery favourites in Gaborone. Build your basket and request collection or delivery.",applicationName:"Mogobe Butchery",keywords:["Mogobe Butchery","beef","boroso","butchery","Gaborone","Botswana"],alternates:{canonical:"/"},openGraph:{type:"website",url:siteUrl,siteName:"Mogobe Butchery",title:"Mogobe Butchery | Shop Meat Online",description:"Good meat. Good people. Shop the Mogobe counter."},twitter:{card:"summary",title:"Mogobe Butchery | Shop Meat Online",description:"Shop Mogobe favourites in Gaborone."},icons:{icon:"/mogobe-icon.svg",apple:"/mogobe-icon.svg"},manifest:"/manifest.webmanifest",appleWebApp:{capable:true,title:"Mogobe",statusBarStyle:"default"}};
export const viewport:Viewport={themeColor:"#922a2b",colorScheme:"light"};
export default async function RootLayout({children}:{children:React.ReactNode}){
 const requestHeaders=await headers();
 const userAgent=requestHeaders.get("user-agent")||"";
 const requestedWith=requestHeaders.get("x-requested-with")||"";
 // A social referrer does not prove this browser is embedded: Chrome opened from WhatsApp
 // must not be trapped in the in-app-browser install gate.
 const embedded=EMBEDDED_BROWSER_PATTERN.test(userAgent)
   || (/Android/i.test(userAgent)&&/\bwv\b/i.test(userAgent))
   || /^(com\.whatsapp|com\.instagram\.android|com\.facebook\.katana|com\.facebook\.lite|com\.facebook\.orca)$/i.test(requestedWith);
 const android=/Android/i.test(userAgent);
 return <html lang="en"><body><Script id="theplug-early-install-capture" strategy="beforeInteractive">{`
(function () {
  window.addEventListener("beforeinstallprompt", function (event) {
    var standalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
    if (standalone || window.__thePlugPwaListenerReady === true) return;
    event.preventDefault();
    window.__thePlugInstallPrompt = event;
  });
})();
`}</Script><PwaRegister initialEmbedded={false} initialAndroid={android}/>{children}<Analytics/><SpeedInsights/></body></html>
}
