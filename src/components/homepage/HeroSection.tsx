import { Reveal } from "@/components/homepage/Reveal";
import { HomeButton } from "@/components/homepage/HomeButton";
import { HeroVisual } from "@/components/homepage/HeroVisual";

export function HeroSection() {
  return (
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
            <HomeButton href="/register" size="lg">
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
