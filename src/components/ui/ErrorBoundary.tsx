import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  /** Surfaces a friendly fallback when `children` throws. */
  children: ReactNode
  /** Human-readable label for the area, used in the fallback copy. */
  area?: string
}

interface State {
  error: Error | null
}

/**
 * Local error boundary used to keep one broken page from blanking the
 * entire app. Without it, a render-time exception bubbles all the way
 * up to React's root and unmounts everything — the original symptom of
 * the "Settings panel renders nothing" bug.
 *
 * The fallback is intentionally simple — just enough to:
 *   • tell the user something went wrong (so they don't think the app
 *     is dead),
 *   • give them the error message and a reload button (so the issue
 *     is self-diagnosing in the field),
 *   • log the full error + component stack to the console for support.
 *
 * Class component because React still requires a class for the
 * `componentDidCatch` / `getDerivedStateFromError` pair.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(
      `[ErrorBoundary${this.props.area ? ` · ${this.props.area}` : ''}]`,
      error,
      info.componentStack,
    )
  }

  private handleReload = (): void => {
    if (typeof window !== 'undefined') window.location.reload()
  }

  render(): ReactNode {
    if (!this.state.error) return this.props.children
    return (
      <div
        className="mx-auto max-w-sm space-y-3 p-4 text-sm text-gray-700"
        role="alert"
        data-testid="error-boundary-fallback"
      >
        <h2 className="text-base font-semibold text-gray-900">
          Something went wrong{this.props.area ? ` loading ${this.props.area}` : ''}.
        </h2>
        <p>
          The page hit an unexpected error. Try reloading; if it keeps
          happening, please report the message below.
        </p>
        <pre className="overflow-x-auto rounded bg-gray-100 p-2 text-xs text-gray-800">
          {this.state.error.message}
        </pre>
        <button
          type="button"
          onClick={this.handleReload}
          className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white"
        >
          Reload page
        </button>
      </div>
    )
  }
}
