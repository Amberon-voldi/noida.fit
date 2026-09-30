import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export default function SectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar />
      <main id="main-content" tabIndex={-1} className="min-w-0 flex-1">
        {children}
      </main>
      <Footer />
    </>
  );
}
