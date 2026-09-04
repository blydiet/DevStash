import { Reveal } from "@/components/homepage/Reveal";
import { BillingToggle } from "@/components/homepage/BillingToggle";

export function PricingSection() {
  return (
    <section id="pricing" className="border-t border-[var(--hp-border)] px-6 py-30">
      <div className="mx-auto max-w-[1200px]">
        <Reveal>
          <h2 className="mx-auto mb-12 max-w-[34ch] text-center text-[clamp(1.75rem,3.5vw,2.5rem)] leading-[1.2] font-bold tracking-tight">
            Free to start, cheap to stay
          </h2>
        </Reveal>
        <Reveal>
          <BillingToggle />
        </Reveal>
      </div>
    </section>
  );
}
