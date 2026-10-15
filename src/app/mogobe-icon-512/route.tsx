import { ImageResponse } from "next/og";
export const runtime = "edge";
export async function GET() { return new ImageResponse(<div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",background:"#922a2b",color:"#fff8ed",borderRadius:"96px",fontFamily:"Arial",fontWeight:900}}><div style={{fontSize:266,letterSpacing:"-0.08em"}}>M</div><div style={{fontSize:38,letterSpacing:"0.16em"}}>BUTCHERY</div></div>,{width:512,height:512}); }
