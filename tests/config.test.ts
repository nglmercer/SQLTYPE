/**
 * Tests for configuration utilities
 */

import { describe, it, expect } from 'vitest';
import {
  mergeExtractorOptions,
  mergeGeneratorOptions,
  validateExtractorOptions,
  validateGeneratorOptions,
  createConfigurationError,
  isValidIdentifier,
  sanitizeIdentifier,
  getConfigurationSummary,
  validateConfiguration,
  createConfiguration,
  areConfigurationsEqual,
  getEffectiveConfiguration,
  DEFAULT_EXTRACTOR_OPTIONS,
  DEFAULT_GENERATOR_OPTIONS
} from '../src/utils/config.js';
import { SQLDialect, ExtractorOptions, GeneratorOptions } from '../src/types/index.js';

describe('Configuration utilities', () => {
  describe('Default options', () => {
    it('should have correct default extractor options', () => {
      expect(DEFAULT_EXTRACTOR_OPTIONS).toEqual({
        dialect: SQLDialect.AUTO,
        includeComments: true,
        caseSensitive: false
      });
    });

    it('should have correct default generator options', () => {
      expect(DEFAULT_GENERATOR_OPTIONS).toEqual({
        naming: 'preserve',
        optionalFields: false,
        prefix: '',
        suffix: '',
        includeComments: true,
        exportType: 'interface'
      });
    });
  });

  describe('mergeExtractorOptions', () => {
    it('should return defaults when no options provided', () => {
      const result = mergeExtractorOptions();
      expect(result).toEqual(DEFAULT_EXTRACTOR_OPTIONS);
    });

    it('should return defaults when empty object provided', () => {
      const result = mergeExtractorOptions({});
      expect(result).toEqual(DEFAULT_EXTRACTOR_OPTIONS);
    });

    it('should merge partial options with defaults', () => {
      const options: ExtractorOptions = {
        dialect: SQLDialect.MYSQL,
        caseSensitive: true
      };
      const result = mergeExtractorOptions(options);
      expect(result).toEqual({
        dialect: SQLDialect.MYSQL,
        includeComments: true,
        caseSensitive: true
      });
    });

    it('should override all defaults when all options provided', () => {
      const options: ExtractorOptions = {
        dialect: SQLDialect.POSTGRESQL,
        includeComments: false,
        caseSensitive: true
      };
      const result = mergeExtractorOptions(options);
      expect(result).toEqual(options);
    });

    it('should throw error for invalid options', () => {
      const invalidOptions = {
        dialect: 'invalid_dialect' as any,
        includeComments: 'not_boolean' as any
      };
      expect(() => mergeExtractorOptions(invalidOptions)).toThrow();
    });
  });

  describe('mergeGeneratorOptions', () => {
    it('should return defaults when no options provided', () => {
      const result = mergeGeneratorOptions();
      expect(result).toEqual(DEFAULT_GENERATOR_OPTIONS);
    });

    it('should return defaults when empty object provided', () => {
      const result = mergeGeneratorOptions({});
      expect(result).toEqual(DEFAULT_GENERATOR_OPTIONS);
    });

    it('should merge partial options with defaults', () => {
      const options: GeneratorOptions = {
        naming: 'camelCase',
        prefix: 'I',
        optionalFields: true
      };
      const result = mergeGeneratorOptions(options);
      expect(result).toEqual({
        naming: 'camelCase',
        optionalFields: true,
        prefix: 'I',
        suffix: '',
        includeComments: true,
        exportType: 'interface'
      });
    });

    it('should override all defaults when all options provided', () => {
      const options: GeneratorOptions = {
        naming: 'PascalCase',
        optionalFields: true,
        prefix: 'T',
        suffix: 'Type',
        includeComments: false,
        exportType: 'type'
      };
      const result = mergeGeneratorOptions(options);
      expect(result).toEqual(options);
    });

    it('should throw error for invalid options', () => {
      const invalidOptions = {
        naming: 'invalid_naming' as any,
        exportType: 'invalid_export' as any
      };
      expect(() => mergeGeneratorOptions(invalidOptions)).toThrow();
    });
  });

  describe('validateExtractorOptions', () => {
    it('should accept null and undefined options', () => {
      expect(() => validateExtractorOptions(null as any)).not.toThrow();
      expect(() => validateExtractorOptions(undefined as any)).not.toThrow();
    });

    it('should accept valid options', () => {
      const validOptions: ExtractorOptions = {
        dialect: SQLDialect.MYSQL,
        includeComments: true,
        caseSensitive: false
      };
      expect(() => validateExtractorOptions(validOptions)).not.toThrow();
    });

    it('should throw error for non-object options', () => {
      expect(() => validateExtractorOptions('string' as any)).toThrow('Extractor options must be an object');
      expect(() => validateExtractorOptions(123 as any)).toThrow('Extractor options must be an object');
    });

    it('should throw error for invalid dialect', () => {
      const invalidOptions = { dialect: 'invalid' as any };
      expect(() => validateExtractorOptions(invalidOptions)).toThrow('Invalid dialect "invalid"');
    });

    it('should throw error for non-boolean includeComments', () => {
      const invalidOptions = { includeComments: 'yes' as any };
      expect(() => validateExtractorOptions(invalidOptions)).toThrow('includeComments option must be a boolean');
    });

    it('should throw error for non-boolean caseSensitive', () => {
      const invalidOptions = { caseSensitive: 1 as any };
      expect(() => validateExtractorOptions(invalidOptions)).toThrow('caseSensitive option must be a boolean');
    });
  });

  describe('validateGeneratorOptions', () => {
    it('should accept null and undefined options', () => {
      expect(() => validateGeneratorOptions(null as any)).not.toThrow();
      expect(() => validateGeneratorOptions(undefined as any)).not.toThrow();
    });

    it('should accept valid options', () => {
      const validOptions: GeneratorOptions = {
        naming: 'camelCase',
        optionalFields: true,
        prefix: 'I',
        suffix: 'Type',
        includeComments: false,
        exportType: 'type'
      };
      expect(() => validateGeneratorOptions(validOptions)).not.toThrow();
    });

    it('should throw error for non-object options', () => {
      expect(() => validateGeneratorOptions('string' as any)).toThrow('Generator options must be an object');
      expect(() => validateGeneratorOptions(123 as any)).toThrow('Generator options must be an object');
    });

    it('should throw error for invalid naming convention', () => {
      const invalidOptions = { naming: 'invalid' as any };
      expect(() => validateGeneratorOptions(invalidOptions)).toThrow('Invalid naming convention "invalid"');
    });

    it('should throw error for non-boolean optionalFields', () => {
      const invalidOptions = { optionalFields: 'yes' as any };
      expect(() => validateGeneratorOptions(invalidOptions)).toThrow('optionalFields option must be a boolean');
    });

    it('should throw error for non-string prefix', () => {
      const invalidOptions = { prefix: 123 as any };
      expect(() => validateGeneratorOptions(invalidOptions)).toThrow('prefix option must be a string');
    });

    it('should throw error for invalid prefix identifier', () => {
      const invalidOptions = { prefix: '123invalid' };
      expect(() => validateGeneratorOptions(invalidOptions)).toThrow('prefix must be a valid JavaScript identifier');
    });

    it('should throw error for non-string suffix', () => {
      const invalidOptions = { suffix: 123 as any };
      expect(() => validateGeneratorOptions(invalidOptions)).toThrow('suffix option must be a string');
    });

    it('should throw error for invalid suffix identifier', () => {
      const invalidOptions = { suffix: '123-invalid' };
      expect(() => validateGeneratorOptions(invalidOptions)).toThrow('suffix must contain only valid identifier characters');
    });

    it('should throw error for non-boolean includeComments', () => {
      const invalidOptions = { includeComments: 'no' as any };
      expect(() => validateGeneratorOptions(invalidOptions)).toThrow('includeComments option must be a boolean');
    });

    it('should throw error for invalid exportType', () => {
      const invalidOptions = { exportType: 'class' as any };
      expect(() => validateGeneratorOptions(invalidOptions)).toThrow('Invalid exportType "class"');
    });

    it('should accept empty prefix and suffix', () => {
      const validOptions = { prefix: '', suffix: '' };
      expect(() => validateGeneratorOptions(validOptions)).not.toThrow();
    });
  });

  describe('createConfigurationError', () => {
    it('should create error with context', () => {
      const originalError = new Error('Invalid option');
      const configError = createConfigurationError(originalError, 'extractSchemas');
      expect(configError.message).toContain('Configuration error in extractSchemas: Invalid option');
    });

    it('should add dialect suggestions for dialect errors', () => {
      const originalError = new Error('Invalid dialect');
      const configError = createConfigurationError(originalError, 'test');
      expect(configError.message).toContain('Valid dialects: mysql, postgresql, sqlite, auto');
    });

    it('should add naming suggestions for naming errors', () => {
      const originalError = new Error('Invalid naming');
      const configError = createConfigurationError(originalError, 'test');
      expect(configError.message).toContain('Valid naming conventions: camelCase, PascalCase, snake_case, preserve');
    });

    it('should add exportType suggestions for exportType errors', () => {
      const originalError = new Error('Invalid exportType');
      const configError = createConfigurationError(originalError, 'test');
      expect(configError.message).toContain('Valid export types: interface, type');
    });

    it('should add identifier suggestions for prefix/suffix errors', () => {
      const originalError = new Error('Invalid prefix');
      const configError = createConfigurationError(originalError, 'test');
      expect(configError.message).toContain('Prefix and suffix must be valid JavaScript identifiers');
    });
  });

  describe('isValidIdentifier', () => {
    it('should return true for valid identifiers', () => {
      expect(isValidIdentifier('validName')).toBe(true);
      expect(isValidIdentifier('_validName')).toBe(true);
      expect(isValidIdentifier('$validName')).toBe(true);
      expect(isValidIdentifier('valid123')).toBe(true);
      expect(isValidIdentifier('_')).toBe(true);
      expect(isValidIdentifier('$')).toBe(true);
    });

    it('should return false for invalid identifiers', () => {
      expect(isValidIdentifier('')).toBe(false);
      expect(isValidIdentifier('123invalid')).toBe(false);
      expect(isValidIdentifier('invalid-name')).toBe(false);
      expect(isValidIdentifier('invalid name')).toBe(false);
      expect(isValidIdentifier('invalid.name')).toBe(false);
      expect(isValidIdentifier(null as any)).toBe(false);
      expect(isValidIdentifier(undefined as any)).toBe(false);
    });
  });

  describe('sanitizeIdentifier', () => {
    it('should return valid identifiers unchanged', () => {
      expect(sanitizeIdentifier('validName')).toBe('validName');
      expect(sanitizeIdentifier('_validName')).toBe('_validName');
      expect(sanitizeIdentifier('$validName')).toBe('$validName');
    });

    it('should sanitize invalid characters', () => {
      expect(sanitizeIdentifier('invalid-name')).toBe('invalid_name');
      expect(sanitizeIdentifier('invalid name')).toBe('invalid_name');
      expect(sanitizeIdentifier('invalid.name')).toBe('invalid_name');
      expect(sanitizeIdentifier('invalid@name')).toBe('invalid_name');
    });

    it('should fix identifiers starting with numbers', () => {
      expect(sanitizeIdentifier('123invalid')).toBe('_123invalid');
      expect(sanitizeIdentifier('9test')).toBe('_9test');
    });

    it('should remove consecutive underscores', () => {
      expect(sanitizeIdentifier('invalid--name')).toBe('invalid_name');
      expect(sanitizeIdentifier('invalid  name')).toBe('invalid_name');
    });

    it('should remove trailing underscores', () => {
      expect(sanitizeIdentifier('invalid-')).toBe('invalid');
      expect(sanitizeIdentifier('invalid--')).toBe('invalid');
    });

    it('should handle empty or null inputs', () => {
      expect(sanitizeIdentifier('')).toBe('Unknown');
      expect(sanitizeIdentifier(null as any)).toBe('Unknown');
      expect(sanitizeIdentifier(undefined as any)).toBe('Unknown');
    });

    it('should handle edge cases', () => {
      expect(sanitizeIdentifier('---')).toBe('Unknown');
      expect(sanitizeIdentifier('123')).toBe('_123');
      expect(sanitizeIdentifier('   ')).toBe('Unknown');
    });
  });

  describe('getConfigurationSummary', () => {
    it('should generate summary with default options', () => {
      const summary = getConfigurationSummary({}, {});
      expect(summary).toContain('Configuration Summary:');
      expect(summary).toContain('Dialect: auto');
      expect(summary).toContain('Include Comments: true');
      expect(summary).toContain('Case Sensitive: false');
      expect(summary).toContain('Naming Convention: preserve');
      expect(summary).toContain('Optional Fields: false');
      expect(summary).toContain('Prefix: (none)');
      expect(summary).toContain('Suffix: (none)');
      expect(summary).toContain('Export Type: interface');
    });

    it('should generate summary with custom options', () => {
      const extractorOptions: ExtractorOptions = {
        dialect: SQLDialect.MYSQL,
        includeComments: false,
        caseSensitive: true
      };
      const generatorOptions: GeneratorOptions = {
        naming: 'camelCase',
        optionalFields: true,
        prefix: 'I',
        suffix: 'Type',
        includeComments: false,
        exportType: 'type'
      };
      
      const summary = getConfigurationSummary(extractorOptions, generatorOptions);
      expect(summary).toContain('Dialect: mysql');
      expect(summary).toContain('Include Comments: false');
      expect(summary).toContain('Case Sensitive: true');
      expect(summary).toContain('Naming Convention: camelCase');
      expect(summary).toContain('Optional Fields: true');
      expect(summary).toContain('Prefix: I');
      expect(summary).toContain('Suffix: Type');
      expect(summary).toContain('Export Type: type');
    });

    it('should handle partial options', () => {
      const extractorOptions: ExtractorOptions = {
        dialect: SQLDialect.POSTGRESQL
      };
      const generatorOptions: GeneratorOptions = {
        naming: 'PascalCase',
        prefix: 'T'
      };
      
      const summary = getConfigurationSummary(extractorOptions, generatorOptions);
      expect(summary).toContain('Dialect: postgresql');
      expect(summary).toContain('Naming Convention: PascalCase');
      expect(summary).toContain('Prefix: T');
      expect(summary).toContain('Suffix: (none)');
    });
  });

  describe('Advanced configuration utilities', () => {
    describe('validateConfiguration', () => {
      it('should accept valid configuration objects', () => {
        const validConfig = {
          extractorOptions: { dialect: SQLDialect.MYSQL },
          generatorOptions: { naming: 'camelCase' as const }
        };
        expect(() => validateConfiguration(validConfig)).not.toThrow();
      });

      it('should accept empty configuration objects', () => {
        expect(() => validateConfiguration({})).not.toThrow();
      });

      it('should throw error for non-object configuration', () => {
        expect(() => validateConfiguration(null as any)).toThrow('Configuration must be an object');
        expect(() => validateConfiguration('string' as any)).toThrow('Configuration must be an object');
      });

      it('should throw error for invalid extractor options', () => {
        const invalidConfig = {
          extractorOptions: { dialect: 'invalid' as any }
        };
        expect(() => validateConfiguration(invalidConfig)).toThrow();
      });

      it('should throw error for invalid generator options', () => {
        const invalidConfig = {
          generatorOptions: { naming: 'invalid' as any }
        };
        expect(() => validateConfiguration(invalidConfig)).toThrow();
      });
    });

    describe('createConfiguration', () => {
      it('should create configuration with defaults when no options provided', () => {
        const config = createConfiguration();
        expect(config.extractorOptions).toEqual(DEFAULT_EXTRACTOR_OPTIONS);
        expect(config.generatorOptions).toEqual(DEFAULT_GENERATOR_OPTIONS);
      });

      it('should create configuration with merged options', () => {
        const config = createConfiguration({
          extractorOptions: { dialect: SQLDialect.MYSQL },
          generatorOptions: { naming: 'camelCase' }
        });
        
        expect(config.extractorOptions.dialect).toBe(SQLDialect.MYSQL);
        expect(config.extractorOptions.includeComments).toBe(true); // default
        expect(config.generatorOptions.naming).toBe('camelCase');
        expect(config.generatorOptions.exportType).toBe('interface'); // default
      });

      it('should throw error for invalid configuration', () => {
        expect(() => createConfiguration({
          extractorOptions: { dialect: 'invalid' as any }
        })).toThrow();
      });
    });

    describe('areConfigurationsEqual', () => {
      it('should return true for identical configurations', () => {
        const config1 = {
          extractorOptions: { dialect: SQLDialect.MYSQL },
          generatorOptions: { naming: 'camelCase' as const }
        };
        const config2 = {
          extractorOptions: { dialect: SQLDialect.MYSQL },
          generatorOptions: { naming: 'camelCase' as const }
        };
        
        expect(areConfigurationsEqual(config1, config2)).toBe(true);
      });

      it('should return true for configurations that merge to the same result', () => {
        const config1 = {
          extractorOptions: { dialect: SQLDialect.MYSQL, includeComments: true },
          generatorOptions: { naming: 'camelCase' as const }
        };
        const config2 = {
          extractorOptions: { dialect: SQLDialect.MYSQL },
          generatorOptions: { naming: 'camelCase' as const, exportType: 'interface' as const }
        };
        
        expect(areConfigurationsEqual(config1, config2)).toBe(true);
      });

      it('should return false for different configurations', () => {
        const config1 = {
          extractorOptions: { dialect: SQLDialect.MYSQL }
        };
        const config2 = {
          extractorOptions: { dialect: SQLDialect.POSTGRESQL }
        };
        
        expect(areConfigurationsEqual(config1, config2)).toBe(false);
      });

      it('should return false for invalid configurations', () => {
        const validConfig = {
          extractorOptions: { dialect: SQLDialect.MYSQL }
        };
        const invalidConfig = {
          extractorOptions: { dialect: 'invalid' as any }
        };
        
        expect(areConfigurationsEqual(validConfig, invalidConfig)).toBe(false);
      });
    });

    describe('getEffectiveConfiguration', () => {
      it('should return effective configuration with summary', () => {
        const result = getEffectiveConfiguration(
          { dialect: SQLDialect.MYSQL },
          { naming: 'camelCase' }
        );
        
        expect(result.extractorOptions.dialect).toBe(SQLDialect.MYSQL);
        expect(result.generatorOptions.naming).toBe('camelCase');
        expect(result.summary).toContain('Dialect: mysql');
        expect(result.summary).toContain('Naming Convention: camelCase');
      });

      it('should handle undefined options', () => {
        const result = getEffectiveConfiguration();
        
        expect(result.extractorOptions).toEqual(DEFAULT_EXTRACTOR_OPTIONS);
        expect(result.generatorOptions).toEqual(DEFAULT_GENERATOR_OPTIONS);
        expect(result.summary).toContain('Configuration Summary:');
      });
    });
  });

  describe('Edge cases and error scenarios', () => {
    it('should handle configuration validation with comprehensive error messages', () => {
      // Test comprehensive error handling for extractor options
      expect(() => {
        mergeExtractorOptions({
          dialect: 'invalid' as any,
          includeComments: 'yes' as any,
          caseSensitive: 123 as any
        });
      }).toThrow();

      // Test comprehensive error handling for generator options
      expect(() => {
        mergeGeneratorOptions({
          naming: 'invalid' as any,
          optionalFields: 'yes' as any,
          prefix: '123invalid',
          suffix: 'invalid-suffix',
          includeComments: 'no' as any,
          exportType: 'class' as any
        });
      }).toThrow();
    });

    it('should provide sensible defaults when options are invalid', () => {
      // The validation should catch invalid options and throw errors
      // rather than providing defaults for invalid values
      expect(() => mergeExtractorOptions({ dialect: 'invalid' as any })).toThrow();
      expect(() => mergeGeneratorOptions({ naming: 'invalid' as any })).toThrow();
    });

    it('should handle complex identifier sanitization scenarios', () => {
      expect(sanitizeIdentifier('complex-name.with@special#chars')).toBe('complex_name_with_special_chars');
      expect(sanitizeIdentifier('123-complex-name')).toBe('_123_complex_name');
      expect(sanitizeIdentifier('___multiple___underscores___')).toBe('_multiple_underscores');
    });
  });
});