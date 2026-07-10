import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

export function PublicFooter() {
  return (
    <footer id="company" className="wf-footer">
      <div className="wf-footer__inner">
        <div className="wf-footer__about">
          <Logo variant="light" size="xl" />
          <p>
            The operating system for Kenyan construction sites. Manage projects, people, materials,
            and progress — all in one place.
          </p>
        </div>

        <div className="wf-footer__cols">
          <div className="wf-footer__col">
            <h4>Product</h4>
            <ul>
              <li>
                <a href="#features">Features</a>
              </li>
              <li>
                <a href="#pricing">Pricing</a>
              </li>
              <li>
                <Link href="/dev">Dev status</Link>
              </li>
            </ul>
          </div>
          <div className="wf-footer__col">
            <h4>Company</h4>
            <ul>
              <li>
                <span>About</span>
              </li>
              <li>
                <span>Contact</span>
              </li>
              <li>
                <span>Careers</span>
              </li>
            </ul>
          </div>
          <div className="wf-footer__col">
            <h4>Legal</h4>
            <ul>
              <li>
                <span>Privacy</span>
              </li>
              <li>
                <span>Terms</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <div className="wf-footer__bottom">
        © {new Date().getFullYear()} AmaniBuild. Built for Kenya&apos;s construction industry.
      </div>
    </footer>
  );
}
