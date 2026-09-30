import { Logo } from "@/components/brand/Logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-background">
      <div className="mb-8">
        <Logo size="lg" />
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </main>
  );
}
