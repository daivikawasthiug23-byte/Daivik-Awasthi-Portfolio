"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

// Elements opt in with data attributes, so the pages stay server components:
//   data-hero          items that play in sequence on first paint
//   data-hero-photo    the hero image (pops in with a slight tilt)
//   data-reveal        fades and rises once when scrolled into view
//   data-stagger       its children reveal one after another
//   data-count         a number like "850+" or "8.85" that counts up
// Nothing runs under prefers-reduced-motion, and the CSS that pre-hides these
// elements only applies when motion is allowed, so content is never stuck hidden.
export function PageAnimations() {
  const bar = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // GSAP edits the DOM, so wait until React has finished hydrating the page
  // (two frames after mount) or the server HTML and client DOM would differ.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let b = 0;
    const a = requestAnimationFrame(() => { b = requestAnimationFrame(() => setReady(true)); });
    return () => { cancelAnimationFrame(a); cancelAnimationFrame(b); };
  }, []);

  useGSAP(
    () => {
      if (!ready) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const all = <T extends Element = HTMLElement>(sel: string) => gsap.utils.toArray<T>(sel);
        const done = { clearProps: "transform" };

        // Scroll progress bar under the nav.
        if (bar.current) {
          gsap.to(bar.current, {
            scaleX: 1,
            ease: "none",
            scrollTrigger: { trigger: document.documentElement, start: "top top", end: "bottom bottom", scrub: 0.3 },
          });
        }

        // Hero intro.
        const hero = all("[data-hero]");
        if (hero.length) {
          const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
          tl.fromTo(hero, { autoAlpha: 0, y: 32 }, { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.12, ...done });
          const photo = all("[data-hero-photo]");
          if (photo.length) {
            tl.fromTo(
              photo,
              { autoAlpha: 0, scale: 0.9, rotate: -3, y: 24 },
              { autoAlpha: 1, scale: 1, rotate: 0, y: 0, duration: 1, ease: "back.out(1.5)", ...done },
              0.15,
            );
          }
        }

        // Single elements reveal on scroll.
        all("[data-reveal]").forEach((el) => {
          gsap.fromTo(
            el,
            { autoAlpha: 0, y: 36 },
            {
              autoAlpha: 1, y: 0, duration: 0.8, ease: "power3.out", ...done,
              scrollTrigger: { trigger: el, start: "top 88%", once: true },
            },
          );
        });

        // Groups reveal child by child.
        all("[data-stagger]").forEach((group) => {
          const kids = [...group.children] as HTMLElement[];
          gsap.fromTo(
            kids,
            { autoAlpha: 0, y: 32 },
            {
              autoAlpha: 1, y: 0, duration: 0.7, ease: "power3.out", stagger: 0.09, ...done,
              scrollTrigger: { trigger: group, start: "top 85%", once: true },
            },
          );
        });

        // Numbers count up, keeping their suffix ("850+" -> 0 ... 850+).
        all("[data-count]").forEach((el) => {
          // Remember the real value: a reverted run leaves the "0+" placeholder
          // in the DOM, and the next run would otherwise count up to 0.
          const text = (el.dataset.countFinal ??= el.textContent ?? "");
          const m = text.match(/^(\d+(?:\.\d+)?)(.*)$/);
          if (!m) return;
          const [, num, suffix] = m;
          const decimals = num.includes(".") ? num.split(".")[1].length : 0;
          const state = { v: 0 };
          const render = () => { el.textContent = state.v.toFixed(decimals) + suffix; };
          render();
          gsap.to(state, {
            v: parseFloat(num), duration: 1.6, ease: "power2.out", onUpdate: render,
            onComplete: () => { el.textContent = text; },
            scrollTrigger: { trigger: el, start: "top 92%", once: true },
          });
        });

        // Layout shifts from fonts and images move trigger positions.
        const refresh = () => ScrollTrigger.refresh();
        addEventListener("load", refresh);
        return () => {
          removeEventListener("load", refresh);
          // Put the real numbers back if we're torn down mid-count.
          all("[data-count]").forEach((el) => {
            if (el.dataset.countFinal) el.textContent = el.dataset.countFinal;
          });
        };
      });
      return () => mm.revert();
    },
    { dependencies: [pathname, ready], revertOnUpdate: true },
  );

  return (
    <div
      ref={bar}
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-50 h-1 origin-left scale-x-0 bg-accent"
    />
  );
}
