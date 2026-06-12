export default function Card({ children, className = '', style = {}, ...rest }) {
  return (
    <div
      className={['rounded-md border', className].join(' ')}
      style={{
        backgroundColor: 'var(--color-surface)',
        borderColor: 'var(--color-border-strong)',
        padding: '1rem',
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children, className = '', style = {} }) {
  return (
    <div
      className={['flex items-center justify-between pb-3 mb-3 border-b', className].join(' ')}
      style={{ borderColor: 'var(--color-border-strong)', ...style }}
    >
      {children}
    </div>
  )
}

export function CardTitle({ children, className = '', style = {} }) {
  return (
    <h2
      className={['text-sm font-mono font-semibold', className].join(' ')}
      style={{ color: 'var(--color-ink)', ...style }}
    >
      {children}
    </h2>
  )
}
