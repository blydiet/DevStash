import { Reveal } from "@/components/homepage/Reveal";
import { HomeButton } from "@/components/homepage/HomeButton";
import { HeroVisual } from "@/components/homepage/HeroVisual";

export function HeroSection() {
  return (
    // `pt-[132px]` reads over a typical ~96px (`pt-24`) hero-padding budget at
    // a glance, but ~68px of it is clearing HomeNav's fixed-position header
    // (h-[68px]) so the hero content doesn't render underneath it — only
    // ~64px is actual breathing room on top of that, under budget.
    <section className="px-6 pt-[132px] pb-24">
      <div className="mx-auto flex max-w-[1200px] flex-col items-center gap-[72px]">
        <Reveal className="max-w-[640px] text-center">
          <h1 className="text-[clamp(2.25rem,5vw,3.5rem)] leading-[1.1] font-bold tracking-tight">
            Stop losing your{" "}
            <em className="inline-block bg-gradient-to-r from-[var(--hp-accent)] to-[#8fb8ff] bg-clip-text pb-[0.15em] leading-[1.15] font-bold text-transparent not-italic">
              developer knowledge
            </em>
          </h1>
          <p className="mx-auto mt-5 max-w-[46ch] text-lg text-[var(--hp-text-secondary)]">
            Snippets, prompts, commands, and links scattered across a dozen tools. DevStash gives
            it all one home.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {/* min-w matches "See how it works"' natural content width
                (188px at this size/font) so "Get started" doesn't render
                narrower next to it, stacked or side by side — scoped to
                just this button pair via className, not HomeButton's own
                sizing (every other "Get started" elsewhere is untouched). */}
            <HomeButton href="/register" size="lg" className="min-w-[188px]">
              Get started
            </HomeButton>
            <HomeButton href="#features" variant="secondary" size="lg">
              See how it works
            </HomeButton>
          </div>
        </Reveal>

        <Reveal className="w-full">
          <HeroVisual />
        </Reveal>
      </div>
    </section>
  );
}
