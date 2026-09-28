export function Card({ children, className = '', ...props }) {
  return (
    <div className={`rounded-lg border border-white/10 bg-[#202026] text-white overflow-hidden ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardContent({ children, className = '', ...props }) {
  return (
    <div className={`${className}`} {...props}>
      {children}
    </div>
  );
}
