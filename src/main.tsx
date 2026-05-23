import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Buffer } from 'buffer';
import { HelmetProvider } from "react-helmet-async";

// Polyfill Buffer for Solana wallet adapters (must be after React imports)
window.Buffer = Buffer;

import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </StrictMode>
);
