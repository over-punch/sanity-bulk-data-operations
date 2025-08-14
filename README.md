# Sanity Bulk Data Operations

A flexible bulk data operations utility for Sanity Studio that enables searching, adding, and modifying data across any document types with comprehensive safety features and batch processing.

## Features

- 🔍 **Flexible Search**: Search across any document type with multiple criteria
- ✏️ **Bulk Modifications**: Update multiple documents simultaneously
- ➕ **Batch Creation**: Create multiple documents with templates
- 🎯 **Custom GROQ Queries**: Advanced users can write custom queries
- 🛡️ **Safety First**: Confirmation dialogs, dry-run mode, and validation
- 📊 **Progress Tracking**: Real-time feedback during operations
- 🔄 **Batch Processing**: Handles large datasets efficiently
- 📱 **Responsive UI**: Seamless integration with Sanity Studio

## Installation

```bash
npm install sanity-bulk-data-operations
```

## Quick Start

### Basic Usage

```tsx
import React from 'react'
import { BulkDataOperations } from 'sanity-bulk-data-operations'
import { useClient } from 'sanity'

const BulkOperations = () => {
  const client = useClient({ apiVersion: '2023-01-01' })

  return (
    <BulkDataOperations
      client={client}
      onComplete={(results) => {
        console.log(`Operation complete: ${results.processed} documents`)
      }}
    />
  )
}
```

### As a Sanity Studio Tool

```tsx
// sanity.config.ts
import { defineConfig } from 'sanity'
import { BulkDataOperationsTool } from 'sanity-bulk-data-operations'

export default defineConfig({
  // ... other config
  tools: [
    BulkDataOperationsTool()
  ]
})
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `client` | `SanityClient` | **required** | Sanity client instance |
| `documentTypes` | `string[]` | `[]` | Specific document types to work with |
| `onComplete` | `function` | `undefined` | Callback when operation completes |
| `onError` | `function` | `undefined` | Error handling callback |
| `batchSize` | `number` | `10` | Number of documents to process per batch |
| `dryRun` | `boolean` | `false` | Preview mode without actual changes |
| `maxDocuments` | `number` | `1000` | Maximum documents to process |

## Operations

### 1. Bulk Search and Filter

Search across any document types with flexible criteria:

```tsx
// Component provides UI for:
// - Document type selection
// - Field-based search
// - Date range filtering
// - Custom GROQ queries
```

### 2. Bulk Modifications

Update multiple documents simultaneously:

```tsx
// Examples of bulk operations:
// - Update all posts to published status
// - Add tags to multiple documents
// - Update author references
// - Modify field values across documents
```

### 3. Batch Creation

Create multiple documents from templates:

```tsx
// Use cases:
// - Create multiple pages from template
// - Generate test data
// - Import structured data
// - Duplicate existing documents
```

## Safety Features

### Dry Run Mode
```tsx
<BulkDataOperations client={client} dryRun={true} />
```
- Preview changes without applying them
- Test operations safely
- Validate batch sizes and queries

### Confirmation Dialogs
- All operations require explicit confirmation
- Clear warnings for destructive actions
- Detailed summary before execution

### Batch Processing
- Large operations processed in configurable batches
- Progress feedback during long operations
- Prevents timeout issues

## Requirements

- Sanity Studio v3+
- React 18+
- @sanity/ui v1+
- TypeScript 4.5+ (optional)

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests to help improve this utility.