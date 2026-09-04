import { Code, Sparkles, Search, Terminal, FileText, LayoutGrid } from "lucide-react";
import { Reveal } from "@/components/homepage/Reveal";
import { FeatureCard } from "@/components/homepage/FeatureCard";
import { ITEM_TYPES } from "@/lib/item-types";

const colorFor = (value: string) => ITEM_TYPES.find((t) => t.value === value)?.color ?? "#3b82f6";

export function FeaturesSection() {
  return (
    <section id="features" className="border-t border-[var(--hp-border)] px-6 py-30">
      <div className="mx-auto max-w-[1200px]">
        <Reveal>
          <h2 className="mx-auto mb-12 max-w-[34ch] text-center text-[clamp(1.75rem,3.5vw,2.5rem)] leading-[1.2] font-bold tracking-tight">
            Everything you save, one place you&apos;ll actually check
          </h2>
        </Reveal>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Reveal className="sm:col-span-2">
            <FeatureCard
              icon={<Code className="size-5" />}
              title="Code snippets"
              description="Syntax-highlighted, tagged, and searchable across every language you touch."
              color={colorFor("snippet")}
              span="wide"
            />
          </Reveal>
          <Reveal>
            <FeatureCard
              icon={<Sparkles className="size-5" />}
              title="AI prompts"
              description="Keep the prompts that actually work, instead of hunting through chat history."
              color={colorFor("prompt")}
            />
          </Reveal>
          <Reveal>
            <FeatureCard
              icon={<Search className="size-5" />}
              title="Instant search"
              description="Full-text across content, tags, titles, and type. Find it before you finish typing."
              color={colorFor("link")}
            />
          </Reveal>
          <Reveal>
            <FeatureCard
              icon={<Terminal className="size-5" />}
              title="Commands"
              description="Every shell one-liner you'd otherwise dig out of history, one search away."
              color={colorFor("command")}
            />
          </Reveal>
          <Reveal>
            <FeatureCard
              icon={<FileText className="size-5" />}
              title="Files & docs"
              description="Templates, boilerplates, and reference docs stored right beside the code that uses them."
              color={colorFor("file")}
            />
          </Reveal>
          <Reveal className="sm:col-span-2 lg:col-span-3">
            <FeatureCard
              icon={<LayoutGrid className="size-5" />}
              title="Collections"
              description="Group snippets, links, and notes for one project into a single shelf, whatever type each one is."
              color={colorFor("note")}
              span="full"
            >
              <div className="mt-4 flex gap-2 lg:mt-0 lg:self-center" aria-hidden="true">
                {ITEM_TYPES.map((t) => (
                  <span
                    key={t.value}
                    className="size-2.5 rounded-full"
                    style={{ backgroundColor: t.color }}
                  />
                ))}
              </div>
            </FeatureCard>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
