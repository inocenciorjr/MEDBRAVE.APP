import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary capturou um erro:', error);
    console.error('Stack trace:', errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20 rounded-lg">
          <h2 className="text-lg font-semibold mb-2 text-red-800 dark:text-red-200">
            Algo deu errado!
          </h2>
          
          {this.state.error && (
            <p className="mb-4 text-red-700 dark:text-red-300">
              {this.state.error.toString()}
            </p>
          )}
          
          <details className="text-sm mb-4">
            <summary className="cursor-pointer mb-2 text-red-600 dark:text-red-400">
              Ver detalhes técnicos
            </summary>
            <pre className="whitespace-pre-wrap p-3 rounded text-xs overflow-auto bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200">
              {this.state.error && this.state.error.toString()}
              {this.state.errorInfo && this.state.errorInfo.componentStack && (
                <>
                  {'\n\n'}Stack trace:{'\n'}
                  {this.state.errorInfo.componentStack}
                </>
              )}
            </pre>
          </details>
          
          <button 
            onClick={() => {
              this.setState({ hasError: false, error: null, errorInfo: null });
              window.location.reload();
            }}
            className="px-4 py-2 rounded text-sm font-medium transition-colors bg-red-600 hover:bg-red-700 text-white border-none cursor-pointer"
          >
            Recarregar página
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 