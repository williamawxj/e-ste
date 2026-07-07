export default function Button({ children, variant = "primary", className = "", ...props }) {
  const base = "inline-flex items-center justify-center rounded-xl border border-transparent px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50";
  const variants = {
    primary: "bg-blue-600 text-white shadow-sm hover:bg-blue-700",
    secondary: "border-slate-300 bg-white text-slate-800 shadow-sm hover:bg-slate-100",
    danger: "bg-red-600 text-white shadow-sm hover:bg-red-700",
    success: "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700",
    ghost: "bg-transparent text-slate-700 hover:bg-slate-100",
  };

  return (
    <button className={`${base} ${variants[variant] || variants.primary} ${className}`} {...props}>
      {children}
    </button>
  );
}
