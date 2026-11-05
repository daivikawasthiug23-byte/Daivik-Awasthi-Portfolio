"use client";

import { useEffect, useRef, useState } from "react";

type Dir = "up" | "down" | "left" | "right" | null;

// Drag the ball (or press the arrow keys when focused). Up and down scroll while held, left and right fire once.
export function Joystick({ onScroll, onLeft, onRight }: {
  onScroll: (dy: number) => void;
  onLeft: () => void;
  onRight: () => void;
}) {
  const wellRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [angle, setAngle] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dir = useRef<Dir>(null);
  const cb = useRef({ onScroll, onLeft, onRight });
  useEffect(() => { cb.current = { onScroll, onLeft, onRight }; });

  // Scrolls the screen while the stick is held up or down.
  useEffect(() => {
    const id = setInterval(() => {
      if (dir.current === "up") cb.current.onScroll(-22);
      else if (dir.current === "down") cb.current.onScroll(22);
    }, 40);
    return () => clearInterval(id);
  }, []);

  const move = (x: number, y: number, size: number) => {
    const max = size * 0.3;
    const d = Math.hypot(x, y);
    if (d > max) { x = (x / d) * max; y = (y / d) * max; }
    setPos({ x, y });
    if (Math.hypot(x, y) > 1) setAngle((Math.atan2(-x, y) * 180) / Math.PI);
    const next: Dir =
      Math.hypot(x, y) < max * 0.6 ? null : Math.abs(x) > Math.abs(y) ? (x < 0 ? "left" : "right") : y < 0 ? "up" : "down";
    if (next !== dir.current) {
      if (next === "left") cb.current.onLeft();
      if (next === "right") cb.current.onRight();
      dir.current = next;
    }
  };

  const release = () => {
    setDragging(false);
    dir.current = null;
    setPos({ x: 0, y: 0 });
  };

  const onPointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    onPointerMove(e);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const el = wellRef.current;
    if (!el || (e.type === "pointermove" && !(e.buttons & 1) && e.pointerType === "mouse")) return;
    const r = el.getBoundingClientRect();
    move(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2), r.width);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const map: Record<string, [number, number]> = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
    const v = map[e.key];
    if (!v) return;
    e.preventDefault();
    const size = wellRef.current?.getBoundingClientRect().width ?? 100;
    setDragging(true);
    move(v[0] * size * 0.3, v[1] * size * 0.3, size);
    if (v[1]) cb.current.onScroll(v[1] * 60);
    window.setTimeout(release, 160);
  };

  const dist = Math.hypot(pos.x, pos.y);
  const ease = dragging ? "none" : "0.5s cubic-bezier(0.34, 1.9, 0.5, 1)";

  return (
    <div className="flex h-full items-center justify-center">
      <div
        ref={wellRef}
        tabIndex={0}
        role="group"
        aria-label="Joystick. Up and down scroll the screen, left clears it, right shows help."
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={release}
        onPointerCancel={release}
        onLostPointerCapture={release}
        className="relative aspect-square touch-none select-none rounded-full border-[3px] border-[#141414] outline-offset-2"
        style={{
          width: "min(100%, var(--u))",
          background: "radial-gradient(circle at 50% 40%, #2b2922 0, #0e0d0a 72%)",
          boxShadow: "inset 0 6px 12px rgba(0,0,0,.65), 0 2px 0 rgba(255,255,255,.18)",
          cursor: dragging ? "grabbing" : "grab",
        }}
      >
        {/* inner gate */}
        <div className="absolute inset-[14%] rounded-full border-2 border-[#3d3a30]" style={{ boxShadow: "inset 0 3px 6px rgba(0,0,0,.7)" }} />
        {/* shaft: grows from the centre toward the ball */}
        <div
          className="stick-shaft absolute left-1/2 top-1/2 w-[9%] -translate-x-1/2 rounded-b-full"
          style={{
            height: dist,
            transformOrigin: "50% 0",
            transform: `translateX(-50%) rotate(${angle}deg)`,
            background: "linear-gradient(90deg, #55514a, #1a1914 60%, #35322b)",
            transition: dragging ? "none" : "height 0.3s ease-out",
          }}
        />
        {/* ball */}
        <div
          className="stick-ball absolute left-1/2 top-1/2 aspect-square w-[44%] rounded-full border-2 border-[#141414]"
          style={{
            transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px))`,
            transition: ease === "none" ? "none" : `transform ${ease}`,
            background: "radial-gradient(circle at 34% 28%, #fff 0 7%, rgba(255,255,255,.25) 8% 18%, transparent 30%), radial-gradient(circle at 50% 55%, #e0463a, #8f1d14 78%)",
            boxShadow: "0 5px 8px rgba(0,0,0,.55), inset 0 -5px 8px rgba(0,0,0,.35)",
          }}
        />
      </div>
    </div>
  );
}
