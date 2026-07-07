export default function PageShell({ title, subtitle, actions, children }) {
  return (
    <section className="min-h-[calc(100vh-4rem)] px-4 py-5 sm:px-6 sm:py-6 md:px-8 md:py-8">
      <div className="mb-5 flex flex-col gap-4 md:mb-8 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-xl font-bold text-blue-700 sm:text-2xl">{title}</h1>
          {subtitle && <p className="mt-2 max-w-3xl text-sm text-slate-600">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      {children}
    </section>
  );
}
