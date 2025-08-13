/**
 * Example demonstrating file reading and schema extraction with file outputs
 * This example shows how to read SQL files, extract schemas, and save TypeScript files
 */

import { 
  extractSchemasFromFile, 
  generateTypesFromFile,
  extractSchemas,
  generateTypes,
  SQLDialect 
} from '../dist/index.js';
import { promises as fs } from 'fs';
import path from 'path';

console.log('=== File Reading and Schema Extraction with File Outputs ===\n');

// Define file paths relative to project root
const sqlFiles = {
  sample: 'examples/sample-schema.sql',
//  newsample: 'sql-file-schema.sql'
};

// Output directory for generated files
const outputDir = 'examples/generated';

// Helper function to check if file exists
async function checkFileExists(filePath) {
  try {
    await fs.access(filePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

// Helper function to ensure directory exists
async function ensureDirectoryExists(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
}

async function demonstrateFileOutputs() {
  try {
    // Ensure output directory exists
    await ensureDirectoryExists(outputDir);
    console.log(`Created output directory: ${outputDir}\n`);

    // 1. Generate TypeScript interfaces from sample schema
    console.log('1. Generating TypeScript interfaces from sample-schema.sql:');
    if (await checkFileExists(sqlFiles.sample)) {
      const typeScriptInterfaces = await generateTypesFromFile(
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
      
      const interfaceFile = path.join(outputDir, 'sample-interfaces.ts');
      await fs.writeFile(interfaceFile, typeScriptInterfaces, 'utf8');
      console.log(`   ✓ Saved interfaces to: ${interfaceFile}`);
    } else {
      console.log('   ✗ sample-schema.sql not found');
    }

    // 2. Generate different TypeScript styles
    console.log('\n2. Generating different TypeScript styles:');
    if (await checkFileExists(sqlFiles.sample)) {
      const schemas = await extractSchemasFromFile(sqlFiles.sample, {
        dialect: SQLDialect.MYSQL,
        includeComments: true
      });
      
      const styles = [
        { 
          naming: 'camelCase', 
          exportType: 'interface', 
          prefix: 'I', 
          suffix: 'Entity',
          filename: 'camel-case-interfaces.ts',
          description: 'Camel case interfaces'
        },
        { 
          naming: 'PascalCase', 
          exportType: 'type', 
          prefix: '', 
          suffix: 'Type',
          filename: 'pascal-case-types.ts',
          description: 'Pascal case types'
        },
        { 
          naming: 'snake_case', 
          exportType: 'interface', 
          prefix: '', 
          suffix: '_interface',
          filename: 'snake-case-interfaces.ts',
          description: 'Snake case interfaces'
        }
      ];
      
      for (const style of styles) {
        const generated = generateTypes(schemas, {
          naming: style.naming,
          exportType: style.exportType,
          prefix: style.prefix,
          suffix: style.suffix,
          includeComments: true
        });
        
        const styleFile = path.join(outputDir, style.filename);
        await fs.writeFile(styleFile, generated, 'utf8');
        console.log(`   ✓ Saved ${style.description} to: ${styleFile}`);
      }
    }

    // 3. Generate from catalogos.sql if available
    console.log('\n3. Generating from catalogos.sql:');
    if (await checkFileExists(sqlFiles.catalogos)) {
      try {
        const catalogosTypes = await generateTypesFromFile(
          sqlFiles.catalogos,
          { dialect: SQLDialect.MYSQL, includeComments: true },
          { 
            naming: 'PascalCase', 
            exportType: 'interface',
            includeComments: true
          }
        );
        
        const catalogosFile = path.join(outputDir, 'catalogos-types.ts');
        await fs.writeFile(catalogosFile, catalogosTypes, 'utf8');
        console.log(`   ✓ Saved catalogos types to: ${catalogosFile}`);
      } catch (error) {
        console.log(`   ✗ Error processing catalogos.sql: ${error.message}`);
      }
    } else {
      console.log('   ✗ catalogos.sql not found');
    }

    // 4. Generate a combined types file
    console.log('\n4. Generating combined types file:');
    const combinedTypes = [];
    
    for (const [name, filePath] of Object.entries(sqlFiles)) {
      if (await checkFileExists(filePath)) {
        try {
          const schemas = await extractSchemasFromFile(filePath, {
            dialect: SQLDialect.AUTO,
            includeComments: false
          });
          
          if (schemas.length > 0) {
            const types = generateTypes(schemas, {
              naming: 'PascalCase',
              exportType: 'interface',
              includeComments: true
            });
            
            combinedTypes.push(`// Generated from ${filePath}`);
            combinedTypes.push(types);
            combinedTypes.push(''); // Empty line separator
            
            console.log(`   ✓ Processed ${name}: ${schemas.length} table(s)`);
          }
        } catch (error) {
          console.log(`   ✗ Error processing ${name}: ${error.message}`);
        }
      }
    }
    
    if (combinedTypes.length > 0) {
      const combinedFile = path.join(outputDir, 'combined-types.ts');
      const combinedContent = combinedTypes.join('\n');
      await fs.writeFile(combinedFile, combinedContent, 'utf8');
      console.log(`   ✓ Saved combined types to: ${combinedFile}`);
    }

    // 5. Generate a summary file
    console.log('\n5. Generating summary file:');
    const summaryContent = [
      '# Generated TypeScript Files Summary',
      '',
      `Generated on: ${new Date().toISOString()}`,
      '',
      '## Files Generated:',
      ''
    ];
    
    try {
      const files = await fs.readdir(outputDir);
      const tsFiles = files.filter(file => file.endsWith('.ts'));
      
      for (const file of tsFiles) {
        const filePath = path.join(outputDir, file);
        const stats = await fs.stat(filePath);
        summaryContent.push(`- **${file}**: ${(stats.size / 1024).toFixed(2)} KB`);
      }
      
      summaryContent.push('');
      summaryContent.push('## Usage:');
      summaryContent.push('');
      summaryContent.push('```typescript');
      summaryContent.push('// Import the generated types');
      summaryContent.push('import { ICatalogosEntity } from "./sample-interfaces";');
      summaryContent.push('');
      summaryContent.push('// Use the types in your code');
      summaryContent.push('const catalog: ICatalogosEntity = {');
      summaryContent.push('  idCatalogo: 1,');
      summaryContent.push('  nombreCatalogo: "Example",');
      summaryContent.push('  // ... other properties');
      summaryContent.push('};');
      summaryContent.push('```');
      
      const summaryFile = path.join(outputDir, 'README.md');
      await fs.writeFile(summaryFile, summaryContent.join('\n'), 'utf8');
      console.log(`   ✓ Saved summary to: ${summaryFile}`);
      
    } catch (error) {
      console.log(`   ✗ Error generating summary: ${error.message}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('=== File Output Example completed successfully! ===');
    console.log(`All generated files are in: ${outputDir}`);
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('Example failed with error:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the demonstration
demonstrateFileOutputs().catch(console.error);