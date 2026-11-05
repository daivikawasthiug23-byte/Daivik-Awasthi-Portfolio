"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  // False during server render and hydration, true afterwards, so the icon never mismatches.
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const isDark = mounted && resolvedTheme === "dark";

  return (
    <button
      type="button"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="flex size-11 cursor-pointer items-center justify-center rounded-lg border-[2.5px] border-ink bg-card text-ink shadow-[3px_3px_0_var(--shadow)]"
    >
      {mounted ? isDark ? <Sun size={18} /> : <Moon size={18} /> : <span className="size-[18px]" />}
    </button>
  );
}
