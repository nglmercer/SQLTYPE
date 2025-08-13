/**
 * Main API for sql-schema-extractor
 * Ultra lightweight library for extracting SQL schemas and generating TypeScript types
 */

import { TableSchema, ExtractorOptions, GeneratorOptions, SQLParseError, FileReadError } from './types/index.js';
import { TableExtractor } from './parser/table-extractor.js';
import { TypeScriptGenerator } from './generator/typescript-generator.js';
import { TypeMapper } from './generator/type-mapper.js';
import { readFile } from './utils/file-reader.js';
import { mergeExtractorOptions, mergeGeneratorOptions, createConfigurationError } from './utils/config.js';
import { 
  validateAndConvertInput, 
  validateForProcessing, 
  validateFieldCount,
  ValidationLimits, 
  DEFAULT_VALIDATION_LIMITS,
  createValidationLimits
} from './utils/validation.js';

// Re-export types for consumers
export * from './types/index.js';

// Re-export configuration utilities
export { 
  mergeExtractorOptions, 
  mergeGeneratorOptions, 
  validateExtractorOptions, 
  validateGeneratorOptions,
  validateConfiguration,
  createConfiguration,
  areConfigurationsEqual,
  getEffectiveConfiguration,
  createConfigurationError,
  isValidIdentifier,
  sanitizeIdentifier,
  DEFAULT_EXTRACTOR_OPTIONS,
  DEFAULT_GENERATOR_OPTIONS,
  getConfigurationSummary
} from './utils/config.js';

// Re-export validation utilities
export {
  validateSqlInput,
  sanitizeSqlInput,
  validateFilePath,
  validateFileSize,
  validateMemoryUsage,
  validateTableCount,
  validateFieldCount,
  validateForProcessing,
  validateAndConvertInput,
  ValidationLimits,
  DEFAULT_VALIDATION_LIMITS,
  createValidationLimits
} from './utils/validation.js';

/**
 * Extract table schemas from SQL string or buffer
 * @param input SQL content as string or Buffer
 * @param options Extractor options for customizing parsing behavior
 * @param validationLimits Optional validation limits for input validation
 * @returns Array of TableSchema objects representing the extracted table structures
 * @throws {SQLParseError} If SQL parsing fails
 */
