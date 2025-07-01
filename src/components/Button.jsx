export default function Button({ children, variant = "primary", ...props }) {
  const base = "px-4 py-2 rounded font-semibold transition";
  const colors = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white",
    danger: "bg-red-600 hover:bg-red-700 text-white",
    neutral: "bg-slate-700 hover:bg-slate-800 text-white",
  };
  return (
    <button className={`${base} ${colors[variant]}`} {...props}>
      {children}
    </button>
  );
}
