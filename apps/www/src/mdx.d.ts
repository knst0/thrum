declare module "*.mdx" {
  import type { Component } from "solid-js";
  const MDXComponent: Component<{
    components?: Record<string, Component<any>>;
  }>;
  export default MDXComponent;
}

declare module "*?raw" {
  const content: string;
  export default content;
}
