import { CodeCard } from "./components/Card";
import { Showcase } from "./components/Showcase";
import DocsContent from "./content/docs.mdx";
import type { JSX } from "solid-js";

const mdxComponents: Record<string, (props: any) => JSX.Element> = {
  h2: (props) => <h2 {...props} />,
  p: (props) => <p class="text-muted">{props.children}</p>,
  ul: (props) => <ul class="text-muted space-y-1">{props.children}</ul>,
  ol: (props) => <ol class="text-muted list-decimal list-inside space-y-1">{props.children}</ol>,
  li: (props) => (
    <li class="flex items-baseline gap-2">
      <span class="text-gray-10 shrink-0 text-sm" aria-hidden="true">
        ⠿
      </span>
      <span>{props.children}</span>
    </li>
  ),
  blockquote: (props) => <blockquote {...props} />,
  hr: () => <hr />,
  strong: (props) => <strong class="text-foreground font-semibold">{props.children}</strong>,
  em: (props) => <em>{props.children}</em>,
  a: (props) => <a {...props} />,
  span: (props) => <span {...props} />,
  pre: CodeCard,
  code: (props) => <code class="text-foreground font-mono">{props.children}</code>,
};

export default function App() {
  return (
    <main class="mx-auto max-w-2xl px-4 py-32 pb-16 sm:px-[max(1rem,env(safe-area-inset-left))] sm:pr-[max(1rem,env(safe-area-inset-right))] space-y-4 [&>h2]:mt-12 [&>h2]:text-lg [&>h2]:font-semibold [&>h2]:text-foreground">
      <div>
        <h1 class="mt-2 text-4xl font-semibold tracking-tight text-foreground">thrum</h1>
        <p class="mt-3 text-muted">
          A framework-agnostic node-and-edge graph library for building visual flow editors, pipeline builders, and diagram tools. Ships a
          headless core with a first-class SolidJS adapter.
        </p>
        <div class="mt-4 flex items-center gap-4">
          <a
            href="https://github.com/knst0/thrum"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            GitHub
          </a>
          <a
            href="https://x.com/knst0"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            @knst0
          </a>
        </div>
      </div>

      <h2>Showcase</h2>
      <Showcase />
      <DocsContent components={mdxComponents} />
    </main>
  );
}
