import { Component } from 'react'

// Catches an error in a tool. The other parts of the site continue to operate.
// Change the "resetKey" prop to clear the error (for example, when the route changes).
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidUpdate(prev) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) {
      this.setState({ error: null })
    }
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    if (this.props.fallback) return this.props.fallback(error, () => this.setState({ error: null }))
    return (
      <div
        role="alert"
        className="max-w-xl mx-auto rounded-md border p-5 flex flex-col gap-3"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderColor: 'var(--color-error)',
          color: 'var(--color-ink)',
        }}
      >
        <h2 className="text-base font-semibold">This tool stopped because of an error.</h2>
        <p className="text-sm" style={{ color: 'var(--color-ink-muted)' }}>
          Your data stays in your browser. Select the button to start the tool again.
          If the error continues, make the input smaller or correct it.
        </p>
        <pre
          className="text-xs font-mono whitespace-pre-wrap break-all rounded-sm p-2"
          style={{ backgroundColor: 'var(--color-input-bg)', color: 'var(--color-error)' }}
        >
          {String(error?.message || error)}
        </pre>
        <div>
          <button
            type="button"
            onClick={() => this.setState({ error: null })}
            className="px-3 py-1.5 rounded-sm text-sm font-medium cursor-pointer"
            style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-ink-on-primary)' }}
          >
            Start the tool again
          </button>
        </div>
      </div>
    )
  }
}
