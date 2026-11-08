import type { CSSProperties } from "react";
import Image from "next/image";
import { isMediaPath } from "@/lib/media";
import { HeroBanner } from "@/components/discovery/DetailHero";
import "./bio-intro.css";

type BioIntroProps =
  | { kind: "club"; id: string; name: string; initials: string; crest?: string; subtitle: string }
  | { kind: "event"; id: string; title: string; date: string; time: string; host: string; image?: string; category?: string };

/** Width of the pass's tear-off stub; matches .bio-pass-stub in bio-intro.css. */
const PASS_STUB = 64;

/**
 * Runs inline, straight after the overlay is parsed, so nothing waits for hydration. It plays the
 * intro once per session for visitors arriving from outside the site (an Instagram bio, a WhatsApp
 * share); a client-side navigation never executes it. Once the hero is in the DOM it measures it
 * and aims the medal or the pass window at it. It must stay self-contained:
 * it is serialised with toString().
 */
function boot(key: string, kind: "club" | "event", stub: number) {
  const intro = document.currentScript?.previousElementSibling as HTMLElement | null;
  try {
    const referrer = document.referrer;
    if (!intro || (referrer && new URL(referrer).origin === location.origin)) return;
    if (sessionStorage.getItem(key) || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    sessionStorage.setItem(key, "1");
  } catch {
    return;
  }
  intro.setAttribute("data-play", "");

  const px = (value: number) => `${Math.round(value * 100) / 100}px`;
  const set = (vars: Record<string, string>) => { for (const name in vars) intro.style.setProperty(name, vars[name]); };
  const centre = (box: DOMRect) => [box.left + box.width / 2, box.top + box.height / 2];
  const piece = intro.querySelector<HTMLElement>(".bio-intro-piece");

  // Lands the medal on the crest's exact box. The replica's radius and border are divided by the
  // flight scale, so they measure true once the medal has shrunk.
  const aimMedal = () => {
    const crest = document.querySelector<HTMLElement>(".detail-hero-logo");
    if (!crest || !piece) return false;
    const from = piece.getBoundingClientRect(), to = crest.getBoundingClientRect(), style = getComputedStyle(crest);
    const scale = to.width / from.width;
    const radius = parseFloat(style.borderTopLeftRadius) || 0, border = parseFloat(style.borderTopWidth) || 0;
    const [fromX, fromY] = centre(from), [toX, toY] = centre(to);
    set({
      "--fly-x": px(toX - fromX), "--fly-y": px(toY - fromY), "--fly-s": `${scale}`,
      "--fly-r": px(radius / scale), "--fly-border": px(border / scale),
    });
    return true;
  };

  // The pass becomes a window onto a copy of the banner. The window (.bio-slab) scales from the pass
  // to the banner while the copy inside is counter-scaled and slides into place, so the photo is
  // never stretched and lands on identical pixels. Exact counter-scaling is not a straight tween,
  // so both are sampled into keyframes; transforms only, so it runs on the compositor.
  const aimPass = (elapsed: number) => {
    const hero = document.querySelector<HTMLElement>("#main-content .detail-hero-header .detail-hero");
    const slab = intro.querySelector<HTMLElement>(".bio-slab"), frame = intro.querySelector<HTMLElement>(".bio-slab-frame");
    if (!hero || !piece || !slab || !frame) return false;
    const anchor = piece.getBoundingClientRect(), to = hero.getBoundingClientRect();
    const pass = new DOMRect(anchor.left, anchor.top, anchor.width - stub, anchor.height);
    // The sticky top bar covers the banner's top edge, so the window stops at the bar.
    const top = Math.max(to.top, document.querySelector(".app-topbar")?.getBoundingClientRect().bottom ?? to.top);
    const view = new DOMRect(to.left, top, to.width, Math.max(1, to.bottom - top));
    const [passX, passY] = centre(pass), [heroX, heroY] = centre(to);
    set({ "--view-t": px(view.top), "--view-l": px(view.left), "--view-w": px(view.width), "--view-h": px(view.height), "--hero-w": px(to.width), "--hero-h": px(to.height) });

    // cubic-bezier(.65, 0, .25, 1) (the CSS --ease-glide): bisect the curve's x for t, return its y.
    const curve = (t: number) => {
      const x = (u: number) => 3 * (1 - u) * (1 - u) * u * .65 + 3 * (1 - u) * u * u * .25 + u * u * u;
      let lo = 0, hi = 1, u = t;
      for (let i = 0; i < 24; i++) { u = (lo + hi) / 2; if (x(u) < t) lo = u; else hi = u; }
      return 3 * (1 - u) * u * u + u * u * u;
    };
    const steps = 24, windowFrames: Keyframe[] = [], copyFrames: Keyframe[] = [], radiusFrames: Keyframe[] = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps, e = curve(t), mix = (a: number, b: number) => a + (b - a) * e;
      const x = mix(pass.left, view.left), y = mix(pass.top, view.top), w = mix(pass.width, view.width), h = mix(pass.height, view.height);
      const sx = w / view.width, sy = h / view.height;
      const shiftX = (passX - heroX) * (1 - e), shiftY = (passY - heroY) * (1 - e);
      const radius = 16 * (1 - e);
      windowFrames.push({ offset: t, transform: `translate(${x - view.left}px, ${y - view.top}px) scale(${sx}, ${sy})` });
      copyFrames.push({ offset: t, transform: `translate(${(to.left + shiftX - x) / sx}px, ${(to.top + shiftY - y) / sy}px) scale(${1 / sx}, ${1 / sy})` });
      radiusFrames.push({ offset: t, borderRadius: `${radius / sx}px 0 0 ${radius / sx}px / ${radius / sy}px 0 0 ${radius / sy}px` });
    }
    // Runs from 64% to 92% of the 1800ms timeline, joined at wherever the CSS already is.
    const timing: KeyframeAnimationOptions = { delay: 1152 - elapsed, duration: 504, fill: "both", easing: "linear" };
    slab.animate(windowFrames, timing);
    slab.animate(radiusFrames, timing);
    frame.animate(copyFrames, timing);
    return true;
  };

  // The hero is parsed just after this script; wait for it, but give up once the flight would jump.
  let frames = 0;
  const attempt = () => {
    const clock = intro.getAnimations().find((animation) => (animation as CSSAnimation).animationName === "bio-done");
    const elapsed = Number(clock?.currentTime ?? 0);
    if (elapsed > 1100) return;
    if (kind === "club" ? aimMedal() : aimPass(elapsed)) {
      set({ "--bio-elapsed": `${-elapsed}ms` });
      intro.setAttribute("data-aimed", "");
    } else if (++frames < 120) requestAnimationFrame(attempt);
  };
  requestAnimationFrame(attempt);

  // Any tap, key or wheel fades the intro out at once.
  const skip = () => {
    if (intro.hasAttribute("data-skip")) return;
    intro.setAttribute("data-skip", "");
    setTimeout(() => intro.removeAttribute("data-play"), 220);
    removeEventListener("keydown", skip);
    removeEventListener("wheel", skip);
  };
  intro.addEventListener("pointerdown", skip);
  addEventListener("keydown", skip);
  addEventListener("wheel", skip, { passive: true });
}

