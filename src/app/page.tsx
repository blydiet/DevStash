import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { spaceGrotesk, jetbrainsMono } from "@/app/fonts/homepage-fonts";
import { HomeNav } from "@/components/homepage/HomeNav";
import { HeroSection } from "@/components/homepage/HeroSection";
import { FeaturesSection } from "@/components/homepage/FeaturesSection";
import { AiSection } from "@/components/homepage/AiSection";
import { PricingSection } from "@/components/homepage/PricingSection";
import { CtaSection } from "@/components/homepage/CtaSection";
import { HomeFooter } from "@/components/homepage/HomeFooter";
import "@/app/homepage.css";

export default async function Home() {
  const session = await auth();
  if (session?.user?.id) {
    redirect("/dashboard");
  }

  return (
    <div className={`homepage overflow-x-hidden ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}>
      <HomeNav />
      <main>
        <HeroSection />
        <FeaturesSection />
        <AiSection />
        <PricingSection />
        <CtaSection />
      </main>
      <HomeFooter />
    </div>
  );
}
