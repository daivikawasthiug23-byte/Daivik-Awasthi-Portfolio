"use client";

import { Children, useRef, useState } from "react";

// A swipe row with dots and a "1 / 4" counter on phones, and a two-column grid from 768px up.
export function Swipe({ label, children }: { label: string; children: React.ReactNode }) {
  const track = useRef<HTMLUListElement>(null);
  const items = Children.toArray(children);
  const [current, setCurrent] = useState(0);

  const onScroll = () => {
    const el = track.current;
    if (!el) return;
    const start = el.getBoundingClientRect().left + (parseFloat(getComputedStyle(el).paddingLeft) || 0);
    let nearest = 0;
    let best = Infinity;
    [...el.children].forEach((child, i) => {
      const d = Math.abs(child.getBoundingClientRect().left - start);
      if (d < best) [best, nearest] = [d, i];
    });
    setCurrent(nearest);
  };

  return (
    <div>
      <ul
        ref={track}
        onScroll={onScroll}
        data-stagger
        aria-label={label}
        tabIndex={0}
        className="no-scrollbar relative max-sm:-mx-4 max-sm:flex max-sm:snap-x max-sm:snap-mandatory max-sm:scroll-px-4 max-sm:gap-4 max-sm:overflow-x-auto max-sm:overscroll-x-contain max-sm:px-4 max-sm:pb-3 sm:grid sm:gap-7 md:grid-cols-2"
      >
        {items.map((child, i) => (
          <li key={i} className="h-full max-sm:w-[88%] max-sm:shrink-0 max-sm:snap-start">{child}</li>
        ))}
      </ul>
      <div className="mt-3 flex items-center justify-between sm:hidden" aria-hidden="true">
        <span className="flex gap-1.5">
          {items.map((_, i) => (
            <i
              key={i}
              className={`h-2.5 rounded-[3px] border-2 border-ink transition-[width,background-color] duration-150 ${i === current ? "w-[26px] bg-accent" : "w-2.5"}`}
            />
          ))}
        </span>
        <span className="mono text-sm font-bold text-ink">{current + 1} / {items.length}</span>
      </div>
    </div>
  );
}
