import Image from "next/image";
import Link from "next/link";

/**
 * Full-bleed construction hero — home1.avif as atmosphere,
 * copy over a charcoal scrim (readable like a cinematic landing).
 */
const HERO_PHOTO = "/marketing/home1.avif";

const TRUST_LOGOS = [
  { name: "HFG", style: "serif" as const },
  { name: "HassConsult", style: "sans" as const },
  { name: "PRIME", style: "caps" as const },
  { name: "DuraBuild", style: "sans" as const },
  { name: "SBINON", style: "caps" as const },
  { name: "Ushaka", style: "circle" as const },
];

export function HeroSection() {
  return (
    <section className="hero-home" aria-label="Homepage hero">
      <div className="hero-home__visual" aria-hidden>
        <Image
          src={HERO_PHOTO}
          alt=""
          fill
          className="hero-home__photo"
          priority
          sizes="100vw"
        />
        <div className="hero-home__scrim" />
      </div>

      <div className="hero-home__content">
        <p className="hero-home__brand">AmaniBuild</p>
        <h1 className="hero-home__title">
          Run Your Sites
          <br />
          Like a Pro
        </h1>
        <p className="hero-home__subtitle">
          Construction management for Kenyan teams — projects, people, materials and progress in
          one place.
        </p>

        <div className="hero-home__actions">
          <Link href="/register" className="wf-btn-hero wf-btn-hero--primary">
            Start Free Trial
          </Link>
          <Link href="/register" className="wf-btn-hero wf-btn-hero--ghost">
            Book a Demo
          </Link>
        </div>

        <p className="hero-home__note">No credit card required</p>
      </div>

      <div className="hero-home__trust">
        <p className="hero-home__trust-title">Trusted by leading construction companies in Kenya</p>
        <div className="hero-home__trust-logos">
          {TRUST_LOGOS.map((logo) => (
            <span
              key={logo.name}
              className={`hero-home__trust-logo hero-home__trust-logo--${logo.style}`}
            >
              {logo.style === "circle" ? (
                <>
                  <span className="hero-home__trust-mark" aria-hidden />
                  {logo.name}
                </>
              ) : (
                logo.name
              )}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
