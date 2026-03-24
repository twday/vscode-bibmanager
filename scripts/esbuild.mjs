import { build, context } from "esbuild";
import { mkdirSync, rmSync } from "node:fs";

const watchMode = process.argv.includes("--watch");

function cleanOutputDirs() {
  rmSync("client/out", { recursive: true, force: true });
  rmSync("server/out", { recursive: true, force: true });
  mkdirSync("client/out", { recursive: true });
  mkdirSync("server/out", { recursive: true });
}

async function runBuild() {
  cleanOutputDirs();

  const common = {
    bundle: true,
    format: "cjs",
    platform: "node",
    target: "node18",
    sourcemap: false,
    logLevel: "info",
  };

  if (watchMode) {
    const clientCtx = await context({
      ...common,
      entryPoints: ["client/src/extension.ts"],
      outfile: "client/out/extension.js",
      external: ["vscode"],
    });

    const serverCtx = await context({
      ...common,
      entryPoints: ["server/src/server.ts"],
      outfile: "server/out/server.js",
    });

    await Promise.all([clientCtx.watch(), serverCtx.watch()]);
    return;
  }

  await Promise.all([
    build({
      ...common,
      entryPoints: ["client/src/extension.ts"],
      outfile: "client/out/extension.js",
      external: ["vscode"],
    }),
    build({
      ...common,
      entryPoints: ["server/src/server.ts"],
      outfile: "server/out/server.js",
    }),
  ]);
}

runBuild().catch((error) => {
  console.error(error);
  process.exit(1);
});