export function extractSchemas(
  input: string | Buffer, 
  options: ExtractorOptions = {},
  validationLimits?: Partial<ValidationLimits>
): TableSchema[] {
  // Create complete validation limits
  const limits = createValidationLimits(validationLimits);

  // Validate and convert input to string
  const sqlContent = validateAndConvertInput(input, limits);

  // Validate and merge options with defaults
  let mergedOptions: Required<ExtractorOptions>;
  try {
    mergedOptions = mergeExtractorOptions(options);
  } catch (error) {
    throw createConfigurationError(error as Error, 'extractSchemas');
  }

  // Comprehensive validation for processing
  validateForProcessing(sqlContent, limits);

  try {
    // Extract table schemas using the TableExtractor
    const schemas = TableExtractor.extractTables(sqlContent, mergedOptions);
    
    // Validate extracted schemas against limits
    for (const schema of schemas) {
      validateFieldCount(schema.fields.length, schema.name, limits);
    }

    return schemas;
  } catch (error) {
    if (error instanceof SQLParseError) {
      throw error;
    }
    throw new SQLParseError(`Failed to extract schemas: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate TypeScript interfaces from table schemas
 * @param schemas Array of TableSchema objects to convert to TypeScript
 * @param options Generator options for customizing TypeScript output
 * @returns Generated TypeScript code as string
 * @throws {Error} If generation fails
 */
export function generateTypes(
  schemas: TableSchema[], 
  options: GeneratorOptions = {}
): string {
  // Input validation
  if (!schemas) {
    throw new Error('Schemas cannot be null or undefined');
  }

  if (!Array.isArray(schemas)) {
    throw new Error('Schemas must be an array');
  }

  if (schemas.length === 0) {
    return '';
  }

  // Validate and merge options with defaults
  let mergedOptions: Required<GeneratorOptions>;
  try {
    mergedOptions = mergeGeneratorOptions(options);
  } catch (error) {
    throw createConfigurationError(error as Error, 'generateTypes');
  }

  try {
    // Create TypeScript generator with appropriate type mapper
    const typeMapper = new TypeMapper();
    const generator = new TypeScriptGenerator(typeMapper);
    
    // Generate TypeScript interfaces
    return generator.generate(schemas, mergedOptions);
  } catch (error) {
    throw new Error(`Failed to generate TypeScript types: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Convenience function that combines extraction and generation
 * @param input SQL content as string or Buffer
 * @param extractorOptions Options for SQL parsing and schema extraction
 * @param generatorOptions Options for TypeScript code generation
 * @param validationLimits Optional validation limits for input validation
 * @returns Generated TypeScript code as string
 * @throws {SQLParseError} If SQL parsing fails
 * @throws {Error} If TypeScript generation fails
 */
export function extractAndGenerate(
  input: string | Buffer,
  extractorOptions: ExtractorOptions = {},
  generatorOptions: GeneratorOptions = {},
  validationLimits?: Partial<ValidationLimits>
): string {
  try {
    // Extract schemas from input with validation
    const schemas = extractSchemas(input, extractorOptions, validationLimits);
    
    // Generate TypeScript types from schemas
    return generateTypes(schemas, generatorOptions);
  } catch (error) {
    if (error instanceof SQLParseError) {
      throw error;
    }
    throw new Error(`Failed to extract and generate types: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extract schemas from a file
 * @param filePath Path to the SQL file to read and parse
 * @param options Extractor options for customizing parsing behavior
 * @param validationLimits Optional validation limits for input validation
 * @returns Promise that resolves to array of TableSchema objects
 * @throws {FileReadError} If file cannot be read
 * @throws {SQLParseError} If SQL parsing fails
 */
export async function extractSchemasFromFile(
  filePath: string, 
  options: ExtractorOptions = {},
  validationLimits?: Partial<ValidationLimits>
): Promise<TableSchema[]> {
  // Create complete validation limits
  const limits = createValidationLimits(validationLimits);

  // Validate file path
  if (!filePath || typeof filePath !== 'string') {
    throw new FileReadError('File path must be a non-empty string', filePath || '');
  }

  // Validate options early to provide better error messages
  try {
    mergeExtractorOptions(options);
  } catch (error) {
    throw createConfigurationError(error as Error, 'extractSchemasFromFile');
  }

  try {
    // Read the SQL file with validation
    const sqlContent = await readFile(filePath, {
      maxSize: limits.maxFileSize,
      validatePath: true
    });
    
    // Extract schemas from the file content with validation
    return extractSchemas(sqlContent, options, validationLimits);
  } catch (error) {
    if (error instanceof FileReadError || error instanceof SQLParseError) {
      throw error;
    }
    throw new FileReadError(`Failed to extract schemas from file: ${error instanceof Error ? error.message : 'Unknown error'}`, filePath);
  }
}

/**
 * Generate TypeScript types directly from a SQL file
 * @param filePath Path to the SQL file to read and process
 * @param extractorOptions Options for SQL parsing and schema extraction
 * @param generatorOptions Options for TypeScript code generation
 * @param validationLimits Optional validation limits for input validation
 * @returns Promise that resolves to generated TypeScript code as string
 * @throws {FileReadError} If file cannot be read
 * @throws {SQLParseError} If SQL parsing fails
 * @throws {Error} If TypeScript generation fails
 */
export async function generateTypesFromFile(
  filePath: string,
  extractorOptions: ExtractorOptions = {},
  generatorOptions: GeneratorOptions = {},
  validationLimits?: Partial<ValidationLimits>
): Promise<string> {
  // Create complete validation limits
  const limits = createValidationLimits(validationLimits);

  // Validate file path
  if (!filePath || typeof filePath !== 'string') {
    throw new FileReadError('File path must be a non-empty string', filePath || '');
  }

  // Validate options early to provide better error messages
  try {
    mergeExtractorOptions(extractorOptions);
    mergeGeneratorOptions(generatorOptions);
  } catch (error) {
    throw createConfigurationError(error as Error, 'generateTypesFromFile');
  }

  try {
    // Read the SQL file with validation
    const sqlContent = await readFile(filePath, {
      maxSize: limits.maxFileSize,
      validatePath: true
    });
    
    // Extract and generate types from the file content with validation
    return extractAndGenerate(sqlContent, extractorOptions, generatorOptions, validationLimits);
  } catch (error) {
    if (error instanceof FileReadError || error instanceof SQLParseError) {
      throw error;
    }
    throw new Error(`Failed to generate types from file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}