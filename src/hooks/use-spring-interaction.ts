"use client";

import { useEffect, useRef } from "react";
import { makeSpringInteraction, type SpringInteractionConfig } from "@/lib/homepage/spring";

/** Attaches a spring hover/press interaction to the returned ref's element. Skipped under `prefers-reduced-motion`, falling back to plain CSS. */
export function useSpringInteraction<T extends HTMLElement>(config: SpringInteractionConfig) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    return makeSpringInteraction(el, config);
  }, [config]);

  return ref;
}
