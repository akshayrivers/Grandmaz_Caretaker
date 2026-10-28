import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [tailwindcss(), reactRouter()],
  resolve: {
    tsconfigPaths: true,
    // lucide-react v1 icons call useContext. Prebundling them against a second
    // React copy crashes every page that renders an icon.
    dedupe: ["react", "react-dom"],
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react/jsx-runtime", "lucide-react"],
  },
  ssr: {
    noExternal: ["lucide-react"],
  },
  ...(process.env.VITE_LOCAL_FLOW === "1"
    ? { server: { host: true as const, port: 5173, strictPort: true } }
    : {}),
});
