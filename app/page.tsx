import type { Metadata } from "next";
import { Footer } from "@/components/layout/Footer";
import { IntroLanding } from "@/components/landing/IntroLanding";
import "@/components/landing/intro-landing.css";

const title = "NOIDA.FIT — Find Your People.";
const description = "Find your people in Noida and Greater Noida. Explore fitness communities, make a plan, show up together, and keep a private passport of participation.";

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_IN",
    siteName: "NOIDA.FIT",
    url: "/",
    title,
    description,
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "NOIDA.FIT — Find your people. Move together." }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/opengraph-image"],
  },
};

export default function IntroPage() {
  const siteUrl = new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://noida.fit").origin;
  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "NOIDA.FIT",
    url: `${siteUrl}/`,
    description,
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteUrl}/discover?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  return <>
    <main id="main-content" tabIndex={-1} className="intro-landing flex-1">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(website).replace(/</g, "\\u003c") }} />
      <IntroLanding />
    </main>
    <Footer />
  </>;
}
