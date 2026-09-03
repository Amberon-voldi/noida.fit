import Image from "next/image";
import Link from "next/link";

interface LogoProps {
  href?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

// Natural dimensions of the logo image (used for aspect ratio calculation only)
const LOGO_NATURAL_WIDTH = 800;
const LOGO_NATURAL_HEIGHT = 285;

const RENDERED_WIDTHS = { sm: 96, md: 120, lg: 160 };

export function Logo({ href = "/", size = "md", className = "" }: LogoProps) {
  const w = RENDERED_WIDTHS[size];
  const h = Math.round((LOGO_NATURAL_HEIGHT / LOGO_NATURAL_WIDTH) * w);

  return (
    <Link
      href={href}
      aria-label="NOIDA.FIT — Home"
      className={`inline-flex items-center rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9ddc2e] focus-visible:ring-offset-2 focus-visible:ring-offset-[#090a0f] ${className}`}
    >
      <Image
        src="/images/logo.png"
        alt="NOIDA.FIT"
        width={w}
        height={h}
        priority
      />
    </Link>
  );
}