export function BioIntro(props: BioIntroProps) {
  const script = `(${boot.toString()})(${JSON.stringify(`bio-intro:${props.kind}:${props.id}`)},${JSON.stringify(props.kind)},${PASS_STUB})`;
  return <>
    {/* The boot script adds data-play, data-aimed and style vars to this element before hydration. */}
    <div className="bio-intro" data-kind={props.kind} aria-hidden="true" suppressHydrationWarning>
      {props.kind === "club" ? <>
        <span className="bio-floor" />
        <span className="bio-ring" /><span className="bio-ring" />
        <div className="bio-intro-piece"><div className="bio-intro-flight">
          <span className="bio-medal-glow" />
          <div className="bio-medal">
            {Array.from({ length: 10 }, (_, i) => <span key={i} className="bio-medal-edge" style={{ transform: `translateZ(-${i + 1}px)` }} />)}
            <span className="bio-medal-face bio-medal-back">{props.initials}</span>
            {/* Plain img: the hero already requests this crest, and this copy is decorative. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <span className="bio-medal-face bio-medal-front">{props.crest ? <img src={props.crest} alt="" /> : props.initials}</span>
          </div>
          {/* Flat, outside the 3D medal, with the hero crest's next/image settings: identical file, no perspective. */}
          {props.crest && <Image className="bio-medal-crest" src={props.crest} alt="" width={112} height={112} unoptimized={isMediaPath(props.crest)} />}
        </div></div>
        <p className="bio-medal-name">{[...props.name].map((char, i) => <span key={i} style={{ "--i": i } as CSSProperties}>{char === " " ? " " : char}</span>)}</p>
        <p className="bio-medal-sub">{props.subtitle}</p>
      </> : <>
        <div className="bio-slab"><div className="bio-slab-frame"><HeroBanner image={props.image} category={props.category} alt="" /></div></div>
        <div className="bio-intro-piece"><div className="bio-intro-flight">
          <div className="bio-pass">
            <div className="bio-pass-main"><small>NOIDA.FIT · EVENT PASS</small><b>{props.title}</b><span className="bio-pass-row"><span>{props.date}</span><span>{props.time}</span></span><small className="bio-pass-host">{props.host}</small></div>
            <div className="bio-pass-stub"><span>ADMIT ONE</span></div>
          </div>
        </div></div>
      </>}
    </div>
    <script dangerouslySetInnerHTML={{ __html: script }} />
  </>;
}
