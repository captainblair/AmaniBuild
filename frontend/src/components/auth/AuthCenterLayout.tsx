import type { ReactNode } from "react";
import Image from "next/image";
import { Logo } from "@/components/ui/Logo";

const AUTH_PHOTO =
  "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=1600&q=80&auto=format&fit=crop";

type AuthCenterLayoutProps = {
  children: ReactNode;
};

export function AuthCenterLayout({ children }: AuthCenterLayoutProps) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <Image src={AUTH_PHOTO} alt="" fill className="object-cover" priority sizes="100vw" />
      <div className="absolute inset-0 bg-[var(--navy-deep)]/78" />
      <div className="relative z-10 mb-6">
        <Logo variant="light" size="xl" />
      </div>
      <div className="relative z-10 w-full max-w-[440px]">{children}</div>
      <p className="relative z-10 mt-8 text-center text-xs text-white/55">
        Your data is encrypted and secure · Proudly built for Kenya
      </p>
    </div>
  );
}
