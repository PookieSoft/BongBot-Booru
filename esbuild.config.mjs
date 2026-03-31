import esbuild from "esbuild";
import { cpSync, existsSync, mkdirSync } from "fs";

const isWatch = process.argv.includes("--watch");
const minify = process.argv.includes("--minify");

const buildOptions = {
    entryPoints: ["src/standalone.ts"],
    bundle: true,
    platform: "node",
    target: "esnext",
    format: "esm",
    outdir: "dist",
    external: ["node:*"],
    banner: {
        js: 'import { createRequire } from "module"; import { fileURLToPath } from "url"; import { dirname } from "path"; const require = createRequire(import.meta.url); const __filename = fileURLToPath(import.meta.url); const __dirname = dirname(__filename);',
    },
    minify: true,
    sourcemap: true,
    keepNames: true,
    sourcesContent: true,
};

// Copy bongbot-core response files to dist
function copyCoreResponses() {
    const coreResponsesDir = "node_modules/bongbot-core/dist/responses";
    const destDir = "dist/responses";

    if (!existsSync(coreResponsesDir)) {
        console.warn("⚠ bongbot-core responses not found, skipping copy");
        return;
    }

    try {
        if (!existsSync(destDir)) {
            mkdirSync(destDir, { recursive: true });
        }
        cpSync(coreResponsesDir, destDir, { recursive: true });
        console.log("✓ Copied core response files");
    } catch (error) {
        throw new Error(`Error copying core responses: ${error.message}`);
    }
}

if (isWatch) {
    const ctx = await esbuild.context(buildOptions);
    await ctx.watch();
    console.log("Watching for changes...");
} else {
    await esbuild.build(buildOptions);
    copyCoreResponses();
    console.log("Build complete!");
}
