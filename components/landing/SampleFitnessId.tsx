import Image from "next/image";
import { ArrowUpRight, LockKeyhole, MapPin, QrCode } from "lucide-react";

/** Decorative design preview, never a member record, attendance claim or usable QR credential. */
export function SampleFitnessId() {
  return <div className="sample-id-perspective" aria-hidden="true">
    <div className="sample-id-spin">
      <div className="sample-id-face sample-id-front">
        <div className="sample-id-grid" />
        <div className="sample-id-header"><Image src="/images/logo.png" alt="" width={144} height={51} className="sample-id-logo" /><span>Fitness ID</span></div>
        <div className="sample-id-name"><p>Your place in the movement</p><strong>YOU.<br />IN GOOD<br />COMPANY.</strong></div>
        <div className="sample-id-footer"><span><MapPin size={14} />Noida &amp; Greater Noida</span><ArrowUpRight size={26} /></div>
        <div className="sample-id-preview">Design preview · not a member record</div>
      </div>
      <div className="sample-id-face sample-id-back">
        <div className="sample-id-header"><span>Show up. Show your QR.</span><LockKeyhole size={20} /></div>
        <div className="sample-id-qr-placeholder"><QrCode size={100} strokeWidth={1.3} /><span>QR placeholder<br />Not scannable</span></div>
        <p>Your participant code lives in your account.<br />Your private story stays yours.</p>
        <div className="sample-id-preview">Design preview · no attendance data</div>
      </div>
    </div>
  </div>;
}
