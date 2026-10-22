export function Card({ id, title, aside, children, className = "" }: {
  id?: string; title?: string; aside?: React.ReactNode; children: React.ReactNode; className?: string;
}) {
  return (
    <section id={id} className={`scroll-mt-6 rounded-lg border border-border bg-surface p-5 md:p-6 ${className}`}>
      {title && (
        <div className="mb-4 flex items-baseline justify-between gap-4">
          <h2 className="font-heading text-base font-semibold uppercase tracking-wider text-fg">{title}</h2>
          {aside && <DateTag>{aside}</DateTag>}
        </div>
      )}
      {children}
    </section>
  );
}

export function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted">{children}</span>
  );
}

export function Parts({ parts }: { parts: (string | { b: string })[] }) {
  return (
    <>
      {parts.map((p, i) =>
        typeof p === "string" ? p : <strong key={i} className="font-medium text-fg">{p.b}</strong>,
      )}
    </>
  );
}

export function DateTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex h-7 shrink-0 items-center rounded-full border border-border bg-hover px-3 text-xs text-muted">
      {children}
    </span>
  );
}
