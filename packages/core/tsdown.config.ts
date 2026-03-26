import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts", "src/plugins/index.ts"],
  platform: "neutral",
  dts: true,
  clean: true,
  target: false,
});
