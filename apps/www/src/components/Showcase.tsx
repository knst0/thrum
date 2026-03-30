import { createResource, createSignal, lazy, Show, Suspense } from "solid-js";
import showcaseCode from "./ShowcasePlayground?raw";
const ShowcasePlayground = lazy(() => import("./ShowcasePlayground").then((m) => ({ default: m.ShowcasePlayground })));

let highlighterPromise: Promise<import("shiki/core").HighlighterCore> | null = null;

function getHighlighter() {
  return (highlighterPromise ??= Promise.all([import("shiki/core"), import("shiki/engine/javascript")]).then(
    ([{ createHighlighterCore }, { createJavaScriptRegexEngine }]) =>
      createHighlighterCore({
        themes: [import("shiki/themes/github-dark.mjs")],
        langs: [import("shiki/langs/tsx.mjs")],
        engine: createJavaScriptRegexEngine(),
      }),
  ));
}

async function highlight(code: string): Promise<string> {
  const hl = await getHighlighter();
  return hl.codeToHtml(code, {
    lang: "tsx",
    theme: "github-dark",
    transformers: [
      {
        pre(node) {
          delete node.properties["style"];
        },
      },
    ],
  });
}

export function Showcase() {
  const [showCode, setShowCode] = createSignal(false);
  const [highlighted] = createResource(showcaseCode, highlight);

  return (
    <div class="rounded-lg border border-border overflow-hidden bg-card">
      <div class="flex items-center justify-end px-2.5 py-1.5 border-b border-border gap-1">
        <button
          onClick={() => setShowCode(false)}
          class={`px-2.5 py-1 rounded-md text-xs cursor-pointer transition-colors ${!showCode() ? "bg-interactive text-foreground" : "text-muted hover:text-foreground"}`}
        >
          Preview
        </button>
        <button
          onClick={() => setShowCode(true)}
          class={`px-2.5 py-1 rounded-md text-xs cursor-pointer transition-colors ${showCode() ? "bg-interactive text-foreground" : "text-muted hover:text-foreground"}`}
        >
          Code
        </button>
      </div>

      <Show
        when={showCode()}
        fallback={
          <div class="h-70">
            <Suspense fallback={<div class="h-70 flex items-center justify-center text-muted text-xs">Loading…</div>}>
              <ShowcasePlayground />
            </Suspense>
          </div>
        }
      >
        <Show when={highlighted()} fallback={<div class="h-70 flex items-center justify-center text-muted text-xs">Loading…</div>}>
          {(html) => (
            <div
              class="h-70 overflow-auto [&_pre]:bg-transparent! [&_pre]:p-4 [&_pre]:text-xs [&_pre]:leading-relaxed [&_pre]:h-full"
              innerHTML={html()}
            />
          )}
        </Show>
      </Show>
    </div>
  );
}
