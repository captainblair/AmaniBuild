import Image from "next/image";
import Link from "next/link";

const LOGO_SRC = "/brand/amanibuild-logo-v2.png";
const MARK_SRC = "/brand/amanibuild-mark.png";

type LogoSize = "sm" | "md" | "lg" | "xl";

/** Cropped wordmark — size by height; wide aspect so this reads large. */
const LOGO_HEIGHT: Record<LogoSize, string> = {
  sm: "h-9",
  md: "h-11 md:h-12",
  lg: "h-12 md:h-[3.25rem]",
  xl: "h-14 md:h-16",
};

const LOGO_WIDTH: Record<LogoSize, number> = {
  sm: 280,
  md: 360,
  lg: 440,
  xl: 560,
};

const MARK_BOX: Record<LogoSize, string> = {
  sm: "h-10 w-10",
  md: "h-12 w-12",
  lg: "h-14 w-14",
  xl: "h-16 w-16",
};

type LogoMarkProps = {
  className?: string;
  onDark?: boolean;
  size?: LogoSize;
};

/** Standalone brand mark (triangle icon). */
export function LogoMark({ className = "", onDark = false, size = "md" }: LogoMarkProps) {
  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl ${MARK_BOX[size]} ${
        onDark ? "bg-white p-1" : "bg-transparent"
      } ${className}`}
      aria-hidden
    >
      <Image
        src={MARK_SRC}
        alt=""
        width={128}
        height={128}
        className="h-full w-full object-contain"
        priority={false}
      />
    </span>
  );
}

type LogoProps = {
  variant?: "light" | "dark";
  href?: string;
  className?: string;
  size?: LogoSize;
};

export function Logo({
  variant = "dark",
  href = "/",
  className = "",
  size = "lg",
}: LogoProps) {
  const onDark = variant === "light";

  const mark = (
    <span
      className={`inline-flex items-center ${
        onDark ? "rounded-xl bg-white px-3 py-2 shadow-sm" : ""
      } ${className}`}
    >
      <Image
        src={LOGO_SRC}
        alt="AmaniBuild"
        width={LOGO_WIDTH[size]}
        height={96}
        className={`w-auto ${LOGO_HEIGHT[size]}`}
        priority
      />
    </span>
  );

  if (!href) return mark;

  return (
    <Link href={href} className="inline-flex items-center" aria-label="AmaniBuild home">
      {mark}
    </Link>
  );
}
