# SQL Schema Extractor Examples

This directory contains examples demonstrating the capabilities of the SQL Schema Extractor library.

## Files Overview

### Example Files
- **`file-reading-example.js`** - Comprehensive demonstration of file reading and schema extraction
- **`configuration-example.js`** - Configuration options and customization examples
- **`sample-schema.sql`** - Clean sample SQL schema for testing

### Generated Output Files
- **`extracted-schemas.json`** - JSON representation of extracted table schemas
- **`generated-types.ts`** - TypeScript interfaces generated from SQL schema

## File Reading Example

The `file-reading-example.js` demonstrates:

### 1. File Existence Checking
- Validates SQL files before processing
- Shows file sizes and types
- Uses native Node.js `fs` operations for reliability

### 2. Schema Extraction from Files
- Extracts table schemas from SQL files
- Supports MySQL dialect with comments
- Displays detailed field information and constraints

### 3. TypeScript Type Generation
- Generates TypeScript interfaces directly from SQL files
- Supports multiple naming conventions (camelCase, PascalCase, snake_case)
- Includes comprehensive type mappings and null handling

### 4. Multiple File Processing
- Reads and processes multiple SQL files simultaneously
- Handles file access errors gracefully
- Combines schemas from multiple sources

### 5. Advanced Validation Options
- Custom file size limits
- Table count restrictions
- Comprehensive error handling

### 6. Error Handling Demonstration
- File not found scenarios
- Invalid configuration options
- Size and validation limit violations

## Sample Schema

The `sample-schema.sql` file contains a clean e-commerce database schema with:

- **users** - User account information with authentication fields
- **categories** - Product categories with hierarchical structure
- **products** - Product catalog with pricing and inventory
- **orders** - Order management with status tracking
- **order_items** - Order line items with pricing details

## Generated Results

### Extracted Schemas (`extracted-schemas.json`)
Contains detailed JSON representation of all tables including:
- Field names, types, and nullability
- Primary keys and constraints
- Foreign key relationships
- Auto-increment settings
- Default values

### TypeScript Types (`generated-types.ts`)
Provides ready-to-use TypeScript interfaces with:
- Proper type mappings (INT → number, VARCHAR → string, etc.)
- Null safety with union types
- Optional fields for columns with defaults
- JSDoc comments with metadata
- Export declarations for easy importing

## Running the Examples

```bash
# Run the file reading example
node examples/file-reading-example.js

# Run the configuration example
node examples/configuration-example.js
```

## Key Features Demonstrated

✅ **File System Integration** - Safe file reading with validation  
✅ **Schema Extraction** - Complete table structure analysis  
✅ **Type Generation** - Production-ready TypeScript interfaces  
✅ **Error Handling** - Comprehensive error scenarios  
✅ **Multiple Dialects** - MySQL, PostgreSQL, SQLite support  
✅ **Customization** - Flexible naming and export options  
✅ **Validation** - File size and content restrictions  
✅ **Performance** - Efficient processing of large SQL files  

## Output Examples

### Schema Extraction Output
```
Found 5 table(s):
   - Table: users
     Fields: 10
     Constraints: 0
       • id: INT (not null)
       • username: VARCHAR(50) (not null)
       • email: VARCHAR(100) (not null)
       ... and 7 more fields
```

### Generated TypeScript Interface
```typescript
export interface users {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  first_name: string | null;
  last_name: string | null;
  date_of_birth: Date | null;
  is_active?: boolean;
  created_at?: Date;
  updated_at?: Date;
}
```

These examples provide a complete foundation for integrating SQL schema extraction into your development workflow.