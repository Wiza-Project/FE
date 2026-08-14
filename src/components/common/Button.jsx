const BTN_VARIANTS = {
  primary: 'bg-[#2563EB] hover:bg-[#1D4ED8] text-white',
  secondary: 'bg-[#F3F4F6] hover:bg-[#E5E7EB] text-[#1F2328]',
  ghost: 'bg-transparent hover:bg-[#F3F4F6] text-[#1F2328]',
  danger: 'bg-[#CF222E] hover:bg-[#B91C1C] text-white',
  outline: 'bg-white border border-[#E5E7EB] hover:bg-[#F9FAFB] text-[#1F2328]',
};

const BTN_SIZES = {
  sm: 'h-7 px-3 text-[12px]',
  md: 'h-8 px-4 text-[13px]',
  lg: 'h-10 px-5 text-[14px]',
};

/**
 * @param {Object} props
 * @param {'primary'|'secondary'|'ghost'|'danger'|'outline'} [props.variant]
 * @param {'sm'|'md'|'lg'} [props.size]
 * @param {import('react').ReactNode} [props.icon]
 * @param {boolean} [props.loading]
 */
export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  loading,
  children,
  className = '',
  disabled,
  ...props
}) {
  return (
    <button
      className={`inline-flex items-center gap-1.5 font-semibold rounded-[6px] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${BTN_VARIANTS[variant]} ${BTN_SIZES[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        icon
      )}
      {children}
    </button>
  );
}
