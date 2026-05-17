import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: path.resolve(__dirname, "scripts/main.js"),
      formats: ["es"],
      fileName: () => "main.js",
    },
    outDir: "dist",
    emptyOutDir: true,
    minify: false,
    rollupOptions: {
      // Globals acessados como window.X — não são imports, não precisam de external.
      // Externals só seriam necessários se o código fizesse `import ... from "pixi.js"` etc.
      external: [],
    },
  },
  define: {
    "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV ?? "production"),
  },
});
