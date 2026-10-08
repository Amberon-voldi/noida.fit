/** Finite, bounded pointer geometry; invalid input always settles the artwork. */
export function heroPointerFrame(x: number, y: number, width: number, height: number) {
  if (![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0) return { x: 0, y: 0, rotation: 0 };
  const horizontal = Math.max(-1, Math.min(1, x / width * 2 - 1));
  const vertical = Math.max(-1, Math.min(1, y / height * 2 - 1));
  return { x: horizontal * 18, y: vertical * 14, rotation: horizontal * 5 };
}

/** Shares landing mode; no render-on-pointer, timers, continuous RAF, or touch/scroll interception. */
export function createHeroInteraction(root: HTMLElement, canMove: () => boolean) {
  const hero = root.querySelector<HTMLElement>(".kinetic-hero");
  const energy = root.querySelector<HTMLElement>("[data-hero-energy]");
  const button = energy?.querySelector<HTMLButtonElement>("[data-hero-pulse]");
  if (!hero || !energy || !button) return { sync() {}, destroy() {} };
  const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
  // Older browsers without visibility observation get the readable static artwork.
  let visible = false;
  let suspended = false;
  let disposed = false;
  let frame = 0;
  let pointer: { x: number; y: number } | null = null;
  const pulses = new Map<Element, Animation>();
  const running = () => !disposed && visible && !suspended && canMove();
  const settle = () => {
    energy.style.removeProperty("--hero-x");
    energy.style.removeProperty("--hero-y");
    energy.style.removeProperty("--hero-roll");
  };
  const stop = () => {
    cancelAnimationFrame(frame); frame = 0; pointer = null; settle();
    pulses.forEach(animation => animation.cancel()); pulses.clear();
    delete energy.dataset.pulsing;
  };
  const sync = () => {
    const active = running();
    energy.dataset.energy = active ? "running" : "still";
    button.disabled = !active;
    if (!active) stop();
  };
  const update = () => {
    frame = 0;
    if (!running() || !pointer) { settle(); return; }
    // One geometry read, then batched writes. The measured hero is never transformed.
    const rect = hero.getBoundingClientRect();
    const pose = heroPointerFrame(pointer.x - rect.left, pointer.y - rect.top, rect.width, rect.height);
    energy.style.setProperty("--hero-x", `${pose.x.toFixed(2)}px`);
    energy.style.setProperty("--hero-y", `${pose.y.toFixed(2)}px`);
    energy.style.setProperty("--hero-roll", `${pose.rotation.toFixed(2)}deg`);
  };
  const move = (event: PointerEvent) => {
    // Touch remains native vertical scrolling; a native button click supplies tap interaction.
    if (!running() || event.pointerType === "touch") return;
    pointer = { x: event.clientX, y: event.clientY };
    if (!frame) frame = requestAnimationFrame(update);
  };
  const leave = () => { pointer = null; if (!frame && running()) frame = requestAnimationFrame(update); };
  const pulse = () => {
    if (!running() || pulses.size) return;
    for (const node of energy.querySelectorAll<SVGElement>(".hero-energy-burst")) {
      if (typeof node.animate !== "function") continue;
      const animation = node.animate([
        { opacity: .65, transform: "scale(.8)" },
        { opacity: 0, transform: "scale(1.8)" },
      ], { duration: 850, easing: "cubic-bezier(.16,1,.3,1)" });
      pulses.set(node, animation);
      const finished = () => {
        if (pulses.get(node) === animation) pulses.delete(node);
        if (!disposed && !pulses.size) delete energy.dataset.pulsing;
      };
      void animation.finished.then(finished, finished);
    }
    if (pulses.size) energy.dataset.pulsing = "true";
  };
  const hide = () => { suspended = true; sync(); };
  const show = () => { suspended = false; sync(); };
  const observer = typeof IntersectionObserver === "function" ? new IntersectionObserver(entries => {
    visible = entries.some(entry => entry.isIntersecting); sync();
  }, { threshold: 0 }) : null;
  observer?.observe(energy);
  hero.addEventListener("pointermove", move, { passive: true });
  hero.addEventListener("pointerleave", leave, { passive: true });
  hero.addEventListener("pointercancel", leave, { passive: true });
  button.addEventListener("click", pulse);
  preference.addEventListener("change", sync);
  window.addEventListener("pagehide", hide);
  window.addEventListener("pageshow", show);
  sync();
  return {
    sync,
    destroy() {
      disposed = true; stop(); observer?.disconnect();
      hero.removeEventListener("pointermove", move);
      hero.removeEventListener("pointerleave", leave);
      hero.removeEventListener("pointercancel", leave);
      button.removeEventListener("click", pulse);
      preference.removeEventListener("change", sync);
      window.removeEventListener("pagehide", hide);
      window.removeEventListener("pageshow", show);
      energy.dataset.energy = "still"; button.disabled = true;
    },
  };
}
