/** Finite, bounded pointer geometry; invalid input always settles the artwork. */
export function heroPointerFrame(x: number, y: number, width: number, height: number) {
  if (![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0) return { x: 0, y: 0, rotation: 0 };
  const horizontal = Math.max(-1, Math.min(1, x / width * 2 - 1));
  const vertical = Math.max(-1, Math.min(1, y / height * 2 - 1));
  return { x: horizontal * 18, y: vertical * 14, rotation: horizontal * 5 };
}

/** Position of a card in the deck when `active` is on top; 0 is the front card. */
export function deckPosition(index: number, active: number, count: number): number {
  if (!Number.isInteger(index) || !Number.isInteger(active) || !Number.isInteger(count) || count <= 0) return 0;
  return ((index - active) % count + count) % count;
}

/**
 * Pointer tilt shares landing mode; no render-on-pointer, timers, continuous RAF, or touch/scroll interception.
 * The deck shuffle is a content control: it always works with JavaScript and only animates when motion is allowed.
 */
export function createHeroInteraction(root: HTMLElement, canMove: () => boolean) {
  const hero = root.querySelector<HTMLElement>(".kinetic-hero");
  const deck = root.querySelector<HTMLElement>("[data-hero-deck]");
  const button = deck?.querySelector<HTMLButtonElement>("[data-hero-next]");
  const status = deck?.querySelector<HTMLElement>("[data-deck-status]");
  const cards = deck ? Array.from(deck.querySelectorAll<HTMLElement>("[data-deck-card]")) : [];
  if (!hero || !deck || !button || !cards.length) return { sync() {}, destroy() {} };
  // Older browsers without visibility observation get the readable static deck.
  let visible = false;
  let suspended = false;
  let disposed = false;
  let frame = 0;
  let active = 0;
  let pointer: { x: number; y: number } | null = null;
  let leaving: Animation | null = null;
  const running = () => !disposed && visible && !suspended && canMove();
  const settle = () => {
    deck.style.removeProperty("--hero-x");
    deck.style.removeProperty("--hero-y");
    deck.style.removeProperty("--hero-roll");
  };
  const layout = () => cards.forEach((card, index) => {
    const position = deckPosition(index, active, cards.length);
    card.dataset.pos = String(position);
    card.inert = position !== 0;
    if (position === 0) card.removeAttribute("aria-hidden"); else card.setAttribute("aria-hidden", "true");
  });
  const advance = () => {
    active = (active + 1) % cards.length;
    layout();
    if (status) status.textContent = `${cards[active].dataset.deckLabel ?? "Next"} — ${active + 1} of ${cards.length}`;
  };
  const finishLeaving = () => {
    const animation = leaving;
    if (!animation) return;
    leaving = null;
    delete deck.dataset.shuffling;
    advance();
    // The card has been parked at the hidden back position before its fill is released.
    animation.cancel();
  };
  const stop = () => {
    cancelAnimationFrame(frame); frame = 0; pointer = null; settle();
    finishLeaving();
  };
  const sync = () => {
    const tilting = running();
    deck.dataset.tilt = tilting ? "running" : "still";
    if (!tilting) stop();
  };
  const update = () => {
    frame = 0;
    if (!running() || !pointer) { settle(); return; }
    // One geometry read, then batched writes. The measured hero is never transformed.
    const rect = hero.getBoundingClientRect();
    const pose = heroPointerFrame(pointer.x - rect.left, pointer.y - rect.top, rect.width, rect.height);
    deck.style.setProperty("--hero-x", `${pose.x.toFixed(2)}px`);
    deck.style.setProperty("--hero-y", `${pose.y.toFixed(2)}px`);
    deck.style.setProperty("--hero-roll", `${pose.rotation.toFixed(2)}deg`);
  };
  const move = (event: PointerEvent) => {
    // Touch remains native vertical scrolling; the native button supplies tap interaction.
    if (!running() || event.pointerType === "touch") return;
    pointer = { x: event.clientX, y: event.clientY };
    if (!frame) frame = requestAnimationFrame(update);
  };
  const leave = () => { pointer = null; if (!frame && running()) frame = requestAnimationFrame(update); };
  const dealt = (event: AnimationEvent) => {
    if ((event.target as HTMLElement).dataset?.pos === "3") deck.dataset.dealt = "true";
  };
  const next = () => {
    if (disposed || leaving) return;
    deck.dataset.dealt = "true";
    const front = cards[active];
    if (!running() || typeof front.animate !== "function") { advance(); return; }
    deck.dataset.shuffling = "true";
    const animation = front.animate([
      { transform: "none", opacity: 1 },
      { transform: "translate3d(-118%, 6%, 0) rotate(-18deg)", opacity: 0 },
    ], { duration: 320, easing: "cubic-bezier(.55,0,.8,.3)", fill: "forwards" });
    leaving = animation;
    const done = () => { if (leaving === animation) finishLeaving(); };
    void animation.finished.then(done, done);
  };
  const hide = () => { suspended = true; sync(); };
  const show = () => { suspended = false; sync(); };
  const observer = typeof IntersectionObserver === "function" ? new IntersectionObserver(entries => {
    visible = entries.some(entry => entry.isIntersecting); sync();
  }, { threshold: 0 }) : null;
  observer?.observe(deck);
  hero.addEventListener("pointermove", move, { passive: true });
  hero.addEventListener("pointerleave", leave, { passive: true });
  hero.addEventListener("pointercancel", leave, { passive: true });
  button.addEventListener("click", next);
  deck.addEventListener("animationend", dealt);
  window.addEventListener("pagehide", hide);
  window.addEventListener("pageshow", show);
  deck.dataset.interactive = "true";
  sync();
  return {
    sync,
    destroy() {
      stop(); disposed = true; observer?.disconnect();
      hero.removeEventListener("pointermove", move);
      hero.removeEventListener("pointerleave", leave);
      hero.removeEventListener("pointercancel", leave);
      button.removeEventListener("click", next);
      deck.removeEventListener("animationend", dealt);
      window.removeEventListener("pagehide", hide);
      window.removeEventListener("pageshow", show);
      deck.dataset.tilt = "still";
      delete deck.dataset.interactive;
    },
  };
}
