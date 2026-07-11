"use client";

import { Waves } from "@/components/marketing/Waves";

/** Slim aesthetic band between pricing and footer. */
export function WavesSection() {
  return (
    <section className="mkt-waves" aria-hidden>
      <Waves
        lineColor="rgba(234, 179, 8, 0.65)"
        backgroundColor="transparent"
        waveSpeedX={0.014}
        waveSpeedY={0.008}
        waveAmpX={28}
        waveAmpY={14}
        friction={0.88}
        tension={0.008}
        maxCursorMove={160}
        xGap={12}
        yGap={36}
      />
      <div className="mkt-waves__fade" />
    </section>
  );
}
