import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { erro: null };
  }

  static getDerivedStateFromError(erro) {
    return { erro };
  }

  render() {
    if (this.state.erro) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
          <div className="max-w-md rounded-lg border border-red-200 bg-white p-6 text-center shadow-sm">
            <h2 className="mb-2 text-lg font-semibold text-red-700">Algo deu errado</h2>
            <p className="mb-4 text-sm text-slate-600">{this.state.erro.message}</p>
            <button
              type="button"
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              onClick={() => {
                this.setState({ erro: null });
                window.location.href = "/";
              }}
            >
              Voltar ao início
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
