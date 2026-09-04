import { describe, expect, it } from "vitest";
import { Spring } from "@/lib/homepage/spring";

describe("Spring", () => {
  it("defaults target and velocity from the initial value", () => {
    const spring = new Spring({ value: 5 });
    expect(spring.value).toBe(5);
    expect(spring.target).toBe(5);
    expect(spring.velocity).toBe(0);
  });

  it("defaults to a value of 0 with no options", () => {
    const spring = new Spring();
    expect(spring.value).toBe(0);
    expect(spring.target).toBe(0);
  });

  it("applies a single step using the mass-spring-damper formula", () => {
    // force = -stiffness * (value - target) = -100 * (0 - 10) = 1000
    // acceleration = force / mass = 1000 (damping is 0, so no damping term)
    // velocity += acceleration * dt = 0 + 1000 * 0.01 = 10
    // value += velocity * dt = 0 + 10 * 0.01 = 0.1
    const spring = new Spring({ value: 0, stiffness: 100, damping: 0, mass: 1 });
    spring.target = 10;

    spring.step(0.01);

    expect(spring.velocity).toBeCloseTo(10);
    expect(spring.value).toBeCloseTo(0.1);
  });

  it("damping opposes velocity, reducing acceleration on steps after the first", () => {
    // Damping's term (-damping * velocity) is 0 on the very first step,
    // since velocity starts at 0 — its effect only shows up once the
    // spring is already moving, so this steps twice.
    const undamped = new Spring({ value: 0, stiffness: 100, damping: 0, mass: 1 });
    undamped.target = 10;
    undamped.step(0.01);
    undamped.step(0.01);

    const damped = new Spring({ value: 0, stiffness: 100, damping: 20, mass: 1 });
    damped.target = 10;
    damped.step(0.01);
    damped.step(0.01);

    expect(damped.velocity).toBeLessThan(undamped.velocity);
  });

  describe("atRest", () => {
    it("is true immediately when value and target start equal with zero velocity", () => {
      const spring = new Spring({ value: 5 });
      expect(spring.atRest()).toBe(true);
    });

    it("is false right after the target moves away from the current value", () => {
      const spring = new Spring({ value: 0 });
      spring.target = 10;
      expect(spring.atRest()).toBe(false);
    });

    it("is false while still moving, even exactly at the target", () => {
      const spring = new Spring({ value: 10 });
      spring.target = 10;
      spring.velocity = 5;
      expect(spring.atRest()).toBe(false);
    });

    it("respects a custom epsilon", () => {
      const spring = new Spring({ value: 0 });
      spring.target = 0.01;
      expect(spring.atRest(0.1)).toBe(true);
      expect(spring.atRest(0.001)).toBe(false);
    });

    it("converges to the target and settles to rest after enough steps", () => {
      const spring = new Spring({ value: 0, stiffness: 170, damping: 26 });
      spring.target = 1;

      for (let i = 0; i < 300; i++) {
        spring.step(1 / 60);
      }

      expect(spring.atRest()).toBe(true);
      expect(spring.value).toBeCloseTo(1, 2);
    });

    it("never settles when critically underdamped enough to oscillate indefinitely in a short run", () => {
      // Very low damping relative to stiffness overshoots the target
      // repeatedly rather than settling within a short number of steps.
      const spring = new Spring({ value: 0, stiffness: 500, damping: 1 });
      spring.target = 1;

      for (let i = 0; i < 10; i++) {
        spring.step(1 / 60);
      }

      expect(spring.atRest()).toBe(false);
    });
  });
});
