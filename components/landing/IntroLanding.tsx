import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowUpRight, CalendarDays, LockKeyhole, QrCode, UsersRound } from "lucide-react";
import { IntroTrack, MovementBurst, StoryLoop } from "./IntroGraphics";
import { LandingChoreography } from "./LandingChoreography";
import { SampleFitnessId } from "./SampleFitnessId";

const steps = [
  { number: "01", icon: UsersRound, title: "Find your people.", description: "Explore a club, a session or a place to move. Find a pace and a meeting point that work for you.", link: "Explore the home hub", href: "/home" },
  { number: "02", icon: CalendarDays, title: "Make a plan.", description: "Read the details, save a possibility, and RSVP to an event. A plan is an intention—not proof of attendance.", link: "Find a session", href: "/events" },
  { number: "03", icon: QrCode, title: "Show up. Show your QR.", description: "With a confirmed RSVP, show your participant check-in QR to the assigned club or venue operator. They scan it to verify attendance.", link: "Your participant QR", href: "/check-in" },
  { number: "04", icon: LockKeyhole, title: "Keep your own story.", description: "Accepted operator check-in adds a verified record to your private movement passport. Your profile stays private unless you choose to share it.", link: "Create your Fitness ID", href: "/signup" },
];

export function IntroLanding() {
  return <LandingChoreography>
    <section className="kinetic-hero" aria-labelledby="intro-heading" data-depth-scene>
      <div className="kinetic-hero-grid" aria-hidden="true" />
      <div className="kinetic-hero-glow" aria-hidden="true" />
      <div className="kinetic-hero-art" aria-hidden="true">
        <div className="kinetic-hero-photo-frame"><figure className="kinetic-hero-image" data-depth="72"><Image src="/images/landing/running.webp" alt="" fill sizes="100vw" preload /></figure></div>
        <div className="kinetic-orbit" data-depth="-44"><IntroTrack /></div>
        <div className="kinetic-hero-burst" data-depth="-32"><MovementBurst /></div>
        <span className="kinetic-hero-edge kinetic-hero-edge-left">Good people.</span><span className="kinetic-hero-edge">Great energy.</span>
      </div>
      <div className="kinetic-wrap kinetic-hero-brand">
        <Link href="/home" aria-label="NOIDA.FIT home"><Image src="/images/logo.png" alt="NOIDA.FIT" width={178} height={63} /></Link>
      </div>
      <div className="kinetic-wrap kinetic-hero-body">
        <div className="kinetic-hero-copy">
          <h1 id="intro-heading">
            <span className="kinetic-line kinetic-hero-lead"><span data-scroll-reveal>GO</span></span>{" "}
            <span className="kinetic-line kinetic-hero-headline"><span data-scroll-reveal data-reveal-order="1">TOGETHER.</span></span>
          </h1>
          <div data-scroll-reveal className="kinetic-hero-bottom">
            <div className="kinetic-actions"><Link href="/home" className="kinetic-button">Explore the home hub<ArrowUpRight size={20} aria-hidden="true" /></Link><Link href="/communities" className="kinetic-link">Find a community<ArrowUpRight size={18} aria-hidden="true" /></Link></div>
            <span className="kinetic-note">Come as you are. No account needed to browse.</span>
          </div>
        </div>
      </div>
      <div className="kinetic-wrap kinetic-hero-footer"><span>Different paces. <strong>Shared energy.</strong></span><span className="kinetic-hero-credit">Illustrative photography · Pexels</span><a href="#community-scene" className="kinetic-link">Feel the movement<ArrowDown size={18} aria-hidden="true" /></a></div>
    </section>

    <section id="community-scene" className="kinetic-community-scene" aria-labelledby="community-heading" data-scroll-scene="curtain">
      <div className="kinetic-community-pin">
        <figure className="kinetic-community-image"><Image src="/images/landing/party.webp" alt="A crowd dancing under colourful lights; illustrative party photograph, not a documented fitness session or NOIDA.FIT gathering." fill sizes="100vw" /><figcaption>Illustrative party photography · not a NOIDA.FIT event</figcaption></figure>
        <div className="kinetic-community-shade" aria-hidden="true" />
        <div className="kinetic-wrap kinetic-community-copy"><p className="kinetic-kicker">01 / The people make the place.</p><h2 id="community-heading">NOT JUST<br />A WORKOUT.<br /><span>YOUR PEOPLE.</span></h2><p>Different starts. Shared energy.<br />Find the community that makes showing up feel easier.</p><Link href="/communities" className="kinetic-link">Meet the communities<ArrowUpRight size={18} aria-hidden="true" /></Link></div>
        <div className="kinetic-curtain kinetic-curtain-left" aria-hidden="true"><span>SHOW</span><small>Different starts.</small></div><div className="kinetic-curtain kinetic-curtain-right" aria-hidden="true"><span>UP.</span><small>Shared ground.</small></div>
      </div>
    </section>

    <section id="fitness-id" className="kinetic-id-scene" aria-labelledby="fitness-id-heading" data-scroll-scene="identity">
      <div className="kinetic-id-pin">
        <div className="kinetic-id-grid" aria-hidden="true" />
        <header className="kinetic-wrap kinetic-id-heading"><p className="kinetic-kicker">02 / More than a moment.</p><h2 id="fitness-id-heading">YOUR CITY.<br /><span>YOUR FITNESS ID.</span></h2></header>
        <div className="kinetic-id-canvas"><span className="kinetic-id-watermark" aria-hidden="true">NOIDA<br /><span>.FIT</span></span><div className="kinetic-id-orbit" aria-hidden="true" /><figure className="kinetic-id-figure"><div className="kinetic-id-lift"><SampleFitnessId /></div><figcaption>Fitness ID design preview.<br />Not a real member, entry pass or attendance record.</figcaption></figure><div className="kinetic-id-curtain kinetic-id-curtain-top" aria-hidden="true"><span>YOUR</span></div><div className="kinetic-id-curtain kinetic-id-curtain-bottom" aria-hidden="true"><span>STORY.</span></div></div>
        <div className="kinetic-wrap kinetic-id-handoff"><span className="kinetic-kicker">The card is the beginning.</span><p>The moments you show up for<br /><strong>become the story you keep.</strong></p><a href="#how-it-works" className="kinetic-link">How it works<ArrowDown size={16} aria-hidden="true" /></a></div>
      </div>
    </section>

    <section id="how-it-works" className="kinetic-journey" aria-labelledby="journey-heading" data-scroll-scene="journey">
      <div className="kinetic-story-grid" aria-hidden="true" />
      <div className="kinetic-wrap">
        <div className="kinetic-story-intro">
          <header className="kinetic-journey-heading"><p data-scroll-reveal className="kinetic-kicker">03 / From online to outside.</p><h2 id="journey-heading"><span className="kinetic-line"><span data-scroll-reveal>SHOW UP.</span></span>{" "}<span className="kinetic-line kinetic-accent"><span data-scroll-reveal data-reveal-order="1">KEEP THE</span></span>{" "}<span className="kinetic-line kinetic-accent"><span data-scroll-reveal data-reveal-order="2">STORY.</span></span></h2></header>
          <div className="kinetic-story-art" aria-hidden="true"><StoryLoop /><div className="kinetic-story-art-copy"><span>From a plan</span><ArrowDown size={28} /><strong>TO A<br />REAL MOMENT.</strong></div><span className="kinetic-story-seal">Your passport.<br />Private by default.</span></div>
        </div>
        <ol className="kinetic-steps">{steps.map(({ icon: Icon, ...step }, index) => <li key={step.number} data-journey-card={index}>
          <div className="kinetic-step-card">
            <div className="kinetic-step-top"><span className="kinetic-step-number" aria-hidden="true">{step.number}</span><Icon size={26} aria-hidden="true" /></div>
            <h3>{step.title}</h3><p>{step.description}</p><Link href={step.href} className="kinetic-link">{step.link}<ArrowUpRight size={16} aria-hidden="true" /></Link>
          </div>
        </li>)}</ol>
        <p className="kinetic-privacy" data-scroll-reveal><LockKeyhole size={17} aria-hidden="true" />Your participant QR is for check-in. Your private movement passport is for you.</p>
      </div>
    </section>

    <section className="kinetic-finale" aria-labelledby="finale-heading" data-depth-scene><div className="kinetic-wrap"><p data-scroll-reveal className="kinetic-kicker">04 / There’s a whole city out there.</p><div className="kinetic-finale-grid"><h2 id="finale-heading"><span className="kinetic-line"><span data-scroll-reveal>THE NEXT</span></span><span className="kinetic-line"><span data-scroll-reveal data-reveal-order="1">MOVE IS</span></span><span className="kinetic-line"><span data-scroll-reveal data-reveal-order="2">YOURS.</span></span></h2><div data-scroll-reveal="right" className="kinetic-finale-copy"><p>Find the people.<br />Make the plan.<br />Take it outside.</p><Link href="/home" className="kinetic-button kinetic-button-dark">Explore the home hub<ArrowUpRight size={18} aria-hidden="true" /></Link><Link href="/signup" className="kinetic-link">Create your account<ArrowUpRight size={16} aria-hidden="true" /></Link><span className="kinetic-finale-arrow" data-depth="-48" aria-hidden="true">↗</span></div></div><div className="kinetic-organizer"><p>Already bringing people together?</p><Link href="/for-organizers" className="kinetic-link">For community &amp; venue organizers<ArrowUpRight size={16} aria-hidden="true" /></Link></div></div></section>
  </LandingChoreography>;
}
