#!/usr/bin/env node --no-warnings --no-deprecation
import { createPages } from "./processor.ts"
import { generateDocument } from "./document"

import { pathToFileURL } from "node:url"
import { promises as fs, existsSync as exists } from "node:fs"
import * as path from "node:path"
import puppeteer from "puppeteer"

const __dirname = import.meta.dirname

type CSSPageSize =
  | "A5"
  | "A4"
  | "A3"
  | "B5"
  | "B4"
  | "JIS-B5"
  | "JIS-B4"
  | "letter"
  | "legal"
  | "ledger"

type CSSSizeUnit = "cm" | "mm" | "in"

export interface SvelteDocumentOptions {
  /**
   * Size of the document pages. Defaults to `A4`.
   */
  size?: CSSPageSize | `${number}${CSSSizeUnit} ${number}${CSSSizeUnit}`

  /**
   * Orientation of the document pages. Defaults to `portrait`.
   */
  orientation?: "portrait" | "landscape"

  /**
   * Output filepath, relative to root. Defaults to "document.pdf"
   */
  out?: string
}

export interface SvelteDocumentState {
  /**
   * Root of project files.
   */
  root: string

  /**
   * Temporary directory used during processing.
   */
  tmp: string
}

async function main() {
  // Assume cwd is root, unless "indev" flag is passed, in which case we use /test.
  const root = process.argv.includes("indev")
    ? await fs.realpath(path.join(__dirname, "../test"))
    : process.cwd()

  // Temporary directory is always at {cwd}/.svelte-document
  const tmp = path.join(root, ".svelte-document")
  if (exists(tmp)) {
    await fs.rm(tmp, { recursive: true })
  }
  await fs.mkdir(tmp)

  // Load options.
  const opts: SvelteDocumentOptions = {
    size: "A4",
    orientation: "portrait",
    out: "document.pdf",
  }
  const optsPath = path.join(root, "document.config.json")
  if (exists(optsPath)) {
    Object.assign(
      opts,
      JSON.parse(await fs.readFile(optsPath, "utf-8")),
    ) as SvelteDocumentOptions
  }

  // Construct document state.
  const documentState = { root, tmp } as SvelteDocumentState

  // Create all of the pages.
  const pages = await createPages(documentState)

  // Render all of the pages, write temporary html.
  const document = await generateDocument(pages, opts)
  const tmphtml = path.join(tmp, "output.html")
  await fs.writeFile(tmphtml, document, "utf-8")

  // Open headless browser and export pdf into /outdir.
  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  })
  const page = await browser.newPage()
  await page.goto(pathToFileURL(tmphtml).toString(), {
    waitUntil: ["load", "networkidle0"],
  })
  await fs.writeFile(
    path.join(root, opts.out ?? "document.pdf"),
    await page.pdf({ preferCSSPageSize: true, printBackground: true }),
  )
  await browser.close()

  // Remove temporary files.
  await fs.rm(tmp, { recursive: true })
}

await main()
