import { Construction } from 'lucide-react'
import Card, { CardHeader, CardTitle } from '../components/ui/Card'

export default function Placeholder({ name }) {
  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>{name}</CardTitle>
        </CardHeader>
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <Construction
            size={32}
            strokeWidth={1.5}
            style={{ color: 'var(--color-ink-faint)' }}
          />
          <p
            className="text-sm font-sans"
            style={{ color: 'var(--color-ink-muted)' }}
          >
            Coming soon — this tool is under construction.
          </p>
        </div>
      </Card>
    </div>
  )
}
