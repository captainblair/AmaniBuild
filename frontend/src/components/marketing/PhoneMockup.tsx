import Image from "next/image";

const PHONE_PHOTO =
  "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=85&auto=format&fit=crop";

/** Mobile homepage preview — bottom-right placement from Homepage1.png */
export function PhoneMockup() {
  return (
    <div className="phone-mockup" aria-hidden>
      <div className="phone-mockup__bezel">
        <div className="phone-mockup__notch" />
        <div className="phone-mockup__screen">
          <div className="phone-mockup__nav">
            <div className="phone-mockup__brand">
              <Image
                src="/brand/amanibuild-logo-v2.png"
                alt=""
                width={160}
                height={36}
                className="h-7 w-auto"
              />
            </div>
            <span className="phone-mockup__menu" />
          </div>
          <div className="phone-mockup__copy">
            <p className="phone-mockup__title">
              Run Your Sites
              <br />
              Like a Pro
            </p>
            <p className="phone-mockup__sub">
              Manage projects, people, materials and progress — all in one place.
            </p>
            <div className="phone-mockup__btn">Start Free Trial</div>
            <div className="phone-mockup__btn phone-mockup__btn--outline">Book a Demo</div>
          </div>
          <div className="phone-mockup__photo">
            <Image src={PHONE_PHOTO} alt="" fill sizes="180px" />
          </div>
        </div>
      </div>
    </div>
  );
}
