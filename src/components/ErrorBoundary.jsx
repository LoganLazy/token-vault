import { Component } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
    this.setState({
      error,
      errorInfo
    })
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-cream dark:bg-ink flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-surface rounded-2xl p-8 shadow-lg text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>

            <h2 className="text-2xl font-light text-ink dark:text-surface mb-2">
              出错了
            </h2>

            <p className="text-muted mb-6">
              应用遇到了一个错误。您的数据是安全的，请尝试刷新页面。
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="text-left mb-6 p-4 bg-red-50 dark:bg-red-900/10 rounded-lg">
                <summary className="cursor-pointer text-sm text-red-600 dark:text-red-400 mb-2">
                  错误详情
                </summary>
                <pre className="text-xs overflow-auto text-red-800 dark:text-red-300">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            <button
              onClick={this.handleReset}
              className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-terracotta hover:bg-terracotta-hover text-white rounded-full transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
              刷新页面
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
