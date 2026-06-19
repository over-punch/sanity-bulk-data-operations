# Sanity Bulk Data Operations

A bulk field-editing component for **Sanity Studio** that searches documents by type and name, then **adds or rewrites a field across all matches** in one pass — with a two-tier safety model that keeps non-destructive fills separate from overwrites.

[![npm](https://img.shields.io/npm/v/@liiift-studio/sanity-bulk-data-operations.svg)](https://www.npmjs.com/package/@liiift-studio/sanity-bulk-data-operations)
![Sanity](https://img.shields.io/badge/Sanity-v3%20%7C%20v4%20%7C%20v5-f03e2f.svg)
![React](https://img.shields.io/badge/React-18%20%7C%2019-61dafb.svg)
![license](https://img.shields.io/badge/license-MIT-blue.svg)

> **Heads up — this tool writes to your dataset.** In its default mode it only
> *fills empty fields* (`setIfMissing`), but **Danger Mode overwrites existing
> values** (`set`) and cannot be undone. Read [Safety model](#safety-model) before
> using it on production data.

---

## How it works

You give it a Sanity client, pick a document type and a name to match, name a
target field, and choose what to write. It runs a GROQ query, shows you every
matching document, and patches them one at a time. In the safe default the
search itself excludes documents where the target field is already **defined**
(`!defined(field)`), so existing values are never touched; Danger Mode drops that
filter and lets you overwrite or transform existing values.

<p align="center">
  <img
    src="https://raw.githubusercontent.com/Liiift-Studio/sanity-bulk-data-operations/main/assets/data-flow.svg?v=1"
    alt="Data flow: search criteria build a GROQ query against the Sanity dataset; matched documents are routed through a Danger Mode check — off uses the non-destructive setIfMissing patch, on uses the destructive set patch — and committed one document at a time, 50ms apart."
    width="640"
  />
</p>

Regenerate the diagram with `npm run capture` (source: `scripts/data-flow.mmd`).

---

## Features

- 🔍 **Search by type + name** — match documents of a chosen `_type` whose
  `title` starts with your query, with an optional exclude term.
- ✏️ **Bulk field write** — set the same field across every matched document.
- 🧪 **Transform modes** — full replace, find & replace, prepend, append, or
  type/case transforms (trim, upper/lower/capitalize, to number/boolean/array/string).
- 🛡️ **Two-tier safety** — non-destructive `setIfMissing` by default; destructive
  `set` only behind an explicit, modal-gated Danger Mode.
- 📊 **Live preview & progress** — see the matched documents and a running status
  message as the patches commit.
- 🔗 **Deep links** — each match links straight to its document in the desk.

---

## Installation

```bash
npm install @liiift-studio/sanity-bulk-data-operations
```

> The package is **scoped** — use the full `@liiift-studio/…` name. There is no
> unscoped `sanity-bulk-data-operations` package.

---

## Quick start

The package's **default export** is the `SearchAddData` component. Render it
inside a Sanity Studio tool, dashboard widget, or any custom view, passing it a
client and a small amount of state to track Danger Mode.

```tsx
import {useState} from 'react'
import {useClient} from 'sanity'
import {EditIcon} from '@sanity/icons'
import SearchAddData from '@liiift-studio/sanity-bulk-data-operations'

export default function BulkEditor() {
	const client = useClient({apiVersion: '2024-01-01'})
	const [dangerMode, setDangerMode] = useState(false)

	return (
		<SearchAddData
			client={client}
			displayName="Bulk Field Editor"
			icon={EditIcon}
			utilityId="bulk-field-editor"
			dangerMode={dangerMode}
			onDangerModeChange={(_utilityId, enabled) => setDangerMode(enabled)}
		/>
	)
}
```

The component manages danger-mode *intent* (it asks via `onDangerModeChange`),
but **you own the `dangerMode` boolean** — keep it in state, persist it across
multiple instances, or scope it however your Studio needs.

### Mounting it in Studio

`SearchAddData` is a plain component, so wire it in wherever you put custom UI —
a Studio `tool`, a structure-builder view, or a dashboard widget. A minimal
tool registration:

```tsx
// sanity.config.ts
import {defineConfig} from 'sanity'
import {EditIcon} from '@sanity/icons'
import BulkEditor from './BulkEditor' // the component from the quick start above

export default defineConfig({
	// ...project, dataset, plugins, schema...
	tools: (prev) => [
		...prev,
		{
			name: 'bulk-field-editor',
			title: 'Bulk Field Editor',
			icon: EditIcon,
			component: BulkEditor,
		},
	],
})
```

`utilityId` is a stable string you assign per instance. It is echoed back as the
first argument to `onDangerModeChange`, so if you render several editors you can
tell which one toggled Danger Mode and track each one's state independently.

---

## Props

`SearchAddData` (default export):

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `client` | `SanityClient` | ✅ | Authenticated Sanity client (typically from `useClient`). Needs write access for the patches to commit. |
| `displayName` | `string` | ✅ | Heading shown above the editor. |
| `utilityId` | `string` | ✅ | Stable identifier for this instance, passed back in `onDangerModeChange`. |
| `dangerMode` | `boolean` | ✅ | Whether destructive (overwrite) mode is active. You control this value. |
| `onDangerModeChange` | `(utilityId: string, enabled: boolean) => void` | ✅ | Called when the user toggles Danger Mode (after confirming the warning modal). |
| `icon` | `React.ComponentType<{style?: React.CSSProperties}>` | – | Optional icon rendered in the heading. |

### `shouldShowDangerWarning()`

Also exported (named) is a helper that returns `true` when the Danger Mode
warning modal should be shown. Users can suppress the modal for 48 hours; this
helper checks the stored expiry and returns `false` while suppression is active.

```ts
import {shouldShowDangerWarning} from '@liiift-studio/sanity-bulk-data-operations'

if (shouldShowDangerWarning()) {
	// Show your own confirmation, or let the component's built-in modal handle it.
}
```

---

## Write modes

The component always writes a **single field** (the "Field Name" input) across
all matched documents. How it computes the new value depends on the mode:

| Mode | What it does |
|------|--------------|
| **Full Replace** | Evaluates the textarea contents as a JS value and sets the field to it. |
| **Find & Replace** | `replaceAll(find, replace)` on the field's existing string value. |
| **Prepend** / **Append** | Adds text to the start / end of the existing string. |
| **Transform** | Trim, uppercase, lowercase, capitalize, or convert the field's type (to number, boolean, array, or string). |

Find & Replace, Prepend, Append, and Transform operate on the field's **current
value**, so they require Danger Mode (they overwrite). Full Replace works in
either mode — in the safe default it only fills documents where the field is
missing.

---

## Safety model

This component does bulk writes, so its safety design is deliberate:

- **Non-destructive by default.** With Danger Mode **off**, patches use
  `client.patch(id).setIfMissing(...)`, and the search query adds `&& !defined(field)`
  so documents where the target field is *already defined* are excluded from the
  results entirely and never touched.
- **Destructive writes are gated.** Turning Danger Mode on triggers a warning
  modal (`DangerModeWarning`) before any overwrite is possible. Only after
  confirming does `onDangerModeChange` fire with `enabled: true`, switching
  patches to `client.patch(id).set(...)`.
- **Suppression is time-boxed.** The warning can be hidden for 48 hours; after
  that `shouldShowDangerWarning()` returns `true` again.
- **One document at a time.** Patches commit sequentially with a 50ms gap between
  them and a live status message, rather than firing all at once.

> ⚠️ **`eval()` in Full Replace.** The "Full Replace" textarea is evaluated as
> JavaScript so you can author rich values (arrays of objects with `_key`s, etc.).
> Only paste expressions you trust. Treat this as an admin-only tool, not
> something to expose to untrusted Studio users.

---

## Requirements

Peer dependencies (declared in `package.json`):

- `sanity` — `^3 || ^4 || ^5`
- `@sanity/ui` — `^1 || ^2 || ^3`
- `@sanity/icons` — `^2 || ^3`
- `react` — `^18 || ^19`

Built as an ESM bundle (`dist/index.js`) with React, `sanity`, and `@sanity/*`
left external.

---

## License

MIT — © Liiift Studio.

## Contributing

Issues and pull requests welcome:
<https://github.com/Liiift-Studio/sanity-bulk-data-operations/issues>
