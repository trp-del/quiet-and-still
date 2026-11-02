// Bundles the plugin (dist/index.js + dist/index.html) and the preview bundle
// (dist/preview.js) from the same sources. `--watch` rebuilds on change.

import * as esbuild from "esbuild";
import { mkdir, writeFile } from "node:fs/promises";

const watch = process.argv.includes("--watch");
const common = { bundle: true, format: "iife", target: "chrome120", logLevel: "info", sourcemap: "linked" };

await mkdir("dist", { recursive: true });
// The build stamp busts Logseq's cache: its plugin "Reload" otherwise keeps
// serving the previously loaded index.js.
await writeFile("dist/index.html", `<!doctype html>
<html>
<head><meta charset="utf-8"></head>
<body><script src="index.js?build=${Date.now()}"></script></body>
</html>
`);

const builds = [
  { ...common, entryPoints: ["src/main.ts"], outfile: "dist/index.js" },
  { ...common, entryPoints: ["src/preview.ts"], outfile: "dist/preview.js" },
];

if (watch) {
  for (const b of builds) await (await esbuild.context(b)).watch();
} else {
  await Promise.all(builds.map((b) => esbuild.build(b)));
}
