import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

const PRODUCT_LINKS = [
  { href: "/#features", label: "Features" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#testimonials", label: "Customer stories" },
] as const;

const COMPANY_LINKS = [
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/careers", label: "Careers" },
] as const;

const LEGAL_LINKS = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
] as const;

export function PublicFooter() {
  return (
    <footer id="company" className="wf-footer">
      <div className="wf-footer__inner">
        <div className="wf-footer__about">
          <Logo variant="light" size="xl" href="/" />
          <p>
            The operating system for Kenyan construction sites. Manage projects, people, materials,
            and progress — all in one place.
          </p>
          <div className="wf-footer__contact">
            <a href="mailto:hello@amanibuild.com">hello@amanibuild.com</a>
            <span aria-hidden>·</span>
            <span>Nairobi, Kenya</span>
          </div>
        </div>

        <div className="wf-footer__cols">
          <div className="wf-footer__col">
            <h4>Product</h4>
            <ul>
              {PRODUCT_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="wf-footer__col">
            <h4>Company</h4>
            <ul>
              {COMPANY_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="wf-footer__col">
            <h4>Legal</h4>
            <ul>
              {LEGAL_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="wf-footer__bottom">
        <p>© {new Date().getFullYear()} AmaniBuild. Built for Kenya&apos;s construction industry.</p>
        <div className="wf-footer__bottom-links">
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/contact">Contact</Link>
        </div>
      </div>
    </footer>
  );
}
