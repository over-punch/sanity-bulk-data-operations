// Reproducible README visual harness: renders scripts/data-flow.mmd to assets/data-flow.svg
// Run with `npm run capture`. Requires @mermaid-js/mermaid-cli (invoked via npx).

import {execFileSync} from 'node:child_process'
import {mkdirSync} from 'node:fs'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'

// Absolute path to this package root (one level up from scripts/)
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
// Source Mermaid diagram and its SVG output target
const INPUT = join(ROOT, 'scripts', 'data-flow.mmd')
const OUTDIR = join(ROOT, 'assets')
const OUTPUT = join(OUTDIR, 'data-flow.svg')

mkdirSync(OUTDIR, {recursive: true})

// Render with a dark theme + transparent background so it reads on GitHub and npm in either color scheme
execFileSync(
	'npx',
	[
		'--yes',
		'@mermaid-js/mermaid-cli',
		'-i',
		INPUT,
		'-o',
		OUTPUT,
		'-t',
		'dark',
		'-b',
		'transparent',
	],
	{stdio: 'inherit'},
)

console.log(`Wrote ${OUTPUT}`)
