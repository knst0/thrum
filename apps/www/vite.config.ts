import { defineConfig } from "vite";
import solid from "vite-plugin-solid";
import tailwindcss from "@tailwindcss/vite";
import mdx from "@mdx-js/rollup";
import rehypeShiki from "@shikijs/rehype";

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
    conditions: ["source"],
  },
  optimizeDeps: {
    exclude: ["@thrum/core", "@thrum/solid"],
  },
});
