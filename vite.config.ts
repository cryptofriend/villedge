import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Raise the warning threshold a bit; we explicitly split big vendor chunks below
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        // Split heavy vendor libraries into their own chunks so the browser can
        // cache + load them in parallel and skip them entirely on routes that
        // don't use them (e.g. /embed and /widget skip wallet chunks).
        manualChunks: (id) => {
          if (!id.includes("node_modules")) return;
          if (id.includes("mapbox-gl")) return "vendor-mapbox";
          if (id.includes("@privy-io")) return "vendor-privy";
          if (
            id.includes("@solana/") ||
            id.includes("@walletconnect") ||
            id.includes("wallet-adapter")
          )
            return "vendor-solana";
          if (id.includes("@tonconnect")) return "vendor-ton";
          if (id.includes("wagmi") || id.includes("viem")) return "vendor-wagmi";
          if (id.includes("@supabase")) return "vendor-supabase";
          if (id.includes("@tanstack")) return "vendor-tanstack";
          if (
            id.includes("react-dom") ||
            id.includes("react-router") ||
            id.includes("scheduler") ||
            id.includes("/react/")
          )
            return "vendor-react";
          if (id.includes("@radix-ui") || id.includes("lucide-react"))
            return "vendor-ui";
        },
      },
    },
  },
}));
