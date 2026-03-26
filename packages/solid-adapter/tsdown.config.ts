import { defineConfig } from "tsdown";
import solid from "@rolldown-plugin/solid";

export default defineConfig({
  entry: ["src/index.ts"],
  platform: "neutral",
  dts: true,
  sourcemap: true,
  clean: true,
  target: false,
  plugins: [solid()],
});
