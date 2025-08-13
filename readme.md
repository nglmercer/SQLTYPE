# SQL Schema Extractor

Ultra lightweight library for extracting SQL schemas and generating TypeScript types.

## Features

- Extract table schemas from SQL files
- Generate TypeScript interfaces from SQL schemas
- Support for MySQL, PostgreSQL, and SQLite
- Zero heavy dependencies
- Configurable naming conventions
- Error handling with detailed messages

## Installation

```bash
npm install sql-schema-extractor
```

## Usage

```typescript
import { extractSchemas, generateTypes } from 'sql-schema-extractor';

// Extract schemas from SQL string
const schemas = extractSchemas(sqlContent);

// Generate TypeScript interfaces
const typeScript = generateTypes(schemas);

// Or do both in one step
const types = extractAndGenerate(sqlContent);
```

## API

### `extractSchemas(input, options?)`

Extract table schemas from SQL string or buffer.

### `generateTypes(schemas, options?)`

Generate TypeScript interfaces from table schemas.

### `extractAndGenerate(input, extractorOptions?, generatorOptions?)`

Convenience function that combines extraction and generation.

### File-based functions

- `extractSchemasFromFile(filePath, options?)`
- `generateTypesFromFile(filePath, extractorOptions?, generatorOptions?)`

## License

MIT