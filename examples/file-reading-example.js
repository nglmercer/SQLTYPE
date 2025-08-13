/**
 * Example demonstrating file reading and schema extraction
 * This example shows how to read SQL files and extract schemas using various methods
 */

import { 
  extractSchemasFromFile, 
  generateTypesFromFile,
  extractSchemas,
  generateTypes,
  SQLDialect 
} from '../dist/index.js';
import { promises as fs } from 'fs';

console.log('=== File Reading and Schema Extraction Example ===\n');

// Define file paths relative to project root
const sqlFiles = {
  sample: 'examples/sample-schema.sql',
  catalogos: 'catalogos.sql',
  maindb: 'maindb_dump.sql',
  koinima: 'sql_koinima_lat.sql'
};

// Helper function to check if file exists
async function checkFileExists(filePath) {
  try {
    await fs.access(filePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function demonstrateFileReading() {
  try {
    // 1. Check if files exist before processing
    console.log('1. Checking file existence:');
    for (const [name, filePath] of Object.entries(sqlFiles)) {
      const exists = await checkFileExists(filePath);
      if (exists) {
        const stats = await fs.stat(filePath);
        console.log(`   ${name}: ✓ Found (${filePath})`);
        console.log(`      Size: ${(stats.size / 1024).toFixed(2)} KB, Is file: ${stats.isFile()}`);
      } else {
        console.log(`   ${name}: ✗ Not found (${filePath})`);
      }
    }
    console.log('\n' + '='.repeat(60) + '\n');

    // 2. Extract schemas from a single file
    console.log('2. Extracting schemas from sample-schema.sql:');
    const sampleSchemas = await extractSchemasFromFile(sqlFiles.sample, {
      dialect: SQLDialect.MYSQL,
      includeComments: true,
      caseSensitive: false
    });
    
    console.log(`Found ${sampleSchemas.length} table(s):`);
    sampleSchemas.forEach(schema => {
      console.log(`   - Table: ${schema.name}`);
      console.log(`     Fields: ${schema.fields.length}`);
      console.log(`     Constraints: ${schema.constraints.length}`);
      
      // Show first few fields as example
      const fieldsToShow = schema.fields.slice(0, 3);
      fieldsToShow.forEach(field => {
        console.log(`       • ${field.name}: ${field.type} ${field.nullable ? '(nullable)' : '(not null)'}`);
      });
      if (schema.fields.length > 3) {
        console.log(`       ... and ${schema.fields.length - 3} more fields`);
      }
    });
    console.log('\n' + '='.repeat(60) + '\n');

    // 3. Generate TypeScript types directly from file
    console.log('3. Generating TypeScript types from file:');
    const typeScriptFromFile = await generateTypesFromFile(
      sqlFiles.sample,
      { dialect: SQLDialect.MYSQL, includeComments: true },
      { 
        naming: 'camelCase', 
        exportType: 'interface',
        prefix: 'I',
        suffix: 'Entity',
        includeComments: true
      }
    );
    console.log('Generated TypeScript interfaces:');
    console.log(typeScriptFromFile);
    console.log('\n' + '='.repeat(60) + '\n');

    // 4. Read multiple files and process them
    console.log('4. Reading multiple SQL files:');
    const existingFiles = [];
    for (const [name, filePath] of Object.entries(sqlFiles)) {
      if (await checkFileExists(filePath)) {
        existingFiles.push(filePath);
      }
    }
    
    if (existingFiles.length > 0) {
      console.log(`Reading ${existingFiles.length} file(s)...`);
      
      for (const filePath of existingFiles) {
        try {
          const content = await fs.readFile(filePath, 'utf8');
          const fileName = filePath.split(/[\\/]/).pop();
          console.log(`   - ${fileName}: ${(content.length / 1024).toFixed(2)} KB`);
          
          // Extract schemas from each file content
          try {
            const schemas = extractSchemas(content, {
              dialect: SQLDialect.AUTO,
              includeComments: false
            });
            console.log(`     Tables found: ${schemas.length}`);
            if (schemas.length > 0) {
              console.log(`     Table names: ${schemas.map(s => s.name).join(', ')}`);
            }
          } catch (error) {
            console.log(`     Error extracting schemas: ${error.message}`);
          }
        } catch (error) {
          console.log(`   - Error reading ${filePath}: ${error.message}`);
        }
      }
    } else {
      console.log('No SQL files found to process.');
    }
    console.log('\n' + '='.repeat(60) + '\n');

    // 5. Advanced file reading with custom validation limits
    console.log('5. Advanced file reading with validation limits:');
    if (await checkFileExists(sqlFiles.sample)) {
      const advancedSchemas = await extractSchemasFromFile(
        sqlFiles.sample,
        {
          dialect: SQLDialect.MYSQL,
          includeComments: true
        },
        {
          maxFileSize: 10 * 1024 * 1024, // 10MB
          maxTableCount: 500,
          maxFieldsPerTable: 1000,
          maxSqlLength: 1024 * 1024 // 1MB
        }
      );
      
      console.log('Advanced extraction completed successfully!');
      console.log(`Extracted ${advancedSchemas.length} table(s) with validation limits`);
      
      // Generate different TypeScript styles
      const styles = [
        { naming: 'camelCase', exportType: 'interface', description: 'Camel case interfaces' },
        { naming: 'PascalCase', exportType: 'type', description: 'Pascal case types' },
        { naming: 'snake_case', exportType: 'interface', description: 'Snake case interfaces' }
      ];
      
      styles.forEach(style => {
        console.log(`\n${style.description}:`);
        const generated = generateTypes(advancedSchemas, style);
        // Show just the first few lines to avoid overwhelming output
        const lines = generated.split('\n').slice(0, 8);
        lines.forEach(line => console.log(`   ${line}`));
        if (generated.split('\n').length > 8) {
          console.log('   ... (truncated)');
        }
      });
    } else {
      console.log('sample-schema.sql file not found, skipping advanced example.');
    }
    console.log('\n' + '='.repeat(60) + '\n');

    // 6. Error handling demonstration
    console.log('6. Error handling demonstration:');
    
    // Try to read a non-existent file
    try {
      await extractSchemasFromFile('non-existent-file.sql');
    } catch (error) {
      console.log(`✓ Caught file not found error: ${error.message}`);
    }
    
    // Try to read with invalid options
    try {
      await extractSchemasFromFile(sqlFiles.catalogos, {
        dialect: 'invalid_dialect'
      });
    } catch (error) {
      console.log(`✓ Caught invalid dialect error: ${error.message}`);
    }
    
    // Try to read with very restrictive limits
    try {
      await extractSchemasFromFile(
        sqlFiles.sample,
        { dialect: SQLDialect.MYSQL },
        { maxFileSize: 1024 * 1024 } // Very small limit

      );
    } catch (error) {
      console.log(`✓ Caught file size limit error: ${error.message}`);
    }
    
    console.log('\n=== File Reading Example completed successfully! ===');
    
  } catch (error) {
    console.error('Example failed with error:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the demonstration
demonstrateFileReading().catch(console.error);