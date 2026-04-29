export function Card({ children, className = '', ...props }) {
  return (
    <div className={`bg-white rounded-lg overflow-hidden ${className}`} {...props}>
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
