export interface ChaosBody {
  el: HTMLElement;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotPhase: number;
  scalePhase: number;
}

const ICON_SIZE = 56;
const REPEL_RADIUS = 90;
const REPEL_STRENGTH = 1600;
const MAX_SPEED = 1.2;

/**
 * Drifts each body around `stage`, bouncing off its walls and repelling
 * from the pointer. Positions are written directly to `body.el.style`
 * every frame via `requestAnimationFrame`, not React state, since a
 * 60fps re-render per icon would be wasted work. Returns a cleanup
 * function that cancels the loop and removes the pointer listeners.
 */
export function createChaosAnimation(stage: HTMLElement, bodies: ChaosBody[]) {
  let pointerX: number | null = null;
  let pointerY: number | null = null;
  let rafId: number;
  let lastTime = performance.now();

  function handlePointerMove(event: PointerEvent) {
    const rect = stage.getBoundingClientRect();
    pointerX = event.clientX - rect.left;
    pointerY = event.clientY - rect.top;
  }

  function handlePointerLeave() {
    pointerX = null;
    pointerY = null;
  }

  stage.addEventListener("pointermove", handlePointerMove, { passive: true });
  stage.addEventListener("pointerleave", handlePointerLeave, { passive: true });

  function tick(now: number) {
    const dt = Math.min(now - lastTime, 32);
    lastTime = now;
    const dtFactor = dt / 16;

    const stageWidth = stage.clientWidth;
    const stageHeight = stage.clientHeight;

    bodies.forEach((body) => {
      if (pointerX !== null && pointerY !== null) {
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

      body.vx *= 0.98;
      body.vy *= 0.98;
      const speed = Math.hypot(body.vx, body.vy);
      if (speed > MAX_SPEED) {
        body.vx = (body.vx / speed) * MAX_SPEED;
        body.vy = (body.vy / speed) * MAX_SPEED;
      }

      body.x += body.vx * dtFactor;
      body.y += body.vy * dtFactor;

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

    rafId = requestAnimationFrame(tick);
  }

  rafId = requestAnimationFrame(tick);

  return function stop() {
    cancelAnimationFrame(rafId);
    stage.removeEventListener("pointermove", handlePointerMove);
    stage.removeEventListener("pointerleave", handlePointerLeave);
  };
}
