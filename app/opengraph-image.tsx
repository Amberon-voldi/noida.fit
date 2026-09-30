import { ImageResponse } from "next/og";

export const alt = "NOIDA.FIT — Your next move, closer to home.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(<div style={{display:"flex",flexDirection:"column",justifyContent:"space-between",background:"#0c1015",color:"#f8fafc",width:"100%",height:"100%",padding:64}}>
    <div style={{display:"flex",fontSize:38,fontWeight:800}}>NOIDA<span style={{color:"#9ddc2e"}}>.FIT</span></div>
    <div style={{display:"flex",flexDirection:"column",fontSize:76,fontWeight:700,lineHeight:1.05}}><span>Your next move.</span><span style={{color:"#9ddc2e"}}>Closer to home.</span></div>
    <div style={{display:"flex",fontSize:25,color:"#b3bdca"}}>Events · Places · Communities · Noida & Greater Noida</div>
  </div>, size);
}
