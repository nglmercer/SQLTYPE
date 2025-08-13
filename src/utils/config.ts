/**
 * Configuration utilities for options handling and validation
 */

import { ExtractorOptions, GeneratorOptions, SQLDialect } from '../types/index.js';

/**
 * Default extractor options
 */
export const DEFAULT_EXTRACTOR_OPTIONS: Required<ExtractorOptions> = {
  dialect: SQLDialect.AUTO,
  includeComments: true,
  caseSensitive: false
};

/**
 * Default generator options
 */
export const DEFAULT_GENERATOR_OPTIONS: Required<GeneratorOptions> = {
  naming: 'preserve',
  optionalFields: false,
  prefix: '',
  suffix: '',
  includeComments: true,
  exportType: 'interface'
};

/**
 * Validates and merges extractor options with defaults
 * @param options User-provided extractor options
 * @returns Merged options with defaults
 * @throws {Error} If options are invalid
 */
export function mergeExtractorOptions(options: ExtractorOptions = {}): Required<ExtractorOptions> {
  // Validate options
  validateExtractorOptions(options);
  
  // Merge with defaults
  return {
    ...DEFAULT_EXTRACTOR_OPTIONS,
    ...options
  };
}

/**
 * Validates and merges generator options with defaults
 * @param options User-provided generator options
 * @returns Merged options with defaults
 * @throws {Error} If options are invalid
 */
export function mergeGeneratorOptions(options: GeneratorOptions = {}): Required<GeneratorOptions> {
  // Validate options
  validateGeneratorOptions(options);
  
  // Merge with defaults
  return {
    ...DEFAULT_GENERATOR_OPTIONS,
    ...options
  };
}

/**
 * Validates extractor options
 * @param options Extractor options to validate
 * @throws {Error} If options are invalid
 */
export function validateExtractorOptions(options: ExtractorOptions): void {
  if (options === null || options === undefined) {
    return; // Allow null/undefined options
  }

  if (typeof options !== 'object') {
    throw new Error('Extractor options must be an object');
  }

  // Validate dialect
  if (options.dialect !== undefined) {
    const validDialects = Object.values(SQLDialect);
    if (!validDialects.includes(options.dialect)) {
      throw new Error(`Invalid dialect "${options.dialect}". Valid options are: ${validDialects.join(', ')}`);
    }
  }

  // Validate includeComments
  if (options.includeComments !== undefined && typeof options.includeComments !== 'boolean') {
    throw new Error('includeComments option must be a boolean');
  }

  // Validate caseSensitive
  if (options.caseSensitive !== undefined && typeof options.caseSensitive !== 'boolean') {
    throw new Error('caseSensitive option must be a boolean');
  }
}

/**
 * Validates generator options
 * @param options Generator options to validate
 * @throws {Error} If options are invalid
 */
export function validateGeneratorOptions(options: GeneratorOptions): void {
  if (options === null || options === undefined) {
    return; // Allow null/undefined options
  }

  if (typeof options !== 'object') {
    throw new Error('Generator options must be an object');
  }

  // Validate naming convention
  if (options.naming !== undefined) {
    const validNamingConventions = ['camelCase', 'PascalCase', 'snake_case', 'preserve'];
    if (!validNamingConventions.includes(options.naming)) {
      throw new Error(`Invalid naming convention "${options.naming}". Valid options are: ${validNamingConventions.join(', ')}`);
    }
  }

  // Validate optionalFields
  if (options.optionalFields !== undefined && typeof options.optionalFields !== 'boolean') {
    throw new Error('optionalFields option must be a boolean');
  }

  // Validate prefix
  if (options.prefix !== undefined) {
    if (typeof options.prefix !== 'string') {
      throw new Error('prefix option must be a string');
    }
    if (options.prefix.length > 0 && !/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(options.prefix)) {
      throw new Error('prefix must be a valid JavaScript identifier');
    }
  }

  // Validate suffix
  if (options.suffix !== undefined) {
    if (typeof options.suffix !== 'string') {
      throw new Error('suffix option must be a string');
    }
    if (options.suffix.length > 0 && !/^[a-zA-Z0-9_$]+$/.test(options.suffix)) {
      throw new Error('suffix must contain only valid identifier characters');
    }
  }

  // Validate includeComments
  if (options.includeComments !== undefined && typeof options.includeComments !== 'boolean') {
    throw new Error('includeComments option must be a boolean');
  }

  // Validate exportType
  if (options.exportType !== undefined) {
    const validExportTypes = ['interface', 'type'];
    if (!validExportTypes.includes(options.exportType)) {
      throw new Error(`Invalid exportType "${options.exportType}". Valid options are: ${validExportTypes.join(', ')}`);
    }
  }
}

/**
 * Creates a comprehensive error message for invalid configuration
 * @param error The original error
 * @param context Additional context about where the error occurred
 * @returns Formatted error message
 */
export function createConfigurationError(error: Error, context: string): Error {
  const message = `Configuration error in ${context}: ${error.message}`;
  
  // Add helpful suggestions based on the error type
  let suggestions = '';
  
  if (error.message.includes('dialect')) {
    suggestions = '\nValid dialects: mysql, postgresql, sqlite, auto';
  } else if (error.message.includes('naming')) {
    suggestions = '\nValid naming conventions: camelCase, PascalCase, snake_case, preserve';
  } else if (error.message.includes('exportType')) {
    suggestions = '\nValid export types: interface, type';
  } else if (error.message.includes('prefix') || error.message.includes('suffix')) {
    suggestions = '\nPrefix and suffix must be valid JavaScript identifiers';
  }
  
  return new Error(message + suggestions);
}

