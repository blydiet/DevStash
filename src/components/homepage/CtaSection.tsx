import { Reveal } from "@/components/homepage/Reveal";
import { HomeButton } from "@/components/homepage/HomeButton";

export function CtaSection() {
  return (
    <section className="px-6 py-25">
      <Reveal className="mx-auto max-w-[1200px]">
        <div className="flex flex-col items-center gap-7 rounded-[14px] border border-[var(--hp-border)] bg-[var(--hp-bg-card)] px-8 py-18 text-center">
          <h2 className="max-w-[20ch] text-[clamp(1.75rem,4vw,2.5rem)] leading-[1.2] font-bold tracking-tight">
            Ready to organize your knowledge?
          </h2>
          <HomeButton href="/register" size="lg">
            Get started
          </HomeButton>
        </div>
      </Reveal>
    </section>
  );
}
