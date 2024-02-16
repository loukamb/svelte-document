import esbuild from "esbuild"

async function make() {
  await esbuild.build({
    entryPoints: ["./src/index.ts"],
    outdir: "./dist",
    platform: "node",
    packages: "external",
    bundle: true,
    format: "esm",
  })
}

await make()
