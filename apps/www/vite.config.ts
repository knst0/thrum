import { defineConfig } from "vite";
import solid from "vite-plugin-solid";
import tailwindcss from "@tailwindcss/vite";
import mdx from "@mdx-js/rollup";
import rehypeShiki from "@shikijs/rehype";
import { resolve } from "path";

export default defineConfig({
  plugins: [
    {
      enforce: "pre",
      ...mdx({
        jsxImportSource: "solid-jsx",
        jsx: true,
        rehypePlugins: [[rehypeShiki, { theme: "github-dark" }]],
      }),
    },
    solid({ extensions: [".mdx"] }),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@thrum/core": resolve(__dirname, "../../packages/core/src/index.ts"),
      "@thrum/solid": resolve(__dirname, "../../packages/solid-adapter/src/index.ts"),
    },
  },
  optimizeDeps: {
    exclude: ["@thrum/core", "@thrum/solid"],
  },
});
