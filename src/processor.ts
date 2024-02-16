import { SvelteDocument, SvelteDocumentPage } from "./document.ts"
import { SvelteDocumentState } from "./index.ts"

import {
  promises as fs,
  existsSync as exists,
  lstatSync as stats,
} from "node:fs"

import path from "node:path"
import esbuild from "esbuild"
import * as svelteCompiler from "svelte/compiler"

interface SvelteFileInfo {
  path: string
  index: string
  name: string
  allowCssImports?: boolean
}

interface SvelteTransientState {
  /**
   * Current page number.
   */
  count: number
}

const supportedFonts = [".ttf", ".otf", ".woff", "woff2"]

async function processSvelteFile(
  state: SvelteDocumentState,
  transient: SvelteTransientState,
  file: SvelteFileInfo,
) {
  const compiled = svelteCompiler.compile(
    await fs.readFile(file.path, "utf-8"),
    {
      name: "root",
      generate: "ssr",
    },
  )

  // Create folder for the output of each page.
  const builddir = path.join(state.tmp, `.${file.index}`)
  if (exists(builddir)) {
    await fs.rm(builddir, { recursive: true })
  }
  await fs.mkdir(builddir)

  // Process the code with esbuild and a couple plugins.
  const built = await esbuild.build({
    outdir: builddir,
    bundle: true,
    metafile: true,
    external: ["svelte", "svelte/internal"],
    stdin: {
      loader: "js",
      contents: compiled.js.code,
      sourcefile: path.basename(file.path),
      resolveDir: path.dirname(file.path),
    },
    loader: {
      ".css": file.allowCssImports ? "css" : "empty",

      // Images
      ".png": "dataurl",
      ".jpg": "dataurl",
      ".jpeg": "dataurl",
      ".svg": "dataurl",
      ".gif": "dataurl",
      ".webp": "dataurl",

      // Fonts (copy)
      ".ttf": "empty",
      ".otf": "empty",
      ".woff": "empty",
      ".woff2": "empty",
    },
    outExtension: {
      ".js": ".mjs",
    },
    format: "esm",
  })

  // Process stylesheets.
  let css = ""
  if (built.metafile.outputs !== undefined) {
    for (const [path, value] of Object.entries(built.metafile.outputs)) {
      if (value.cssBundle !== undefined) {
        css += await fs.readFile(value.cssBundle, "utf-8")
      }
    }
  }

  // Process misc imports.
  if (built.metafile.inputs !== undefined) {
    for (const [fpath, value] of Object.entries(built.metafile.inputs)) {
      const parse = path.parse(fpath)
      if (supportedFonts.includes(parse.ext)) {
        css += `
        @font-face {
            font-family: "${parse.name}";
            src:    local("${parse.name}"),
                    url("data:@file/octet-stream;base64,${(await fs.readFile(path.join(state.root, "..", fpath))).toString("base64url")}")
                    format("${parse.ext.substring(1)}")
        }
        `
      }
    }
  }

  const tmpfile = path.join(builddir, "stdin.mjs")
  const compileResults = (await import(tmpfile))
    .default as svelteCompiler.CompileResult

  return { results: compileResults, css }
}

export async function createPages(state: SvelteDocumentState) {
  let absolutePageCount = 1

  // Create the transient state.
  const transient = { count: 1 } as SvelteTransientState

  // Obtain file listing (without special "+" files).
  const sveltePages = (await fs.readdir(state.root)).filter(
    (f) =>
      !f.startsWith("+") &&
      f.endsWith(".svelte") &&
      stats(path.join(state.root, f)).isFile(),
  )

  // Process layout, if it exists.
  let globalCss = ""
  let layoutComponent: svelteCompiler.CompileResult | undefined
  const layoutPath = path.join(state.root, "+layout.svelte")
  if (exists(layoutPath)) {
    const layoutFileInfo = {
      path: layoutPath,
      index: "_layout",
      name: "layout",
      allowCssImports: true,
    } as SvelteFileInfo
    const layoutProcess = await processSvelteFile(
      state,
      transient,
      layoutFileInfo,
    )
    layoutComponent = layoutProcess.results
    globalCss = layoutProcess.css ?? ""
  }

  // Start creating pages.
  const pages = [] as SvelteDocumentPage[]
  for (const pagePath of sveltePages) {
    const fullPath = path.join(state.root, pagePath)

    // Parse the path information.
    const parsed = path.parse(fullPath)
    const namesegments = parsed.name.split(" ")
    const pageindex = namesegments.shift()!
    const pagename = namesegments.join(" ")
    const fileinfo = {
      path: fullPath,
      index: pageindex,
      name: pagename,
    } as SvelteFileInfo

    // Process the svelte file.
    const processedComponent = (
      await processSvelteFile(state, transient, fileinfo)
    ).results

    // Compute page properties.
    const count = transient.count++
    const props = {
      page_name: pagename,
      page_path: fullPath,
      page_index: pageindex,
      page_number: count,
    }

    let [outputHtml, outputCss] = ["", ""]

    // Render component HTML.
    const renderedComponent = (processedComponent as any).render(props)

    // Render layout HTML if we have it, or just use the rendered component HTML.
    if (layoutComponent !== undefined) {
      const renderedLayout = (layoutComponent as any).render(props, {
        // HACK: Do we have something better than this? Svelte SSR is an ugly beast.
        $$slots: { default: () => renderedComponent.html },
      })
      outputHtml = renderedLayout.html
    } else {
      outputHtml = renderedComponent.html
    }
    outputCss = renderedComponent.css.code

    // Create the document page.
    pages.push({ html: outputHtml, css: outputCss, count: absolutePageCount++ })
  }

  return { css: globalCss, pages } as SvelteDocument
}
