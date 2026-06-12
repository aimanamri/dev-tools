import { forwardRef } from 'react'

const SIZE = {
  sm: { padding: '6px 12px', fontSize: '0.875rem' },
  md: { padding: '8px 16px', fontSize: '0.875rem' },
}

const VARIANT = {
  primary: {
    backgroundColor: 'var(--color-primary)',
    color:           'var(--color-ink-on-primary)',
    border:          'none',
    hoverBg:         'var(--color-primary-hover)',
  },
  secondary: {
    backgroundColor: 'var(--color-surface)',
    color:           'var(--color-ink)',
    border:          '1px solid var(--color-border-strong)',
    hoverBg:         'var(--color-surface-raised)',
  },
  ghost: {
    backgroundColor: 'transparent',
    color:           'var(--color-ink-muted)',
    border:          'none',
    hoverBg:         'var(--color-surface)',
  },
  danger: {
    backgroundColor: 'var(--color-error)',
    color:           'var(--color-ink-on-primary)',
    border:          'none',
    hoverBg:         'oklch(0.430 0.195 18)',
  },
}

const Button = forwardRef(function Button(
  {
    children,
    size    = 'md',
    variant = 'secondary',
    icon,
    iconRight,
    disabled,
    loading,
    className = '',
    style = {},
    ...rest
  },
  ref,
) {
  const sizeStyles = SIZE[size] ?? SIZE.md
  const v = VARIANT[variant] ?? VARIANT.secondary
  const isInert = disabled || loading

  return (
    <button
      ref={ref}
      disabled={isInert}
      className={[
        'inline-flex items-center gap-1.5 font-mono font-medium rounded-sm select-none',
        'transition-[transform,background-color,border-color,color,opacity] duration-fast ease-out',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
        'disabled:opacity-45 disabled:cursor-not-allowed disabled:pointer-events-none',
        'active:scale-[0.97]',
        className,
      ].join(' ')}
      style={{
        padding:         sizeStyles.padding,
        fontSize:        sizeStyles.fontSize,
        lineHeight:      '1.4',
        cursor:          'pointer',
        backgroundColor: v.backgroundColor,
        color:           v.color,
        border:          v.border ?? 'none',
        outlineColor:    'var(--color-primary)',
        ...style,
      }}
      onMouseEnter={e => {
        if (!isInert) e.currentTarget.style.backgroundColor = v.hoverBg
      }}
      onMouseLeave={e => {
        e.currentTarget.style.backgroundColor = v.backgroundColor
      }}
      {...rest}
    >
      {loading ? (
        <span className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
      ) : (
        icon && <span className="flex-shrink-0">{icon}</span>
      )}
      {children}
      {iconRight && !loading && <span className="flex-shrink-0">{iconRight}</span>}
    </button>
  )
})

export default Button
