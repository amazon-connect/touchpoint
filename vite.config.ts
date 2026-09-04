import { resolve } from "path";
import tailwindcss from "@tailwindcss/vite";
import { type PluginOption } from "vite";
import react from "@vitejs/plugin-react";
import replace from "@rollup/plugin-replace";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

const sharedPlugins = (
  command: "serve" | "build",
  options: { declarations: boolean },
): PluginOption[] => [
  react(),
  tailwindcss(),
  replace(
    command === "serve"
      ? {}
      : {
          "process.env.NODE_ENV": JSON.stringify("production"),
        },
  ),
  ...(options.declarations ? [dts()] : []),
];

// https://vitejs.dev/config/
// `vite` (serve) runs the interactive playground from `index.html`.
// `vite build` builds the library into `lib/`.
// `vite build --mode pages` builds the playground as a static site into `dist/`.
export default defineConfig(({ command, mode }) => {
  // amazon-chime-sdk-js references Node's `global`, undefined in browsers.
  const define = { global: "globalThis" };

  if (mode === "pages") {
    return {
      plugins: sharedPlugins(command, { declarations: false }),
      define,
      // Relative asset URLs, so the same bundle works from a project-page
      // subpath (`amazon-connect.github.io/touchpoint/`), from a custom domain
      // root, or opened straight from disk. Routing is all in the fragment
      // (`#design-system`), so the served directory never changes.
      base: "./",
      build: { outDir: "dist", emptyOutDir: true },
    };
  }

  return {
    plugins: sharedPlugins(command, { declarations: true }),
    define,
    build: {
      outDir: "lib",
      lib: {
        entry: resolve(__dirname, "./src/index.tsx"),
        type: ["umd", "es"],
        name: "amazonConnectTouchpoint",
        fileName: (format) => (format === "umd" ? "index.umd.js" : "index.js"),
      },
    },
  };
});
