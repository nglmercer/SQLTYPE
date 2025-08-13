/**
 * Example demonstrating configuration and options handling
 * This example shows how to use the various configuration utilities
 */

import { 
  extractSchemas, 
  generateTypes,
  getEffectiveConfiguration,
  createConfiguration,
  areConfigurationsEqual,
  SQLDialect 
} from '../dist/index.js';

// Sample SQL for demonstration
const sampleSQL = `
  CREATE TABLE products (
    product_id INT PRIMARY KEY AUTO_INCREMENT,
    product_name VARCHAR(255) NOT NULL,
    product_price DECIMAL(10,2),
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`;

console.log('=== Configuration and Options Handling Example ===\n');

// 1. Basic usage with default configuration
console.log('1. Using default configuration:');
const schemas = extractSchemas(sampleSQL);
const defaultTypeScript = generateTypes(schemas);
console.log(defaultTypeScript);
console.log('\n' + '='.repeat(50) + '\n');

// 2. Using custom configuration
console.log('2. Using custom configuration (camelCase naming, type exports):');
const customTypeScript = generateTypes(schemas, {
  naming: 'camelCase',
  exportType: 'type',
  prefix: 'T',
  suffix: 'Model'
});
console.log(customTypeScript);
console.log('\n' + '='.repeat(50) + '\n');

// 3. Preview effective configuration
console.log('3. Preview effective configuration:');
const effectiveConfig = getEffectiveConfiguration(
  { dialect: SQLDialect.MYSQL, includeComments: false },
  { naming: 'PascalCase', optionalFields: true }
);
console.log(effectiveConfig.summary);
console.log('\n' + '='.repeat(50) + '\n');

// 4. Create and compare configurations
console.log('4. Configuration comparison:');
const config1 = createConfiguration({
  extractorOptions: { dialect: SQLDialect.MYSQL },
  generatorOptions: { naming: 'camelCase' }
});

const config2 = createConfiguration({
  extractorOptions: { dialect: SQLDialect.MYSQL, includeComments: true },
  generatorOptions: { naming: 'camelCase', exportType: 'interface' }
});

console.log('Config 1 and Config 2 are equal:', areConfigurationsEqual(
  { extractorOptions: { dialect: SQLDialect.MYSQL }, generatorOptions: { naming: 'camelCase' } },
  { extractorOptions: { dialect: SQLDialect.MYSQL, includeComments: true }, generatorOptions: { naming: 'camelCase', exportType: 'interface' } }
));

// 5. Error handling demonstration
console.log('\n5. Error handling demonstration:');
try {
  extractSchemas(sampleSQL, { dialect: 'invalid_dialect' });
} catch (error) {
  console.log('Caught configuration error:', error.message);
}

try {
  generateTypes(schemas, { naming: 'invalid_naming' });
} catch (error) {
  console.log('Caught generator configuration error:', error.message);
}

console.log('\n=== Example completed successfully! ===');