import esbuild from "esbuild"

async function make() {
  await esbuild.build({
    entryPoints: ["./src/index.ts"],
    outdir: "./dist",
    platform: "node",
    packages: "external",
    bundle: true,
    minify: true,
    format: "esm",
  })
}

await make()
