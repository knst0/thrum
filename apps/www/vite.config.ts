import { defineConfig, type Plugin } from "vite";
import type { OutputChunk } from "rollup";
import solid from "vite-plugin-solid";
import tailwindcss from "@tailwindcss/vite";
import mdx from "@mdx-js/rollup";
import rehypeShiki from "@shikijs/rehype";

function preloadChunksPlugin(): Plugin {
  return {
    name: "preload-chunks",
    enforce: "post",
    transformIndexHtml: {
      order: "post",
      handler(html, ctx) {
        if (!ctx.bundle) return html;
        const preloads = Object.values(ctx.bundle)
          .filter((c): c is OutputChunk => c.type === "chunk" && !c.isEntry)
          .map((c) => `    <link rel="modulepreload" crossorigin href="/${c.fileName}">`)
          .join("\n");
        return preloads ? html.replace("</head>", `${preloads}\n  </head>`) : html;
      },
    },
  };
}

function inlineCssPlugin(): Plugin {
  return {
    name: "inline-css",
    enforce: "post",
    transformIndexHtml: {
      order: "post",
      handler(html, ctx) {
        if (!ctx.bundle) return html;
        for (const [fileName, chunk] of Object.entries(ctx.bundle)) {
          if (chunk.type === "asset" && fileName.endsWith(".css")) {
            const src = typeof chunk.source === "string" ? chunk.source : new TextDecoder().decode(chunk.source);
            html = html.replace(`<link rel="stylesheet" crossorigin href="/${fileName}">`, `<style>${src}</style>`);
          }
        }
        return html;
      },
    },
  };
}

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
    preloadChunksPlugin(),
    inlineCssPlugin(),
  ],
  resolve: {
    conditions: ["source"],
  },
  optimizeDeps: {
    exclude: ["@thrum/core", "@thrum/solid"],
  },
});
