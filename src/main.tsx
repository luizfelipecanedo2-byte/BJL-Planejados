import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Registrar Service Worker para PWA (aplicativo instalável no celular e computador)
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        console.log("PWA Service Worker ativo:", reg.scope);
      })
      .catch((err) => {
        console.warn("Erro ao registrar PWA Service Worker:", err);
      });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
