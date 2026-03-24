import { createSignal, JSX, Show } from "solid-js";

interface CardProps {
  children: JSX.Element;
  class?: string;
}

export function Card(props: CardProps) {
  return <div class={`rounded-lg border border-border bg-card p-4 ${props.class ?? ""}`}>{props.children}</div>;
}

interface CodeCardProps {
  children: JSX.Element;
  class?: string;
}

export function CodeCard(props: CodeCardProps) {
  const [copied, setCopied] = createSignal(false);
  // oxlint-disable-next-line no-unassigned-vars
  let preRef!: HTMLPreElement;

  function copy() {
    navigator.clipboard.writeText(preRef.textContent ?? "").then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div class={`relative rounded-lg border border-border shadow-sm bg-card ${props.class ?? ""}`}>
      <button
        onClick={copy}
        aria-label="Copy to clipboard"
        class="absolute top-2 right-2 rounded-md p-1.5 text-muted transition-colors hover:bg-interactive hover:text-foreground"
      >
        <Show
          when={copied()}
          fallback={
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
              <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
            </svg>
          }
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </Show>
      </button>
      <pre ref={preRef} class="overflow-x-auto p-4 pr-10 text-sm text-foreground" style="background:transparent">
        {props.children}
      </pre>
    </div>
  );
}
