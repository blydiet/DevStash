(() => {
  "use strict";

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ------------------------------------------------------------------ */
  /* Spring physics: a small mass-spring-damper integrator, in the style */
  /* of Josh Comeau's "Whimsical Animations" work. Unlike a CSS           */
  /* transition, a spring driven per-frame off real velocity keeps       */
  /* moving naturally from wherever it currently is when the target      */
  /* changes mid-flight (e.g. a fast hover-in/hover-out), instead of      */
  /* restarting or snapping.                                             */
  /* ------------------------------------------------------------------ */

  class Spring {
    constructor({ value = 0, stiffness = 210, damping = 20, mass = 1 } = {}) {
      this.value = value;
      this.target = value;
      this.velocity = 0;
      this.stiffness = stiffness;
      this.damping = damping;
      this.mass = mass;
    }

    step(dt) {
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

  /**
   * Wires up a hover/press/focus interaction on `el` where each listed
   * property is driven by its own spring and re-rendered every frame via
   * `render(el, values)`. The rAF loop only runs while at least one spring
   * is still moving, so idle elements cost nothing.
   */
  function makeSpringInteraction(el, { rest, hover, press = hover, stiffness = 260, damping = 18, render }) {
    const props = Object.keys(rest);
    const springs = {};
    props.forEach((key) => {
      springs[key] = new Spring({ value: rest[key], stiffness, damping });
    });

    let running = false;
    let lastTime = 0;

    function frame(now) {
      const dt = Math.min((now - lastTime) / 1000, 0.032);
      lastTime = now;

      const values = {};
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
      requestAnimationFrame(frame);
    }

    function start() {
      if (running) return;
      running = true;
      lastTime = performance.now();
      requestAnimationFrame(frame);
    }

    function setTarget(state) {
      props.forEach((key) => {
        if (key in state) springs[key].target = state[key];
      });
      start();
    }

    el.addEventListener("pointerenter", () => setTarget(hover));
    el.addEventListener("pointerleave", () => setTarget(rest));
    el.addEventListener("pointerdown", () => setTarget(press));
    el.addEventListener("pointerup", () => setTarget(hover));
    el.addEventListener("focusin", () => setTarget(hover));
    el.addEventListener("focusout", () => setTarget(rest));
  }

  /* ------------------------------------------------------------------ */
  /* Footer year                                                         */
  /* ------------------------------------------------------------------ */

  const yearEl = document.getElementById("footer-year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ------------------------------------------------------------------ */
  /* Nav opacity on scroll (IntersectionObserver, no scroll listener)    */
  /* ------------------------------------------------------------------ */

  const nav = document.getElementById("nav");
  const sentinel = document.getElementById("top-sentinel");

  if (nav && sentinel && "IntersectionObserver" in window) {
    const navObserver = new IntersectionObserver(
      ([entry]) => {
        nav.classList.toggle("is-scrolled", !entry.isIntersecting);
      },
      { threshold: 0 }
    );
    navObserver.observe(sentinel);
  }

  /* ------------------------------------------------------------------ */
  /* Springy button + card hover (skipped entirely under reduced motion, */
  /* falling back to the plain CSS :hover/:active rules already in       */
  /* styles.css)                                                         */
  /* ------------------------------------------------------------------ */

  if (!prefersReducedMotion) {
    document.querySelectorAll(".btn").forEach((el) => {
      makeSpringInteraction(el, {
        rest: { scale: 1 },
        hover: { scale: 1.045 },
        press: { scale: 0.93 },
        stiffness: 320,
        damping: 14,
        render: (target, v) => {
          target.style.transform = `scale(${v.scale})`;
        },
      });
    });

    document.querySelectorAll(".feature-card").forEach((el) => {
      makeSpringInteraction(el, {
        rest: { lift: 0, scale: 1 },
        hover: { lift: -6, scale: 1.015 },
        press: { lift: -2, scale: 0.99 },
        stiffness: 220,
        damping: 16,
        render: (target, v) => {
          target.style.transform = `translateY(${v.lift}px) scale(${v.scale})`;
        },
      });
    });

    document.querySelectorAll(".price-card").forEach((el) => {
      makeSpringInteraction(el, {
        rest: { lift: 0 },
        hover: { lift: -5 },
        press: { lift: -1 },
        stiffness: 220,
        damping: 16,
        render: (target, v) => {
          target.style.transform = `translateY(${v.lift}px)`;
        },
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* Scroll reveal: a one-shot spring pop (opacity + rise, with a slight */
  /* overshoot past its resting position) instead of a linear ease.      */
  /* ------------------------------------------------------------------ */

  const revealTargets = document.querySelectorAll(".reveal");

  function springReveal(el) {
    const ySpring = new Spring({ value: 28, stiffness: 170, damping: 15 });
    const opacitySpring = new Spring({ value: 0, stiffness: 170, damping: 22 });
    ySpring.target = 0;
    opacitySpring.target = 1;

    let lastTime = performance.now();

    function frame(now) {
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
      requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
  }

  if ("IntersectionObserver" in window && !prefersReducedMotion) {
    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            springReveal(entry.target);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );
    revealTargets.forEach((el) => revealObserver.observe(el));
  } else {
    revealTargets.forEach((el) => {
      el.style.opacity = "1";
      el.style.transform = "none";
    });
  }

  /* ------------------------------------------------------------------ */
  /* Pricing billing toggle                                              */
  /* ------------------------------------------------------------------ */

  const billingToggle = document.getElementById("billing-toggle");
  const labelMonthly = document.getElementById("label-monthly");
  const labelYearly = document.getElementById("label-yearly");
  const proPriceAmount = document.querySelector(".price-amount[data-monthly]");
  const proPriceNote = document.getElementById("pro-price-note");

  if (billingToggle) {
    billingToggle.addEventListener("click", () => {
      const isYearly = billingToggle.getAttribute("aria-checked") !== "true";
      billingToggle.setAttribute("aria-checked", String(isYearly));

      labelMonthly.classList.toggle("is-active", !isYearly);
      labelYearly.classList.toggle("is-active", isYearly);

      if (proPriceAmount) {
        proPriceAmount.textContent = isYearly
          ? proPriceAmount.dataset.yearly
          : proPriceAmount.dataset.monthly;
      }
      if (proPriceNote) {
        proPriceNote.textContent = isYearly ? "billed annually at $72/yr" : "billed monthly";
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /* Chaos icons: drift, bounce off walls, repel from cursor, and        */
  /* squash/stretch on impact (the classic animation-principles trick    */
  /* for making a bounce read as a real physical hit rather than a       */
  /* rigid sprite reversing direction).                                 */
  /* ------------------------------------------------------------------ */

  const stage = document.getElementById("chaos-stage");
  if (!stage) return;

  const ICONS = [
    { kind: "logo", alt: "Notion", src: "https://cdn.simpleicons.org/notion/9d9da8" },
    { kind: "logo", alt: "GitHub", src: "https://cdn.simpleicons.org/github/9d9da8" },
    { kind: "logo", alt: "Discord", src: "https://cdn.simpleicons.org/discord/9d9da8" },
    { kind: "logo", alt: "Sublime Text", src: "https://cdn.simpleicons.org/sublimetext/9d9da8" },
    { kind: "icon", alt: "Browser tabs", cls: "ph-browser" },
    { kind: "icon", alt: "Terminal", cls: "ph-terminal-window" },
    { kind: "icon", alt: "Text file", cls: "ph-file-text" },
    { kind: "icon", alt: "Bookmark", cls: "ph-bookmark-simple" },
  ];

  const ICON_SIZE = 56;
  const REPEL_RADIUS = 90;
  const REPEL_STRENGTH = 1600;

  const bodies = [];

  ICONS.forEach((spec, i) => {
    const el = document.createElement("div");
    el.className = "chaos-icon";
    el.title = spec.alt;

    if (spec.kind === "logo") {
      const img = document.createElement("img");
      img.src = spec.src;
      img.alt = spec.alt;
      img.width = 28;
      img.height = 28;
      el.appendChild(img);
    } else {
      const icon = document.createElement("i");
      icon.className = `ph ${spec.cls}`;
      icon.setAttribute("aria-hidden", "true");
      el.appendChild(icon);
    }

    stage.appendChild(el);

    // Spread the starting positions across a loose grid so nothing overlaps
    // on first paint, then physics takes over.
    const col = i % 4;
    const row = Math.floor(i / 4);
    bodies.push({
      el,
      x: 40 + col * 80 + (Math.random() * 20 - 10),
      y: 50 + row * 130 + (Math.random() * 20 - 10),
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      rotPhase: Math.random() * Math.PI * 2,
      scalePhase: Math.random() * Math.PI * 2,
    });
  });

  let pointerX = null;
  let pointerY = null;

  stage.addEventListener(
    "pointermove",
    (event) => {
      const rect = stage.getBoundingClientRect();
      pointerX = event.clientX - rect.left;
      pointerY = event.clientY - rect.top;
    },
    { passive: true }
  );

  stage.addEventListener(
    "pointerleave",
    () => {
      pointerX = null;
      pointerY = null;
    },
    { passive: true }
  );

  if (prefersReducedMotion) {
    // Static, evenly-spaced placement, no rAF loop.
    bodies.forEach((body) => {
      body.el.style.transform = `translate(${body.x}px, ${body.y}px)`;
    });
    return;
  }

  let lastTime = performance.now();

  function tick(now) {
    const dt = Math.min(now - lastTime, 32); // clamp so a tab switch doesn't cause a jump
    lastTime = now;
    const dtFactor = dt / 16;

    const stageWidth = stage.clientWidth;
    const stageHeight = stage.clientHeight;

    bodies.forEach((body) => {
      // Repel from the cursor.
      if (pointerX !== null) {
        const cx = body.x + ICON_SIZE / 2;
        const cy = body.y + ICON_SIZE / 2;
        const dx = cx - pointerX;
        const dy = cy - pointerY;
        const distSq = dx * dx + dy * dy;
        if (distSq < REPEL_RADIUS * REPEL_RADIUS && distSq > 0.01) {
          const dist = Math.sqrt(distSq);
          const force = (REPEL_STRENGTH / distSq) * dtFactor;
          body.vx += (dx / dist) * force;
          body.vy += (dy / dist) * force;
        }
      }

      // Gentle drift + velocity damping so repelled icons settle back down.
      body.vx *= 0.98;
      body.vy *= 0.98;
      const speed = Math.hypot(body.vx, body.vy);
      const maxSpeed = 1.2;
      if (speed > maxSpeed) {
        body.vx = (body.vx / speed) * maxSpeed;
        body.vy = (body.vy / speed) * maxSpeed;
      }

      body.x += body.vx * dtFactor;
      body.y += body.vy * dtFactor;

      // Bounce off the stage walls.
      if (body.x <= 0) {
        body.x = 0;
        body.vx = Math.abs(body.vx) + 0.05;
      } else if (body.x >= stageWidth - ICON_SIZE) {
        body.x = stageWidth - ICON_SIZE;
        body.vx = -Math.abs(body.vx) - 0.05;
      }
      if (body.y <= 0) {
        body.y = 0;
        body.vy = Math.abs(body.vy) + 0.05;
      } else if (body.y >= stageHeight - ICON_SIZE) {
        body.y = stageHeight - ICON_SIZE;
        body.vy = -Math.abs(body.vy) - 0.05;
      }

      body.rotPhase += dt * 0.0006;
      body.scalePhase += dt * 0.0009;
      const rotation = Math.sin(body.rotPhase) * 6;
      const scale = 1 + Math.sin(body.scalePhase) * 0.06;

      body.el.style.transform = `translate(${body.x}px, ${body.y}px) rotate(${rotation}deg) scale(${scale})`;
    });

    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
})();
