/**
 * A small mass-spring-damper integrator (in the style of Josh Comeau's
 * "Whimsical Animations" work). Unlike a CSS transition, a spring driven
 * per-frame off real velocity keeps moving naturally from wherever it
 * currently is when the target changes mid-flight (e.g. a fast
 * hover-in/hover-out), instead of restarting or snapping.
 */
export class Spring {
  value: number;
  target: number;
  velocity: number;
  stiffness: number;
  damping: number;
  mass: number;

  constructor({
    value = 0,
    stiffness = 210,
    damping = 20,
    mass = 1,
  }: { value?: number; stiffness?: number; damping?: number; mass?: number } = {}) {
    this.value = value;
    this.target = value;
    this.velocity = 0;
    this.stiffness = stiffness;
    this.damping = damping;
    this.mass = mass;
  }

  step(dt: number) {
    const force = -this.stiffness * (this.value - this.target);
    const damping = -this.damping * this.velocity;
    const acceleration = (force + damping) / this.mass;
    this.velocity += acceleration * dt;
    this.value += this.velocity * dt;
  }

  atRest(epsilon = 0.0015) {
    return Math.abs(this.velocity) < epsilon && Math.abs(this.value - this.target) < epsilon;
  }
}

type SpringState = Record<string, number>;

export interface SpringInteractionConfig {
  rest: SpringState;
  hover: SpringState;
  press?: SpringState;
  stiffness?: number;
  damping?: number;
  render: (el: HTMLElement, values: SpringState) => void;
}

/**
 * Wires up a hover/press/focus interaction on `el` where each listed
 * property is driven by its own spring and re-rendered every frame via
 * `render(el, values)`. The rAF loop only runs while at least one spring
 * is still moving, so idle elements cost nothing. Returns a cleanup
 * function that removes the listeners.
 */
export function makeSpringInteraction(
  el: HTMLElement,
  { rest, hover, press = hover, stiffness = 260, damping = 18, render }: SpringInteractionConfig,
) {
  const props = Object.keys(rest);
  const springs: Record<string, Spring> = {};
  props.forEach((key) => {
    springs[key] = new Spring({ value: rest[key], stiffness, damping });
  });

  let running = false;
  let lastTime = 0;
  let rafId: number;

  function frame(now: number) {
    const dt = Math.min((now - lastTime) / 1000, 0.032);
    lastTime = now;

    const values: SpringState = {};
    let allAtRest = true;
    props.forEach((key) => {
      const spring = springs[key];
      spring.step(dt);
      values[key] = spring.value;
      if (!spring.atRest()) allAtRest = false;
    });

    render(el, values);

    if (allAtRest) {
      running = false;
      return;
    }
    rafId = requestAnimationFrame(frame);
  }

  function start() {
    if (running) return;
    running = true;
    lastTime = performance.now();
    rafId = requestAnimationFrame(frame);
  }

  function setTarget(state: SpringState) {
    props.forEach((key) => {
      if (key in state) springs[key].target = state[key];
    });
    start();
  }

  const onEnter = () => setTarget(hover);
  const onLeave = () => setTarget(rest);
  const onDown = () => setTarget(press);
  const onUp = () => setTarget(hover);
  const onFocusIn = () => setTarget(hover);
  const onFocusOut = () => setTarget(rest);

  el.addEventListener("pointerenter", onEnter);
  el.addEventListener("pointerleave", onLeave);
  el.addEventListener("pointerdown", onDown);
  el.addEventListener("pointerup", onUp);
  el.addEventListener("focusin", onFocusIn);
  el.addEventListener("focusout", onFocusOut);

  return () => {
    cancelAnimationFrame(rafId);
    el.removeEventListener("pointerenter", onEnter);
    el.removeEventListener("pointerleave", onLeave);
    el.removeEventListener("pointerdown", onDown);
    el.removeEventListener("pointerup", onUp);
    el.removeEventListener("focusin", onFocusIn);
    el.removeEventListener("focusout", onFocusOut);
  };
}

/** Preset spring interactions, shared/stable references for `useSpringInteraction`'s effect deps. */
export const BUTTON_SPRING: SpringInteractionConfig = {
  rest: { scale: 1 },
  hover: { scale: 1.045 },
  press: { scale: 0.93 },
  stiffness: 320,
  damping: 14,
  render: (el, v) => {
    el.style.transform = `scale(${v.scale})`;
  },
};

export const FEATURE_CARD_SPRING: SpringInteractionConfig = {
  rest: { lift: 0, scale: 1 },
  hover: { lift: -6, scale: 1.015 },
  press: { lift: -2, scale: 0.99 },
  stiffness: 220,
  damping: 16,
  render: (el, v) => {
    el.style.transform = `translateY(${v.lift}px) scale(${v.scale})`;
  },
};

export const PRICE_CARD_SPRING: SpringInteractionConfig = {
  rest: { lift: 0 },
  hover: { lift: -5 },
  press: { lift: -1 },
  stiffness: 220,
  damping: 16,
  render: (el, v) => {
    el.style.transform = `translateY(${v.lift}px)`;
  },
};

/**
 * One-shot spring pop (opacity + rise, with a slight overshoot) used by
 * `<Reveal>`. Returns a cancel function so a caller whose element
 * unmounts mid-animation can stop the rAF loop instead of leaking it.
 */
export function springReveal(el: HTMLElement): () => void {
  const ySpring = new Spring({ value: 28, stiffness: 170, damping: 15 });
  const opacitySpring = new Spring({ value: 0, stiffness: 170, damping: 22 });
  ySpring.target = 0;
  opacitySpring.target = 1;

  let lastTime = performance.now();
  let rafId: number;

  function frame(now: number) {
    const dt = Math.min((now - lastTime) / 1000, 0.032);
    lastTime = now;

    ySpring.step(dt);
    opacitySpring.step(dt);

    el.style.opacity = String(Math.min(1, Math.max(0, opacitySpring.value)));
    el.style.transform = `translateY(${ySpring.value}px)`;

    if (ySpring.atRest() && opacitySpring.atRest()) {
      el.style.opacity = "1";
      el.style.transform = "translateY(0px)";
      return;
    }
    rafId = requestAnimationFrame(frame);
  }

  rafId = requestAnimationFrame(frame);

  return () => cancelAnimationFrame(rafId);
}
