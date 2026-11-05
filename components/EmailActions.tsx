"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Check, ChevronDown, Copy, Send } from "lucide-react";

const light =
  "inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-lg border-[2.5px] border-[#111] bg-white px-5 font-bold text-[#111] shadow-[4px_4px_0_#111] transition-[transform,box-shadow] duration-150 hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[1px_1px_0_#111]";
const row =
  "flex min-h-11 items-center justify-between gap-3 rounded-md px-3 text-sm font-bold text-ink transition-colors duration-150 hover:bg-alt";

// Copy the address, or write it in webmail: a mailto: link does nothing when no mail app is set up.
export function EmailActions({ email }: { email: string }) {
  const [copied, setCopied] = useState(false);
  const [menu, setMenu] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const to = encodeURIComponent(email);

  useEffect(() => {
    if (!menu) return;
    const onClick = (e: MouseEvent) => box.current && !box.current.contains(e.target as Node) && setMenu(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked: the address is still shown above */
    }
  }

  return (
    <div className="flex flex-wrap gap-3.5">
      <button type="button" onClick={copy} className={light}>
        {copied ? <Check size={17} /> : <Copy size={17} />} {copied ? "Copied" : "Copy email"}
      </button>
      <span className="sr-only" role="status" aria-live="polite">{copied ? "Email copied" : ""}</span>

      <div ref={box} className="relative">
        <button type="button" onClick={() => setMenu((m) => !m)} aria-expanded={menu} aria-controls="compose-menu" className={light}>
          <Send size={17} /> Write email <ChevronDown size={16} className={`transition-transform duration-200 ${menu ? "rotate-180" : ""}`} />
        </button>
        {menu && (
          <ul id="compose-menu" className="nb-card absolute bottom-full left-0 z-20 mb-3 min-w-52 p-1.5">
            <li>
              <a href={`https://mail.google.com/mail/?view=cm&fs=1&to=${to}`} target="_blank" rel="noopener noreferrer" onClick={() => setMenu(false)} className={row}>
                Gmail <ArrowUpRight size={15} className="text-muted" />
              </a>
            </li>
            <li>
              <a href={`https://outlook.live.com/mail/0/deeplink/compose?to=${to}`} target="_blank" rel="noopener noreferrer" onClick={() => setMenu(false)} className={row}>
                Outlook <ArrowUpRight size={15} className="text-muted" />
              </a>
            </li>
            <li>
              <a href={`mailto:${email}`} onClick={() => setMenu(false)} className={row}>
                Default mail app <ArrowUpRight size={15} className="text-muted" />
              </a>
            </li>
          </ul>
        )}
      </div>
    </div>
  );
}
