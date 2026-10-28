"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

export interface PlanTab { id: string; label: string; count: number; content: ReactNode; }

/** One card with segmented tabs instead of three stacked lists. A matching #hash selects its tab. */
export function PlanTabs({ tabs, label }: { tabs: PlanTab[]; label: string }) {
  const [active, setActive] = useState(tabs[0]?.id);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const ids = tabs.map(tab => tab.id).join(" ");

  useEffect(() => {
    const known = ids.split(" ");
    let frame = 0;
    const sync = () => {
      const id = window.location.hash.slice(1);
      if (known.includes(id)) setActive(id);
    };
    function onClick(event: MouseEvent) {
      // A repeated click on the same #hash emits no hashchange.
      const anchor = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href^='#']") : null;
      const id = anchor?.hash.slice(1);
      if (id && known.includes(id)) setActive(id);
    }
    frame = requestAnimationFrame(sync);
    window.addEventListener("hashchange", sync);
    document.addEventListener("click", onClick);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("hashchange", sync);
      document.removeEventListener("click", onClick);
    };
  }, [ids]);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const index = tabs.findIndex(tab => tab.id === active);
    const next = event.key === "ArrowRight" ? index + 1 : event.key === "ArrowLeft" ? index - 1 : event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : null;
    if (next === null) return;
    event.preventDefault();
    const tab = tabs[(next + tabs.length) % tabs.length];
    setActive(tab.id);
    tabRefs.current[tab.id]?.focus();
  }

  return <div className="plan-tabs">
    <div role="tablist" aria-label={label} className="plan-tablist" onKeyDown={onKeyDown}>
      {tabs.map(tab => <button key={tab.id} ref={node => { tabRefs.current[tab.id] = node; }} type="button" role="tab" id={`${tab.id}-tab`} aria-selected={active === tab.id} aria-controls={tab.id} tabIndex={active === tab.id ? 0 : -1} onClick={() => setActive(tab.id)} className="plan-tab">
        {tab.label}<span className="plan-tab-count">{tab.count}</span>
      </button>)}
    </div>
    {tabs.map(tab => <div key={tab.id} role="tabpanel" id={tab.id} aria-labelledby={`${tab.id}-tab`} hidden={active !== tab.id} tabIndex={0} className="plan-panel">{tab.content}</div>)}
  </div>;
}
