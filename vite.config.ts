import { resolve } from "path";
import tailwindcss from "@tailwindcss/vite";
import { type PluginOption } from "vite";
import react from "@vitejs/plugin-react";
import replace from "@rollup/plugin-replace";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

const sharedPlugins = (command: "serve" | "build"): PluginOption[] => [
  react(),
  tailwindcss(),
  replace(
    command === "serve"
      ? {}
      : {
          "process.env.NODE_ENV": JSON.stringify("production"),
        },
  ),
  dts(),
];

// https://vitejs.dev/config/
// `vite` (serve) runs the interactive playground from `index.html`.
// `vite build` builds the library into `lib/`.
export default defineConfig(({ command }) => ({
  plugins: sharedPlugins(command),
  // amazon-chime-sdk-js references Node's `global`, undefined in browsers.
  define: { global: "globalThis" },
  build: {
    outDir: "lib",
    lib: {
      entry: resolve(__dirname, "./src/index.tsx"),
      type: ["umd", "es"],
      name: "amazonConnectTouchpoint",
      fileName: (format) => (format === "umd" ? "index.umd.js" : "index.js"),
    },
  },
}));
