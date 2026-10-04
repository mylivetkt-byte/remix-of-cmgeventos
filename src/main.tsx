import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Protección contra errores causados por traductores automáticos (Google Translate) o extensiones
if (typeof Node === "function" && Node.prototype) {
  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function <T extends Node>(child: T): T {
    if (child.parentNode !== this) {
      return child;
    }
    return originalRemoveChild.apply(this, [child]) as T;
  };

  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function <T extends Node>(newNode: T, referenceNode: Node | null): T {
    if (referenceNode && referenceNode.parentNode !== this) {
      return newNode;
    }
    return originalInsertBefore.apply(this, [newNode, referenceNode]) as T;
  };
}

// Si tras una actualización el navegador pide archivos viejos, recargar (máx. 1 vez cada 15 s)
window.addEventListener("vite:preloadError", (e) => {
  const last = Number(sessionStorage.getItem("app_reloaded_at") || 0);
  if (Date.now() - last > 15000) {
    e.preventDefault();
    sessionStorage.setItem("app_reloaded_at", String(Date.now()));
    window.location.reload();
  }
});

createRoot(document.getElementById("root")!).render(<App />);
