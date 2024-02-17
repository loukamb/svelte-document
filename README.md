
<p>
    <img src="./logo.svg" width="64" height="64" align="right">
    <h1>svelte-document</h1>
<p>

Create documents, resumes, or presentations from a collection of Svelte files. No configuration needed, and exports to a very portable PDF file.

## Usage
### Getting started
Install `svelte-document` from `npm` as a global package, then invoke it in any directory containing `.svelte` pages that you want formatted into a PDF. A file called `document.pdf` will be generated in the current working directory.

```sh
# Install the package globally
npm install -g svelte-document

# Invoke the command
svelte-document
```

### Page semantics and ordering
To order your pages is to simply number them: `1.svelte`, `2.svelte`, `3.svelte`, and so on. The order which your filesystem presents the files do not impact the order in the document. You can also title your page by inserting any contents after a space character, like so: `5 How to Install Linux.svelte`.

You can also use periods in your number to create subsections if needed, such as in `5.1 Troubleshooting.svelte`.

Folders are not parsed, so you can use them to store components and assets, and files starting with `+` are ignored, save for `+layout.svelte` (explained later).

### Page metadata in components
You can export the following Svelte variables in a `<script>...</script>` block and they will be automatically filled in by the tool:

| Variable name | Description |
|-|-|
| `page_name` | The name of the page provided after the page index in your file name. If there is no name, this value will be empty (`""`). |
| `page_path` | The full path to the current page component. |
| `page_index` | The page index from the file name. This is a string. |
| `page_count` | The number of the page, starting from 1. This is an integer. |

### Importing assets
#### Images
You can import images directly like so:
```svelte
<script>
    import img from "./my-image.png"
</script>

<img src={img} />
```

#### Fonts
Fonts can also be imported. The file name of the font can be used in `font-family` styling, like so:
```svelte
<script>
    import "./FontFile.ttf"
</script>

<div style="font-family: FontFile;">Hello world!</div>
```

### Layout
You can provide a `+layout.svelte` file that will wrap every page. Its functionality is the same as [SvelteKit's `+layout.svelte`](https://kit.svelte.dev/docs/routing#layout).
>[!TIP]
>Layout files can import CSS stylesheets using import statements, like so: `import "./styles.css"`. Other pages cannot import CSS stylesheets, but can use `<style>...</style>` blocks.

## Configuration
`svelte-document` is zero configuration, but you can provide optional configuration in a `document.config.json` file in the root of your document files, with the following fields:
| Field | Default | Description |
|-|-|-|
| `size` | `A4` | Dimensions of the page. Accepted values: `A5`, `A4`, `A3`, `B5`, `B4`, `JIS-B5`, `JIS-B4`, `letter`, `legal`, `ledger`, or a set of custom dimensions with the following format: `{number}in/cm/mm {number}in/cm/mm`, such as `24in 24in` or `300mm 300mm`. |
| `orientation` | `portrait` | Orientation of the page. Accepted values: `portrait`, `landscape` |
| `out` | `document.pdf` | Output file path/name, relative to the current working directory. |

## Roadmap
- [ ] Better compatibility with projects using Node packages.
- [ ] Transition to Vite.  
  - Currently, each individual `.svelte` file is compiled using `svelte/compiler` and some transformations are executed with `esbuild` (e.g., for import statements). However, I want to look into using Vite instead as it has a broader ecosystem and would resolve some ongoing issues.

## License
```
Copyright (c) 2024 Louka Ménard Blondin

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```