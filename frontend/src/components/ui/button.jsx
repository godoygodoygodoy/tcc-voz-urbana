export function Button({ children, variant = 'default', size = 'md', className = '', ...props }) {
  const baseClasses = 'font-semibold transition-all active:scale-95';
  
  const variants = {
    default: 'bg-violet-600 text-white hover:bg-violet-700',
    outline: 'border-2 border-current text-current hover:bg-current/5',
    ghost: 'hover:bg-gray-100',
  };
  
  const sizes = {
    sm: 'px-3 py-1 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };
  
  return (
    <button
      className={`${baseClasses} ${variants[variant] || variants.default} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
