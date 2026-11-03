import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '60vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}>
          <div style={{
            maxWidth: 520,
            width: '100%',
            background: '#fff',
            borderRadius: 12,
            border: '1px solid #fecdd3',
            boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
            padding: 32,
            textAlign: 'center'
          }}>
            <div style={{ fontSize: 42, marginBottom: 12 }}>⚠️</div>
            <h2 style={{ margin: '0 0 8px 0', fontSize: 18, color: '#991b1b', fontWeight: 700 }}>
              Something went wrong loading this view
            </h2>
            <p style={{ margin: '0 0 16px 0', fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
              An unexpected error occurred while rendering this page:
            </p>
            <div style={{
              background: '#fef2f2',
              color: '#991b1b',
              padding: '10px 14px',
              borderRadius: 6,
              fontSize: 12,
              fontFamily: 'monospace',
              textAlign: 'left',
              wordBreak: 'break-word',
              marginBottom: 20,
              maxHeight: 120,
              overflowY: 'auto',
              border: '1px solid #fca5a5'
            }}>
              {this.state.error?.message || 'Unknown render error'}
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                onClick={this.handleReload}
                style={{
                  background: '#2563eb',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  padding: '8px 18px',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                🔄 Reload Page
              </button>
              <button
                onClick={() => { window.location.hash = '#/dashboard'; window.location.reload(); }}
                style={{
                  background: '#f1f5f9',
                  color: '#334155',
                  border: '1px solid #cbd5e1',
                  borderRadius: 6,
                  padding: '8px 18px',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
