import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts", "src/contract.ts", "src/pglite.ts", "src/postgres.ts"],
  format: "esm",
  outExtensions: () => ({ js: ".js", dts: ".d.ts" }),
  platform: "node",
  target: "es2022",
  dts: true,
  sourcemap: true,
  clean: true,
  deps: {
    neverBundle: [
      "drizzle-orm",
      "@electric-sql/pglite",
      "pg",
      "@usevibejs/server",
      "@usevibejs/contract",
      "valibot",
    ],
  },
});
