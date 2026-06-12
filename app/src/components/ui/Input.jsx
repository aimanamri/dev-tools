import { forwardRef } from 'react'

const SIZE = {
  sm: { padding: '5px 10px', fontSize: '0.875rem' },
  md: { padding: '7px 12px', fontSize: '0.875rem' },
}

const Input = forwardRef(function Input(
  {
    size = 'md',
    error,
    label,
    hint,
    prefix,
    suffix,
    className = '',
    style = {},
    id,
    ...rest
  },
  ref,
) {
  const sizeStyles = SIZE[size] ?? SIZE.md
  const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

  const borderDefault = error ? 'var(--color-error)' : 'var(--color-border-strong)'
  const borderFocus   = error ? 'var(--color-error)' : 'var(--color-primary)'

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-mono font-medium"
          style={{ color: 'var(--color-ink-muted)' }}
        >
          {label}
        </label>
      )}

      <div className="relative flex items-center">
        {prefix && (
          <span
            className="absolute left-2 flex items-center text-sm font-mono pointer-events-none"
            style={{ color: 'var(--color-ink-faint)' }}
          >
            {prefix}
          </span>
        )}

        <input
          ref={ref}
          id={inputId}
          className={[
            'w-full font-mono rounded-xs border',
            'transition-[border-color,box-shadow,outline-color] duration-fast ease-out',
            'focus:outline focus:outline-2 focus:outline-offset-[-1px]',
            'disabled:opacity-45 disabled:cursor-not-allowed',
            prefix ? 'pl-7' : '',
            suffix ? 'pr-7' : '',
            className,
          ].join(' ')}
          style={{
            padding:         sizeStyles.padding,
            fontSize:        sizeStyles.fontSize,
            lineHeight:      '1.4',
            backgroundColor: 'var(--color-input-bg)',
            color:           'var(--color-ink)',
            borderColor:     borderDefault,
            outlineColor:    borderFocus,
            ...style,
          }}
          onMouseEnter={e => {
            if (!e.currentTarget.disabled && !error)
              e.currentTarget.style.borderColor = 'var(--color-ink-faint)'
          }}
          onMouseLeave={e => {
            if (document.activeElement !== e.currentTarget)
              e.currentTarget.style.borderColor = borderDefault
          }}
          onFocus={e => {
            e.currentTarget.style.borderColor = borderFocus
          }}
          onBlur={e => {
            e.currentTarget.style.borderColor = borderDefault
          }}
          {...rest}
        />

        {suffix && (
          <span
            className="absolute right-2 flex items-center text-sm font-mono pointer-events-none"
            style={{ color: 'var(--color-ink-faint)' }}
          >
            {suffix}
          </span>
        )}
      </div>

      {(error || hint) && (
        <p
          className="text-xs font-sans"
          style={{ color: error ? 'var(--color-error)' : 'var(--color-ink-faint)' }}
        >
          {error ?? hint}
        </p>
      )}
    </div>
  )
})

export default Input
