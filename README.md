# Sanity Bulk Data Operations

A bulk field-editing component for **Sanity Studio** that searches documents by type and name, then **adds or rewrites a field across all matches** in one pass — with a two-tier safety model that keeps non-destructive fills separate from overwrites.

[![npm](https://img.shields.io/npm/v/@overpunch/sanity-bulk-data-operations.svg)](https://www.npmjs.com/package/@overpunch/sanity-bulk-data-operations)
![Sanity](https://img.shields.io/badge/Sanity-Studio_v3_to_v6-f03e2f.svg)
![React](https://img.shields.io/badge/React-18_and_19-61dafb.svg)
![license](https://img.shields.io/badge/license-MIT-blue.svg)

> **Heads up — this tool writes to your dataset.** In its default mode it only
> *fills empty fields* (`setIfMissing`), but **Danger Mode overwrites existing
> values** (`set`) and cannot be undone. Read [Safety model](#safety-model) before
> using it on production data.

---

## Blast radius

Read this before pointing it at a dataset you care about.

| Question | Answer |
|---|---|
| **What does it mutate?** | Exactly **one field** — the name you type into "Field Name" — on **every document returned by the search**. No other field is touched. |
| **How many documents?** | All matches, not a selection. The list shown above the button *is* the write set, and the count is displayed beside it. |
| **Drafts or published?** | **Both.** The search query is `*[_type == … && title match …]` with **no `!(_id in path('drafts.**'))` filter**, so unpublished drafts of matching documents are returned and patched alongside their published versions. |
| **Is it reversible?** | **No undo in the tool.** In the default mode the risk is low (it only fills fields that were empty, so reverting means unsetting them). In **Danger Mode the previous value is gone** — recovery depends on a dataset export you took beforehand, or on your project's document-history retention, which is plan-dependent and not guaranteed. |
| **What gates the destructive path?** | Danger Mode, which raises a confirmation modal — **suppressible for 48 hours**, so it will not necessarily re-prompt on the run you were not expecting. |
| **Does it delete anything?** | **No.** This tool only patches fields. It never deletes documents. |
| **Scope of a mistake** | Bounded by your search terms. A too-broad "Name" prefix with an empty exclude term matches a lot of documents. |

Patches commit **sequentially**, one document at a time, 50 ms apart, each one
`await`ed — so a failure is caught and surfaced rather than silently swallowed,
and interrupting a run leaves the already-patched documents patched.

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
npm install @overpunch/sanity-bulk-data-operations
```

> The package is **scoped** — use the full `@overpunch/…` name. There is no
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
import SearchAddData from '@overpunch/sanity-bulk-data-operations'

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
import {shouldShowDangerWarning} from '@overpunch/sanity-bulk-data-operations'

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

> ⚠️ **Inputs are interpolated straight into GROQ.** The search term, the exclude
> term, the document type and the **field name** are all string-interpolated into
> the query (e.g. `title match "${value}*"`, `!defined(${field})`) rather than
> passed as parameters. A stray quote will break the query; a crafted one could
> widen it. This is another reason to treat the panel as admin-only.

### Known scope limits

- **The document-type list is a fixed dropdown**, not a schema-driven picker:
  `typeface`, `collection`, `pair`, `font`, `license`, `order`, `account`, `cart`,
  `page`, `blogpost`, `release-notes`. Other types require editing the source.
- **Search matches on `title` only**, as a prefix (`title match "value*"`).
  Documents whose type has no `title` field will not be findable.
- **Non-string fields are skipped by most transforms.** Find & Replace, Prepend
  and Append only apply when the field's current value is a string; a document
  whose field holds a non-string is left unchanged by those modes.

---

## Compatibility

This package supports **Sanity Studio v3, v4, v5 and v6** from a single build.

| Peer | Declared range | What that means |
|------|----------------|-----------------|
| `sanity` | `>=3 <7` | Studio **v3 through v6** |
| `@sanity/ui` | `>=2 <5` | v2, v3, v4 — see the note below, `<5` is **correct** for Studio v6 |
| `@sanity/icons` | `>=2 <6` | v2 through v5 |
| `react` | `^18.0.0 \|\| ^19.0.0` | React 18 or 19 |

> The `@sanity/ui` ceiling of `<5` looks like a mistake at a glance and is not.
> **Studio v6 ships `@sanity/ui` v4, not v5** — so `>=2 <5` covers every Studio
> major listed above.

### How one build spans four Studio majors

The two libraries made breaking changes that are invisible to the type-checker:

- **`@sanity/ui` v4** moved `Tooltip`, `Menu`, `MenuButton`, `MenuItem`, `Code`,
  `Popover`, `Autocomplete`, `Toast` and `useToast` out of the package root and
  into subpath entries.
- **`@sanity/icons` v5** removed every named `*Icon` export.

The trap is that **both packages still *declare* the removed names in their
`.d.ts`, typed as `never`.** A named import therefore type-checks cleanly,
compiles, ships — and then throws at runtime in the Studio.

So this package **imports no `@sanity/ui` or `@sanity/icons` symbol directly.**
Every primitive and icon is routed through
[`@overpunch/sanity-ui-compat`](https://www.npmjs.com/package/@overpunch/sanity-ui-compat),
which resolves the *installed* namespace at runtime and falls back to a plain DOM
element if a given primitive is absent. That indirection, not a version matrix in
CI, is what makes one artifact work across v3–v6.

> **How far this is actually verified.** v6 support rests on the declared peer
> ranges, a green build, and use in three in-house Studios. It has **not** been
> exercised broadly in a running Sanity 6 Studio — treat v6 as supported and
> lightly travelled, and please file an issue if you hit a gap.

Built as an ESM bundle (`dist/index.js`) with React, `sanity`, and `@sanity/*`
left external.

---

## License

MIT — © Liiift Studio.

## Contributing

Issues and pull requests welcome:
<https://github.com/Liiift-Studio/sanity-bulk-data-operations/issues>
