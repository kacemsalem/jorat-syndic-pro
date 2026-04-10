import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center space-y-4">
          <div className="text-4xl">⚠️</div>
          <h1 className="text-lg font-bold text-slate-800">Une erreur inattendue s'est produite</h1>
          <p className="text-sm text-slate-500">
            {this.state.error?.message || "Erreur inconnue"}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-5 py-2 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600 transition"
          >
            Réessayer
          </button>
          <button
            onClick={() => window.location.assign("/accueil")}
            className="block text-xs text-slate-400 hover:text-slate-600 transition"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }
}
