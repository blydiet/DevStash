import { describe, expect, it, vi } from "vitest";
import type { KeyboardEvent } from "react";
import { onActivationKeydown } from "@/lib/keyboard-activation";

function makeEvent(overrides: Partial<KeyboardEvent<HTMLElement>>): KeyboardEvent<HTMLElement> {
  const el = {} as HTMLElement;
  return {
    key: "Enter",
    target: el,
    currentTarget: el,
    preventDefault: vi.fn(),
    ...overrides,
  } as unknown as KeyboardEvent<HTMLElement>;
}

describe("onActivationKeydown", () => {
  it("calls the handler on Enter when the event target is the container itself", () => {
    const onActivate = vi.fn();
    const el = {} as HTMLElement;
    const event = makeEvent({ key: "Enter", target: el, currentTarget: el });

    onActivationKeydown(onActivate)(event);

    expect(onActivate).toHaveBeenCalledOnce();
    expect(event.preventDefault).toHaveBeenCalledOnce();
  });

  it("calls the handler on Space when the event target is the container itself", () => {
    const onActivate = vi.fn();
    const el = {} as HTMLElement;
    const event = makeEvent({ key: " ", target: el, currentTarget: el });

    onActivationKeydown(onActivate)(event);

    expect(onActivate).toHaveBeenCalledOnce();
  });

  it("ignores other keys", () => {
    const onActivate = vi.fn();
    const el = {} as HTMLElement;
    const event = makeEvent({ key: "a", target: el, currentTarget: el });

    onActivationKeydown(onActivate)(event);

    expect(onActivate).not.toHaveBeenCalled();
    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  it("does not fire when the keydown bubbled up from a nested interactive child", () => {
    // A real <button> nested inside the container (e.g. the favorite toggle)
    // already has its own native Enter/Space -> click behavior; this handler
    // must not also fire and double-trigger the container's own action.
    const onActivate = vi.fn();
    const container = {} as HTMLElement;
    const nestedButton = {} as HTMLElement;
    const event = makeEvent({ key: "Enter", target: nestedButton, currentTarget: container });

    onActivationKeydown(onActivate)(event);

    expect(onActivate).not.toHaveBeenCalled();
    expect(event.preventDefault).not.toHaveBeenCalled();
  });
});
