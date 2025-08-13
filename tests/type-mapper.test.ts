import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TypeMapper, TypeMapperOptions } from '../src/generator/type-mapper.js';
import { SQLDialect, TypeMappingError } from '../src/types/index.js';

describe('TypeMapper', () => {
  let typeMapper: TypeMapper;

  beforeEach(() => {
    typeMapper = new TypeMapper();
    // Mock console.warn to avoid noise in tests
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('MySQL type mapping', () => {
    it('should map basic MySQL types correctly', () => {
      expect(typeMapper.mapType('INT', SQLDialect.MYSQL)).toBe('number');
      expect(typeMapper.mapType('VARCHAR', SQLDialect.MYSQL)).toBe('string');
      expect(typeMapper.mapType('DATETIME', SQLDialect.MYSQL)).toBe('Date');
      expect(typeMapper.mapType('BOOLEAN', SQLDialect.MYSQL)).toBe('boolean');
      expect(typeMapper.mapType('JSON', SQLDialect.MYSQL)).toBe('object');
      expect(typeMapper.mapType('BLOB', SQLDialect.MYSQL)).toBe('Buffer');
    });

    it('should handle MySQL types with size specifications', () => {
      expect(typeMapper.mapType('VARCHAR(255)', SQLDialect.MYSQL)).toBe('string');
      expect(typeMapper.mapType('INT(11)', SQLDialect.MYSQL)).toBe('number');
      expect(typeMapper.mapType('DECIMAL(10,2)', SQLDialect.MYSQL)).toBe('number');
    });

    it('should handle MySQL TINYINT(1) as boolean', () => {
      expect(typeMapper.mapType('TINYINT(1)', SQLDialect.MYSQL)).toBe('boolean');
      expect(typeMapper.mapType('TINYINT', SQLDialect.MYSQL)).toBe('number');
    });

    it('should handle case insensitive MySQL types', () => {
      expect(typeMapper.mapType('varchar', SQLDialect.MYSQL)).toBe('string');
      expect(typeMapper.mapType('INT', SQLDialect.MYSQL)).toBe('number');
      expect(typeMapper.mapType('DateTime', SQLDialect.MYSQL)).toBe('Date');
    });

    it('should handle MySQL types with UNSIGNED/SIGNED', () => {
      expect(typeMapper.mapType('INT UNSIGNED', SQLDialect.MYSQL)).toBe('number');
      expect(typeMapper.mapType('BIGINT SIGNED', SQLDialect.MYSQL)).toBe('number');
    });
  });

  describe('PostgreSQL type mapping', () => {
    it('should map basic PostgreSQL types correctly', () => {
      expect(typeMapper.mapType('INTEGER', SQLDialect.POSTGRESQL)).toBe('number');
      expect(typeMapper.mapType('TEXT', SQLDialect.POSTGRESQL)).toBe('string');
      expect(typeMapper.mapType('TIMESTAMP', SQLDialect.POSTGRESQL)).toBe('Date');
      expect(typeMapper.mapType('BOOLEAN', SQLDialect.POSTGRESQL)).toBe('boolean');
      expect(typeMapper.mapType('JSON', SQLDialect.POSTGRESQL)).toBe('object');
      expect(typeMapper.mapType('BYTEA', SQLDialect.POSTGRESQL)).toBe('Buffer');
    });

    it('should handle PostgreSQL aliases', () => {
      expect(typeMapper.mapType('INT4', SQLDialect.POSTGRESQL)).toBe('number');
      expect(typeMapper.mapType('INT8', SQLDialect.POSTGRESQL)).toBe('number');
      expect(typeMapper.mapType('FLOAT4', SQLDialect.POSTGRESQL)).toBe('number');
      expect(typeMapper.mapType('FLOAT8', SQLDialect.POSTGRESQL)).toBe('number');
      expect(typeMapper.mapType('BOOL', SQLDialect.POSTGRESQL)).toBe('boolean');
    });

    it('should handle PostgreSQL compound types', () => {
      expect(typeMapper.mapType('CHARACTER VARYING', SQLDialect.POSTGRESQL)).toBe('string');
      expect(typeMapper.mapType('DOUBLE PRECISION', SQLDialect.POSTGRESQL)).toBe('number');
      expect(typeMapper.mapType('TIMESTAMP WITH TIME ZONE', SQLDialect.POSTGRESQL)).toBe('Date');
      expect(typeMapper.mapType('TIME WITHOUT TIME ZONE', SQLDialect.POSTGRESQL)).toBe('string');
    });

    it('should handle PostgreSQL serial types', () => {
      expect(typeMapper.mapType('SERIAL', SQLDialect.POSTGRESQL)).toBe('number');
      expect(typeMapper.mapType('BIGSERIAL', SQLDialect.POSTGRESQL)).toBe('number');
      expect(typeMapper.mapType('SMALLSERIAL', SQLDialect.POSTGRESQL)).toBe('number');
    });
  });

  describe('SQLite type mapping', () => {
    it('should map basic SQLite types correctly', () => {
      expect(typeMapper.mapType('INTEGER', SQLDialect.SQLITE)).toBe('number');
      expect(typeMapper.mapType('TEXT', SQLDialect.SQLITE)).toBe('string');
      expect(typeMapper.mapType('REAL', SQLDialect.SQLITE)).toBe('number');
      expect(typeMapper.mapType('BLOB', SQLDialect.SQLITE)).toBe('Buffer');
    });

    it('should handle SQLite type affinity', () => {
      expect(typeMapper.mapType('VARCHAR', SQLDialect.SQLITE)).toBe('string');
      expect(typeMapper.mapType('INT', SQLDialect.SQLITE)).toBe('number');
      expect(typeMapper.mapType('DATETIME', SQLDialect.SQLITE)).toBe('Date');
    });
  });

  describe('Error handling and fallbacks', () => {
    it('should return "any" for unrecognized types', () => {
      expect(typeMapper.mapType('UNKNOWN_TYPE', SQLDialect.MYSQL)).toBe('any');
      expect(typeMapper.mapType('CUSTOM_TYPE', SQLDialect.POSTGRESQL)).toBe('any');
    });

    it('should warn for unrecognized types', () => {
      const consoleSpy = vi.spyOn(console, 'warn');
      typeMapper.mapType('UNKNOWN_TYPE', SQLDialect.MYSQL);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Unrecognized SQL type "UNKNOWN_TYPE" for dialect "mysql", defaulting to "any"'
      );
    });

    it('should handle empty or null types', () => {
      expect(typeMapper.mapType('', SQLDialect.MYSQL)).toBe('any');
      expect(typeMapper.mapType('   ', SQLDialect.MYSQL)).toBe('any');
    });

    it('should fallback to MySQL for unsupported dialects', () => {
      const consoleSpy = vi.spyOn(console, 'warn');
      // @ts-ignore - Testing invalid dialect
      expect(typeMapper.mapType('INT', 'invalid_dialect')).toBe('number');
      expect(consoleSpy).toHaveBeenCalledWith(
        'Unsupported dialect "invalid_dialect", defaulting to MySQL mappings'
      );
    });

    it('should default to MySQL dialect when none specified', () => {
      expect(typeMapper.mapType('INT')).toBe('number');
      expect(typeMapper.mapType('VARCHAR')).toBe('string');
    });
  });

  describe('Dialect detection', () => {
    it('should detect MySQL dialect', () => {
      const mysqlSQL = `
        CREATE TABLE users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255),
          created_at TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `;
      expect(TypeMapper.detectDialect(mysqlSQL)).toBe(SQLDialect.MYSQL);
    });

    it('should detect PostgreSQL dialect', () => {
      const postgresSQL = `
        CREATE TABLE users (
          id SERIAL PRIMARY KEY,
          name CHARACTER VARYING(255),
          created_at TIMESTAMPTZ,
          data JSONB
        );
      `;
      expect(TypeMapper.detectDialect(postgresSQL)).toBe(SQLDialect.POSTGRESQL);
    });

    it('should detect SQLite dialect', () => {
      const sqliteSQL = `
        CREATE TABLE users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT,
          created_at DATETIME
        ) WITHOUT ROWID;
      `;
      expect(TypeMapper.detectDialect(sqliteSQL)).toBe(SQLDialect.SQLITE);
    });

    it('should default to MySQL for ambiguous SQL', () => {
      const ambiguousSQL = `
        CREATE TABLE users (
          id INTEGER PRIMARY KEY,
          name TEXT
        );
      `;
      expect(TypeMapper.detectDialect(ambiguousSQL)).toBe(SQLDialect.MYSQL);
    });
  });

  describe('Custom type mappings', () => {
    it('should support custom type mappings', () => {
      const customMapper = new TypeMapper({
        customMappings: {
          mysql: {
            'custom_type': 'CustomType'
          }
        }
      });

      expect(customMapper.mapType('CUSTOM_TYPE', SQLDialect.MYSQL)).toBe('CustomType');
    });

    it('should allow adding custom mappings dynamically', () => {
      typeMapper.addCustomMapping(SQLDialect.MYSQL, 'dynamic_type', 'DynamicType');
      expect(typeMapper.mapType('DYNAMIC_TYPE', SQLDialect.MYSQL)).toBe('DynamicType');
    });

    it('should allow removing custom mappings', () => {
      typeMapper.addCustomMapping(SQLDialect.MYSQL, 'temp_type', 'TempType');
      expect(typeMapper.mapType('TEMP_TYPE', SQLDialect.MYSQL)).toBe('TempType');
      
      typeMapper.removeCustomMapping(SQLDialect.MYSQL, 'temp_type');
      expect(typeMapper.mapType('TEMP_TYPE', SQLDialect.MYSQL)).toBe('any');
    });

    it('should get custom mappings for a dialect', () => {
      typeMapper.addCustomMapping(SQLDialect.MYSQL, 'test_type', 'TestType');
      const customMappings = typeMapper.getCustomMappings(SQLDialect.MYSQL);
      expect(customMappings['test_type']).toBe('TestType');
    });

    it('should clear all custom mappings for a dialect', () => {
      typeMapper.addCustomMapping(SQLDialect.MYSQL, 'test1', 'Test1');
      typeMapper.addCustomMapping(SQLDialect.MYSQL, 'test2', 'Test2');
      
      typeMapper.clearCustomMappings(SQLDialect.MYSQL);
      expect(typeMapper.getCustomMappings(SQLDialect.MYSQL)).toEqual({});
    });

    it('should override default mappings with custom ones', () => {
      const customMapper = new TypeMapper({
        customMappings: {
          mysql: {
            'int': 'bigint' // Override default number mapping
          }
        }
      });

      expect(customMapper.mapType('INT', SQLDialect.MYSQL)).toBe('bigint');
    });
  });

  describe('Strict mode', () => {
    it('should throw errors in strict mode for unknown types', () => {
      const strictMapper = new TypeMapper({ strictMode: true });
      
      expect(() => {
        strictMapper.mapType('UNKNOWN_TYPE', SQLDialect.MYSQL);
      }).toThrow(TypeMappingError);
    });

    it('should throw errors in strict mode for unsupported dialects', () => {
      const strictMapper = new TypeMapper({ strictMode: true });
      
      expect(() => {
        // @ts-ignore - Testing invalid dialect
        strictMapper.mapType('INT', 'invalid_dialect');
      }).toThrow(TypeMappingError);
    });
  });

  describe('Special dialect-specific cases', () => {
    it('should handle MySQL ENUM types', () => {
      expect(typeMapper.mapType("ENUM('small', 'medium', 'large')", SQLDialect.MYSQL)).toBe('string');
    });

    it('should handle MySQL SET types', () => {
      expect(typeMapper.mapType("SET('red', 'green', 'blue')", SQLDialect.MYSQL)).toBe('string');
    });

    it('should handle PostgreSQL array types', () => {
      expect(typeMapper.mapType('INTEGER[]', SQLDialect.POSTGRESQL)).toBe('number[]');
      expect(typeMapper.mapType('TEXT[]', SQLDialect.POSTGRESQL)).toBe('string[]');
    });

    it('should handle PostgreSQL ENUM types', () => {
      expect(typeMapper.mapType("ENUM('active', 'inactive')", SQLDialect.POSTGRESQL)).toBe('string');
    });

    it('should handle SQLite flexible integer types', () => {
      expect(typeMapper.mapType('BIGINT', SQLDialect.SQLITE)).toBe('number');
      expect(typeMapper.mapType('SMALLINT', SQLDialect.SQLITE)).toBe('number');
    });
  });

  describe('Utility methods', () => {
    it('should return supported types for each dialect', () => {
      const mysqlTypes = typeMapper.getSupportedTypes(SQLDialect.MYSQL);
      const postgresTypes = typeMapper.getSupportedTypes(SQLDialect.POSTGRESQL);
      const sqliteTypes = typeMapper.getSupportedTypes(SQLDialect.SQLITE);

      expect(mysqlTypes).toContain('int');
      expect(mysqlTypes).toContain('varchar');
      expect(postgresTypes).toContain('integer');
      expect(postgresTypes).toContain('text');
      expect(sqliteTypes).toContain('integer');
      expect(sqliteTypes).toContain('text');
    });

    it('should check if types are supported', () => {
      expect(typeMapper.isTypeSupported('INT', SQLDialect.MYSQL)).toBe(true);
      expect(typeMapper.isTypeSupported('VARCHAR(255)', SQLDialect.MYSQL)).toBe(true);
      expect(typeMapper.isTypeSupported('UNKNOWN_TYPE', SQLDialect.MYSQL)).toBe(false);
      
      expect(typeMapper.isTypeSupported('INTEGER', SQLDialect.POSTGRESQL)).toBe(true);
      expect(typeMapper.isTypeSupported('DOUBLE PRECISION', SQLDialect.POSTGRESQL)).toBe(true);
      
      expect(typeMapper.isTypeSupported('TEXT', SQLDialect.SQLITE)).toBe(true);
      expect(typeMapper.isTypeSupported('REAL', SQLDialect.SQLITE)).toBe(true);
    });

    it('should get default mappings', () => {
      const defaultMysqlMappings = TypeMapper.getDefaultMappings(SQLDialect.MYSQL);
      expect(defaultMysqlMappings['int']).toBe('number');
      expect(defaultMysqlMappings['varchar']).toBe('string');
    });
  });
});