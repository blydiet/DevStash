import Link from "next/link";
import { Package } from "lucide-react";

export function HomeFooter() {
  return (
    <footer className="border-t border-[var(--hp-border)] px-6 pt-16 pb-8">
      <div className="mx-auto grid max-w-[1200px] grid-cols-2 gap-8 sm:grid-cols-[2fr_1fr_1fr]">
        <div>
          <Link href="/" className="inline-flex items-center gap-2 text-[1.0625rem] font-semibold">
            <Package className="size-5 text-[var(--hp-accent)]" aria-hidden="true" />
            DevStash
          </Link>
          <p className="mt-3 text-sm text-[var(--hp-text-tertiary)]">Store smarter. Build faster.</p>
        </div>

        <div className="flex flex-col gap-2.5">
          <h4 className="mb-1 text-[0.8125rem] text-[var(--hp-text-tertiary)]">Product</h4>
          <a href="#features" className="text-[0.9375rem] text-[var(--hp-text-secondary)] hover:text-[var(--hp-text-primary)]">
            Features
          </a>
          <a href="#pricing" className="text-[0.9375rem] text-[var(--hp-text-secondary)] hover:text-[var(--hp-text-primary)]">
            Pricing
          </a>
        </div>

        <div className="flex flex-col gap-2.5">
          <h4 className="mb-1 text-[0.8125rem] text-[var(--hp-text-tertiary)]">Account</h4>
          <Link href="/sign-in" className="text-[0.9375rem] text-[var(--hp-text-secondary)] hover:text-[var(--hp-text-primary)]">
            Sign in
          </Link>
          <Link href="/register" className="text-[0.9375rem] text-[var(--hp-text-secondary)] hover:text-[var(--hp-text-primary)]">
            Get started
          </Link>
        </div>
      </div>

      <div className="mx-auto mt-12 max-w-[1200px] border-t border-[var(--hp-border)] pt-6">
        <p className="text-center text-[0.8125rem] text-[var(--hp-text-tertiary)]">
          &copy; {new Date().getFullYear()} DevStash. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
