/**
 * Integration tests for configuration handling
 */

import { describe, it, expect } from 'vitest';
import { 
  extractSchemas, 
  generateTypes, 
  extractAndGenerate,
  getEffectiveConfiguration,
  createConfiguration,
  SQLDialect 
} from '../src/index.js';

describe('Configuration Integration Tests', () => {
  const sampleSQL = `
    CREATE TABLE users (
      id INT PRIMARY KEY AUTO_INCREMENT,
      user_name VARCHAR(255) NOT NULL,
      email_address VARCHAR(255) UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      is_active BOOLEAN DEFAULT TRUE
    );
  `;

  describe('End-to-end configuration usage', () => {
    it('should work with default configuration', () => {
      const schemas = extractSchemas(sampleSQL);
      expect(schemas).toHaveLength(1);
      expect(schemas[0].name).toBe('users');

      const typescript = generateTypes(schemas);
      expect(typescript).toContain('export interface users');
      expect(typescript).toContain('user_name: string;');
    });

    it('should work with custom extractor options', () => {
      const schemas = extractSchemas(sampleSQL, {
        dialect: SQLDialect.MYSQL,
        includeComments: false,
        caseSensitive: true
      });
      
      expect(schemas).toHaveLength(1);
      expect(schemas[0].name).toBe('users');
    });

    it('should work with custom generator options', () => {
      const schemas = extractSchemas(sampleSQL);
      const typescript = generateTypes(schemas, {
        naming: 'camelCase',
        prefix: 'I',
        suffix: 'Entity',
        exportType: 'type'
      });

      expect(typescript).toContain('export type IUsersEntity');
      expect(typescript).toContain('userName: string;');
      expect(typescript).toContain('emailAddress: string');
      expect(typescript).toContain('createdAt?: Date');
      expect(typescript).toContain('isActive?: boolean');
    });

    it('should work with extractAndGenerate convenience function', () => {
      const typescript = extractAndGenerate(
        sampleSQL,
        { dialect: SQLDialect.MYSQL },
        { naming: 'PascalCase', exportType: 'interface' }
      );

      expect(typescript).toContain('export interface Users');
      expect(typescript).toContain('UserName: string;');
      expect(typescript).toContain('EmailAddress: string');
    });

    it('should handle invalid configuration gracefully', () => {
      expect(() => {
        extractSchemas(sampleSQL, { dialect: 'invalid' as any });
      }).toThrow();

      expect(() => {
        const schemas = extractSchemas(sampleSQL);
        generateTypes(schemas, { naming: 'invalid' as any });
      }).toThrow();
    });
  });

  describe('Configuration utilities integration', () => {
    it('should provide effective configuration preview', () => {
      const effective = getEffectiveConfiguration(
        { dialect: SQLDialect.POSTGRESQL },
        { naming: 'camelCase', prefix: 'T' }
      );

      expect(effective.extractorOptions.dialect).toBe(SQLDialect.POSTGRESQL);
      expect(effective.generatorOptions.naming).toBe('camelCase');
      expect(effective.generatorOptions.prefix).toBe('T');
      expect(effective.summary).toContain('Dialect: postgresql');
      expect(effective.summary).toContain('Naming Convention: camelCase');
      expect(effective.summary).toContain('Prefix: T');
    });

    it('should create complete configuration objects', () => {
      const config = createConfiguration({
        extractorOptions: { dialect: SQLDialect.SQLITE },
        generatorOptions: { naming: 'snake_case', optionalFields: true }
      });

      // Use the configuration with the API
      const schemas = extractSchemas(sampleSQL, config.extractorOptions);
      const typescript = generateTypes(schemas, config.generatorOptions);

      expect(typescript).toContain('user_name?: string;');
      expect(typescript).toContain('email_address?: string');
      expect(typescript).toContain('created_at?: Date');
      expect(typescript).toContain('is_active?: boolean');
    });

    it('should handle configuration validation in real usage', () => {
      // This should work fine
      expect(() => {
        const config = createConfiguration({
          extractorOptions: { dialect: SQLDialect.MYSQL, includeComments: true },
          generatorOptions: { naming: 'camelCase', exportType: 'type' }
        });
        
        const schemas = extractSchemas(sampleSQL, config.extractorOptions);
        generateTypes(schemas, config.generatorOptions);
      }).not.toThrow();

      // This should fail validation
      expect(() => {
        createConfiguration({
          extractorOptions: { dialect: 'invalid' as any }
        });
      }).toThrow();
    });
  });

  describe('Error handling with configuration context', () => {
    it('should provide helpful error messages for configuration issues', () => {
      try {
        extractSchemas(sampleSQL, { dialect: 'invalid_dialect' as any });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Configuration error');
        expect((error as Error).message).toContain('extractSchemas');
        expect((error as Error).message).toContain('Valid dialects');
      }
    });

    it('should provide helpful error messages for generator configuration issues', () => {
      try {
        const schemas = extractSchemas(sampleSQL);
        generateTypes(schemas, { naming: 'invalid_naming' as any });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Configuration error');
        expect((error as Error).message).toContain('generateTypes');
        expect((error as Error).message).toContain('Valid naming conventions');
      }
    });
  });
});