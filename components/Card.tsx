export function Section({ id, title, subtitle, band, children, className = "" }: {
  id?: string; title?: string; subtitle?: string; band?: boolean; children: React.ReactNode; className?: string;
}) {
  return (
    <section id={id} className={`scroll-mt-20 border-t-[2.5px] border-ink py-16 md:py-20 ${band ? "bg-alt" : ""} ${className}`}>
      <div className="mx-auto max-w-[1320px] px-4 md:px-7">
        {title && (
          <header data-reveal className="max-w-2xl">
            <h2 className="text-[2rem] md:text-[2.75rem]">{title}</h2>
            {subtitle && <p className="mt-3 text-muted">{subtitle}</p>}
          </header>
        )}
        <div className={title ? "mt-9" : ""}>{children}</div>
      </div>
    </section>
  );
}

export function Tag({ children }: { children: React.ReactNode }) {
  return <span className="nb-tag !px-2.5 !py-1 !text-[0.85rem]">{children}</span>;
}

export function Parts({ parts }: { parts: (string | { b: string })[] }) {
  return (
    <>
      {parts.map((p, i) =>
        typeof p === "string" ? p : <strong key={i} className="font-semibold text-ink">{p.b}</strong>,
      )}
    </>
  );
}