/**
 * Validates that a string is a valid JavaScript identifier
 * @param identifier The string to validate
 * @returns True if valid identifier
 */
export function isValidIdentifier(identifier: string): boolean {
  if (!identifier || typeof identifier !== 'string') {
    return false;
  }
  
  // Check if it matches JavaScript identifier rules
  return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(identifier);
}

/**
 * Sanitizes a string to be a valid JavaScript identifier
 * @param input The input string
 * @returns Sanitized identifier
 */
export function sanitizeIdentifier(input: string): string {
  if (!input || typeof input !== 'string') {
    return 'Unknown';
  }
  
  // Replace invalid characters with underscores
  let sanitized = input.replace(/[^a-zA-Z0-9_$]/g, '_');
  
  // Ensure it starts with a valid character
  if (!/^[a-zA-Z_$]/.test(sanitized)) {
    sanitized = '_' + sanitized;
  }
  
  // Remove consecutive underscores
  sanitized = sanitized.replace(/_+/g, '_');
  
  // Remove trailing underscores
  sanitized = sanitized.replace(/_+$/, '');
  
  return sanitized || 'Unknown';
}

/**
 * Gets a summary of the current configuration
 * @param extractorOptions Extractor options
 * @param generatorOptions Generator options
 * @returns Configuration summary string
 */
export function getConfigurationSummary(
  extractorOptions: ExtractorOptions,
  generatorOptions: GeneratorOptions
): string {
  const mergedExtractor = mergeExtractorOptions(extractorOptions);
  const mergedGenerator = mergeGeneratorOptions(generatorOptions);
  
  return `Configuration Summary:
Extractor:
  - Dialect: ${mergedExtractor.dialect}
  - Include Comments: ${mergedExtractor.includeComments}
  - Case Sensitive: ${mergedExtractor.caseSensitive}

Generator:
  - Naming Convention: ${mergedGenerator.naming}
  - Optional Fields: ${mergedGenerator.optionalFields}
  - Prefix: ${mergedGenerator.prefix || '(none)'}
  - Suffix: ${mergedGenerator.suffix || '(none)'}
  - Include Comments: ${mergedGenerator.includeComments}
  - Export Type: ${mergedGenerator.exportType}`;
}

/**
 * Validates a complete configuration object containing both extractor and generator options
 * @param config Configuration object with extractor and generator options
 * @throws {Error} If configuration is invalid
 */
export function validateConfiguration(config: {
  extractorOptions?: ExtractorOptions;
  generatorOptions?: GeneratorOptions;
}): void {
  if (!config || typeof config !== 'object') {
    throw new Error('Configuration must be an object');
  }

  // Validate extractor options if provided
  if (config.extractorOptions !== undefined) {
    try {
      validateExtractorOptions(config.extractorOptions);
    } catch (error) {
      throw createConfigurationError(error as Error, 'extractor options');
    }
  }

  // Validate generator options if provided
  if (config.generatorOptions !== undefined) {
    try {
      validateGeneratorOptions(config.generatorOptions);
    } catch (error) {
      throw createConfigurationError(error as Error, 'generator options');
    }
  }
}

/**
 * Creates a complete configuration object with validated and merged options
 * @param config Partial configuration object
 * @returns Complete configuration with merged defaults
 * @throws {Error} If configuration is invalid
 */
export function createConfiguration(config: {
  extractorOptions?: ExtractorOptions;
  generatorOptions?: GeneratorOptions;
} = {}): {
  extractorOptions: Required<ExtractorOptions>;
  generatorOptions: Required<GeneratorOptions>;
} {
  // Validate the configuration first
  validateConfiguration(config);

  // Merge with defaults
  const extractorOptions = mergeExtractorOptions(config.extractorOptions);
  const generatorOptions = mergeGeneratorOptions(config.generatorOptions);

  return {
    extractorOptions,
    generatorOptions
  };
}

/**
 * Checks if two configurations are equivalent
 * @param config1 First configuration
 * @param config2 Second configuration
 * @returns True if configurations are equivalent
 */
export function areConfigurationsEqual(
  config1: { extractorOptions?: ExtractorOptions; generatorOptions?: GeneratorOptions },
  config2: { extractorOptions?: ExtractorOptions; generatorOptions?: GeneratorOptions }
): boolean {
  try {
    const merged1 = createConfiguration(config1);
    const merged2 = createConfiguration(config2);

    // Deep comparison of merged configurations
    return JSON.stringify(merged1) === JSON.stringify(merged2);
  } catch {
    // If either configuration is invalid, they're not equal
    return false;
  }
}

/**
 * Gets the effective configuration that would be used given the provided options
 * This is useful for debugging and understanding what the final configuration will be
 * @param extractorOptions Extractor options
 * @param generatorOptions Generator options
 * @returns The effective configuration that would be used
 */
export function getEffectiveConfiguration(
  extractorOptions?: ExtractorOptions,
  generatorOptions?: GeneratorOptions
): {
  extractorOptions: Required<ExtractorOptions>;
  generatorOptions: Required<GeneratorOptions>;
  summary: string;
} {
  const configInput: {
    extractorOptions?: ExtractorOptions;
    generatorOptions?: GeneratorOptions;
  } = {};
  
  if (extractorOptions !== undefined) {
    configInput.extractorOptions = extractorOptions;
  }
  if (generatorOptions !== undefined) {
    configInput.generatorOptions = generatorOptions;
  }
  
  const config = createConfiguration(configInput);
  const summary = getConfigurationSummary(extractorOptions || {}, generatorOptions || {});

  return {
    ...config,
    summary
  };
}