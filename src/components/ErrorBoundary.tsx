import { Component, ReactNode } from "react";

interface Props { children: ReactNode }
interface State { hasError: boolean; message: string }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message || "Error inesperado" };
  }

  componentDidCatch(error: Error) {
    console.error("App error:", error);
    // Si el error es por archivos desactualizados tras una actualización, recargamos una vez.
    const msg = String(error?.message || "");
    if (/dynamically imported module|Importing a module script failed|Loading chunk|Failed to fetch/i.test(msg)) {
      if (!sessionStorage.getItem("app_reloaded_once")) {
        sessionStorage.setItem("app_reloaded_once", "1");
        window.location.reload();
      }
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8 text-center">
        <h1 className="text-xl font-bold text-emerald-900">No pudimos mostrar esta página</h1>
        <p className="text-sm text-slate-600 max-w-md">
          Ocurrió un problema al cargar el contenido. Intenta recargar la página.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-5 py-2.5 rounded-xl bg-emerald-800 text-white font-semibold"
        >
          Recargar
        </button>
      </div>
    );
  }
}
