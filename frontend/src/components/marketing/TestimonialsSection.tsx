"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  IconBuilding,
  IconCloud,
  IconShield,
  IconStar,
  IconUsers,
} from "@/components/marketing/MarketingIcons";

const STORIES = [
  {
    name: "David Mwangi",
    role: "Project Manager",
    company: "Simba Contractors Ltd.",
    location: "Nairobi",
    quote:
      "AmaniBuild transformed how we manage our sites. We finally have real-time visibility across every project without chasing updates on WhatsApp.",
    image: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&q=80&auto=format&fit=crop",
    stats: [
      { value: "35%", label: "Fewer delays" },
      { value: "100%", label: "Projects on track" },
    ],
  },
  {
    name: "Sarah Wanjiku",
    role: "Site Engineer",
    company: "BuildRight Solutions Ltd.",
    location: "Nairobi",
    quote:
      "The site diary and attendance modules alone paid for themselves in the first month. Our foremen adopted it faster than any tool we've tried.",
    image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&q=80&auto=format&fit=crop",
    stats: [
      { value: "90%", label: "Site visibility" },
      { value: "3x", label: "Team alignment" },
    ],
  },
  {
    name: "James Otieno",
    role: "Contracts Manager",
    company: "BlueRock Construction",
    location: "Mombasa",
    quote:
      "Procurement approvals used to take days. Now purchase requests flow through the system and we have a full audit trail for every shilling spent.",
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&q=80&auto=format&fit=crop",
    stats: [
      { value: "50%", label: "Less paperwork" },
      { value: "25%", label: "Faster delivery" },
    ],
  },
  {
    name: "Peter Kimani",
    role: "Site Foreman",
    company: "Kijani Homes Ltd.",
    location: "Kiambu",
    quote:
      "My crew clocks in with QR codes every morning. I know exactly who is on site and can assign tasks without walking the whole plot.",
    image: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&q=80&auto=format&fit=crop",
    stats: [
      { value: "40%", label: "More productivity" },
      { value: "70%", label: "Fewer mix-ups" },
    ],
  },
];

const PROOF = [
  { text: "Trusted by contractors, developers and consultants across Kenya", Icon: IconShield },
  { text: "Built for local compliance and industry standards", Icon: IconBuilding },
  { text: "Secure, reliable and supported by real construction experts", Icon: IconCloud },
  { text: "500+ companies, 50,000+ users and growing", Icon: IconUsers },
];

export function TestimonialsSection() {
  const [active, setActive] = useState(1);
  const story = STORIES[active];

  return (
    <section id="testimonials" className="mkt-stories">
      <div className="mkt-stories__atmosphere" aria-hidden>
        <Image
          src="/marketing/home2.avif"
          alt=""
          fill
          className="mkt-stories__photo"
          sizes="100vw"
        />
        <div className="mkt-stories__scrim" />
      </div>

      <div className="mkt-stories__inner">
        <header className="mkt-stories__header">
          <p className="mkt-eyebrow mkt-eyebrow--on-dark">Customer stories</p>
          <h2 className="mkt-stories__title">Trusted by construction leaders across Kenya</h2>
          <p className="mkt-stories__lede">
            See how AmaniBuild helps teams deliver on time, on budget, and with complete visibility.
          </p>
          <p className="mkt-stories__rating">
            <span className="mkt-stories__stars" aria-hidden>
              {Array.from({ length: 5 }).map((_, i) => (
                <IconStar key={i} className="h-4 w-4" />
              ))}
            </span>
            4.9/5 from 200+ reviews
          </p>
        </header>

        <div className="mkt-stories__stage">
          <figure className="mkt-stories__feature">
            <div className="mkt-stories__portrait">
              <Image src={story.image} alt={story.name} fill sizes="280px" />
            </div>
            <blockquote className="mkt-stories__quote">
              <p>&ldquo;{story.quote}&rdquo;</p>
              <figcaption>
                <strong>{story.name}</strong>
                <span>
                  {story.role}, {story.company}
                </span>
                <span className="mkt-stories__loc">{story.location}, Kenya</span>
              </figcaption>
            </blockquote>
            <div className="mkt-stories__stats">
              {story.stats.map((stat) => (
                <div key={stat.label} className="mkt-stories__stat">
                  <span className="mkt-stories__stat-value">{stat.value}</span>
                  <span className="mkt-stories__stat-label">{stat.label}</span>
                </div>
              ))}
            </div>
          </figure>

          <div className="mkt-stories__switcher" role="tablist" aria-label="Customer stories">
            {STORIES.map((item, index) => (
              <button
                key={item.name}
                type="button"
                role="tab"
                aria-selected={index === active}
                className={`mkt-stories__tab${index === active ? " is-active" : ""}`}
                onClick={() => setActive(index)}
              >
                <span className="mkt-stories__tab-name">{item.name}</span>
                <span className="mkt-stories__tab-meta">
                  {item.role} · {item.location}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="mkt-stories__cta-band">
          <div className="mkt-stories__cta-copy">
            <h3>Join 500+ construction companies building better with AmaniBuild</h3>
            <ul className="mkt-stories__proof">
              {PROOF.map(({ text, Icon }) => (
                <li key={text}>
                  <Icon className="h-4 w-4" />
                  <span>{text}</span>
                </li>
              ))}
            </ul>
          </div>
          <Link href="/register" className="wf-btn-hero wf-btn-hero--primary">
            Start Free Trial
          </Link>
        </div>
      </div>
    </section>
  );
}
