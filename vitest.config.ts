import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      // See __tests__/_shims/server-only.ts for why this is needed.
      "server-only": path.resolve(__dirname, "__tests__/_shims/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["__tests__/**/*.{test,spec}.ts"],
  },
});
