// Vitest runs in plain Node, without the `react-server` export condition
// Next.js's bundler applies — so the real `server-only` package (which
// always throws unless that condition swaps in its no-op `empty.js`)
// would fail every test that imports a module reaching it. This shim is
// aliased in vitest.config.ts to stand in for it during tests only; the
// real guard still applies in the actual Next.js build.
export {};
