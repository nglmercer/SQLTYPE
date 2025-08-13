import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TypeMapper, TypeMapperOptions } from '../src/generator/type-mapper.js';
import { SQLDialect, TypeMappingError } from '../src/types/index.js';

describe('TypeMapper - Comprehensive Tests', () => {
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
    it('should map all basic MySQL types correctly', () => {
      const mysqlTypes = [
        { sql: 'INT', ts: 'number' },
        { sql: 'BIGINT', ts: 'number' },
        { sql: 'TINYINT', ts: 'number' },
        { sql: 'SMALLINT', ts: 'number' },
        { sql: 'MEDIUMINT', ts: 'number' },
        { sql: 'FLOAT', ts: 'number' },
        { sql: 'DOUBLE', ts: 'number' },
        { sql: 'DECIMAL', ts: 'number' },
        { sql: 'NUMERIC', ts: 'number' },
        { sql: 'VARCHAR', ts: 'string' },
        { sql: 'CHAR', ts: 'string' },
        { sql: 'TEXT', ts: 'string' },
        { sql: 'LONGTEXT', ts: 'string' },
        { sql: 'MEDIUMTEXT', ts: 'string' },
        { sql: 'TINYTEXT', ts: 'string' },
        { sql: 'DATETIME', ts: 'Date' },
        { sql: 'TIMESTAMP', ts: 'Date' },
        { sql: 'DATE', ts: 'Date' },
        { sql: 'TIME', ts: 'string' },
        { sql: 'YEAR', ts: 'number' },
        { sql: 'BOOLEAN', ts: 'boolean' },
        { sql: 'BIT', ts: 'boolean' },
        { sql: 'JSON', ts: 'object' },
        { sql: 'BLOB', ts: 'Buffer' },
        { sql: 'LONGBLOB', ts: 'Buffer' },
        { sql: 'MEDIUMBLOB', ts: 'Buffer' },
        { sql: 'TINYBLOB', ts: 'Buffer' },
        { sql: 'BINARY', ts: 'Buffer' },
        { sql: 'VARBINARY', ts: 'Buffer' }
      ];

      mysqlTypes.forEach(({ sql, ts }) => {
        expect(typeMapper.mapType(sql, SQLDialect.MYSQL)).toBe(ts);
      });
    });

    it('should handle MySQL types with size specifications', () => {
      const typesWithSizes = [
        { sql: 'VARCHAR(255)', ts: 'string' },
        { sql: 'CHAR(10)', ts: 'string' },
        { sql: 'INT(11)', ts: 'number' },
        { sql: 'DECIMAL(10,2)', ts: 'number' },
        { sql: 'FLOAT(7,4)', ts: 'number' },
        { sql: 'BIT(8)', ts: 'boolean' },
        { sql: 'YEAR(4)', ts: 'number' }
      ];

      typesWithSizes.forEach(({ sql, ts }) => {
        expect(typeMapper.mapType(sql, SQLDialect.MYSQL)).toBe(ts);
      });
    });

    it('should handle MySQL TINYINT(1) as boolean', () => {
      expect(typeMapper.mapType('TINYINT(1)', SQLDialect.MYSQL)).toBe('boolean');
      expect(typeMapper.mapType('TINYINT', SQLDialect.MYSQL)).toBe('number');
      expect(typeMapper.mapType('TINYINT(2)', SQLDialect.MYSQL)).toBe('number');
    });

    it('should handle MySQL UNSIGNED/SIGNED modifiers', () => {
      const modifiedTypes = [
        { sql: 'INT UNSIGNED', ts: 'number' },
        { sql: 'BIGINT SIGNED', ts: 'number' },
        { sql: 'DECIMAL(10,2) UNSIGNED', ts: 'number' },
        { sql: 'FLOAT UNSIGNED', ts: 'number' }
      ];

      modifiedTypes.forEach(({ sql, ts }) => {
        expect(typeMapper.mapType(sql, SQLDialect.MYSQL)).toBe(ts);
      });
    });

    it('should handle MySQL ENUM and SET types', () => {
      expect(typeMapper.mapType("ENUM('small', 'medium', 'large')", SQLDialect.MYSQL)).toBe('string');
      expect(typeMapper.mapType("SET('red', 'green', 'blue')", SQLDialect.MYSQL)).toBe('string');
    });

    it('should handle case insensitive MySQL types', () => {
      const caseVariations = [
        { sql: 'varchar', ts: 'string' },
        { sql: 'INT', ts: 'number' },
        { sql: 'DateTime', ts: 'Date' },
        { sql: 'BOOLEAN', ts: 'boolean' },
        { sql: 'json', ts: 'object' }
      ];

      caseVariations.forEach(({ sql, ts }) => {
        expect(typeMapper.mapType(sql, SQLDialect.MYSQL)).toBe(ts);
      });
    });
  });

  describe('PostgreSQL type mapping', () => {
    it('should map all basic PostgreSQL types correctly', () => {
      const postgresTypes = [
        { sql: 'INTEGER', ts: 'number' },
        { sql: 'INT', ts: 'number' },
        { sql: 'INT4', ts: 'number' },
        { sql: 'BIGINT', ts: 'number' },
        { sql: 'INT8', ts: 'number' },
        { sql: 'SMALLINT', ts: 'number' },
        { sql: 'INT2', ts: 'number' },
        { sql: 'REAL', ts: 'number' },
        { sql: 'FLOAT4', ts: 'number' },
        { sql: 'DOUBLE PRECISION', ts: 'number' },
        { sql: 'FLOAT8', ts: 'number' },
        { sql: 'NUMERIC', ts: 'number' },
        { sql: 'DECIMAL', ts: 'number' },
        { sql: 'VARCHAR', ts: 'string' },
        { sql: 'CHARACTER VARYING', ts: 'string' },
        { sql: 'CHAR', ts: 'string' },
        { sql: 'CHARACTER', ts: 'string' },
        { sql: 'TEXT', ts: 'string' },
        { sql: 'TIMESTAMP', ts: 'Date' },
        { sql: 'TIMESTAMPTZ', ts: 'Date' },
        { sql: 'TIMESTAMP WITH TIME ZONE', ts: 'Date' },
        { sql: 'TIMESTAMP WITHOUT TIME ZONE', ts: 'Date' },
        { sql: 'DATE', ts: 'Date' },
        { sql: 'TIME', ts: 'string' },
        { sql: 'TIMETZ', ts: 'string' },
        { sql: 'TIME WITH TIME ZONE', ts: 'string' },
        { sql: 'TIME WITHOUT TIME ZONE', ts: 'string' },
        { sql: 'BOOLEAN', ts: 'boolean' },
        { sql: 'BOOL', ts: 'boolean' },
        { sql: 'JSON', ts: 'object' },
        { sql: 'JSONB', ts: 'object' },
        { sql: 'UUID', ts: 'string' },
        { sql: 'BYTEA', ts: 'Buffer' },
        { sql: 'SERIAL', ts: 'number' },
        { sql: 'BIGSERIAL', ts: 'number' },
        { sql: 'SMALLSERIAL', ts: 'number' }
      ];

      postgresTypes.forEach(({ sql, ts }) => {
        expect(typeMapper.mapType(sql, SQLDialect.POSTGRESQL)).toBe(ts);
      });
    });

    it('should handle PostgreSQL array types', () => {
      const arrayTypes = [
        { sql: 'INTEGER[]', ts: 'number[]' },
        { sql: 'TEXT[]', ts: 'string[]' },
        { sql: 'BOOLEAN[]', ts: 'boolean[]' },
        { sql: 'TIMESTAMP[]', ts: 'Date[]' }
      ];

      arrayTypes.forEach(({ sql, ts }) => {
        expect(typeMapper.mapType(sql, SQLDialect.POSTGRESQL)).toBe(ts);
      });
    });

    it('should handle PostgreSQL compound types', () => {
      const compoundTypes = [
        { sql: 'CHARACTER VARYING(255)', ts: 'string' },
        { sql: 'DOUBLE PRECISION', ts: 'number' },
        { sql: 'TIMESTAMP WITH TIME ZONE', ts: 'Date' },
        { sql: 'TIME WITHOUT TIME ZONE', ts: 'string' }
      ];

      compoundTypes.forEach(({ sql, ts }) => {
        expect(typeMapper.mapType(sql, SQLDialect.POSTGRESQL)).toBe(ts);
      });
    });

    it('should handle PostgreSQL ENUM types', () => {
      expect(typeMapper.mapType("ENUM('active', 'inactive')", SQLDialect.POSTGRESQL)).toBe('string');
    });
  });

  describe('SQLite type mapping', () => {
    it('should map all basic SQLite types correctly', () => {
      const sqliteTypes = [
        { sql: 'INTEGER', ts: 'number' },
        { sql: 'INT', ts: 'number' },
        { sql: 'REAL', ts: 'number' },
        { sql: 'FLOAT', ts: 'number' },
        { sql: 'DOUBLE', ts: 'number' },
        { sql: 'TEXT', ts: 'string' },
        { sql: 'VARCHAR', ts: 'string' },
        { sql: 'CHAR', ts: 'string' },
        { sql: 'BLOB', ts: 'Buffer' },
        { sql: 'NUMERIC', ts: 'number' },
        { sql: 'DECIMAL', ts: 'number' },
        { sql: 'BOOLEAN', ts: 'boolean' },
        { sql: 'DATETIME', ts: 'Date' },
        { sql: 'TIMESTAMP', ts: 'Date' },
        { sql: 'DATE', ts: 'Date' },
        { sql: 'TIME', ts: 'string' }
      ];

      sqliteTypes.forEach(({ sql, ts }) => {
        expect(typeMapper.mapType(sql, SQLDialect.SQLITE)).toBe(ts);
      });
    });

    it('should handle SQLite type affinity', () => {
      // SQLite is flexible with types, so various integer types should map to number
      const integerTypes = ['BIGINT', 'SMALLINT', 'MEDIUMINT', 'TINYINT'];
      integerTypes.forEach(type => {
        expect(typeMapper.mapType(type, SQLDialect.SQLITE)).toBe('number');
      });
    });
  });

  describe('Dialect detection', () => {
    it('should detect MySQL dialect from SQL content', () => {
      const mysqlSQL = `
        CREATE TABLE users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255),
          status TINYINT(1),
          created_at TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `;
      expect(TypeMapper.detectDialect(mysqlSQL)).toBe(SQLDialect.MYSQL);
    });

    it('should detect PostgreSQL dialect from SQL content', () => {
      const postgresSQL = `
        CREATE TABLE users (
          id SERIAL PRIMARY KEY,
          name CHARACTER VARYING(255),
          created_at TIMESTAMPTZ,
          data JSONB,
          uuid_field UUID
        );
      `;
      expect(TypeMapper.detectDialect(postgresSQL)).toBe(SQLDialect.POSTGRESQL);
    });

    it('should detect SQLite dialect from SQL content', () => {
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

    it('should handle multiple dialect indicators', () => {
      // When multiple indicators are present, should pick the most specific
      const mixedSQL = `
        CREATE TABLE users (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255),
          data JSONB
        ) ENGINE=InnoDB;
      `;
      // PostgreSQL indicators (SERIAL, JSONB) should take precedence
      expect(TypeMapper.detectDialect(mixedSQL)).toBe(SQLDialect.POSTGRESQL);
    });
  });

  describe('Error handling and fallbacks', () => {
    it('should return "any" for unrecognized types', () => {
      expect(typeMapper.mapType('UNKNOWN_TYPE', SQLDialect.MYSQL)).toBe('any');
      expect(typeMapper.mapType('CUSTOM_TYPE', SQLDialect.POSTGRESQL)).toBe('any');
      expect(typeMapper.mapType('WEIRD_TYPE', SQLDialect.SQLITE)).toBe('any');
    });

    it('should warn for unrecognized types', () => {
      const consoleSpy = vi.spyOn(console, 'warn');
      typeMapper.mapType('UNKNOWN_TYPE', SQLDialect.MYSQL);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Unrecognized SQL type "UNKNOWN_TYPE" for dialect "mysql", defaulting to "any"'
      );
    });

    it('should handle empty or whitespace-only types', () => {
      expect(typeMapper.mapType('', SQLDialect.MYSQL)).toBe('any');
      expect(typeMapper.mapType('   ', SQLDialect.MYSQL)).toBe('any');
      expect(typeMapper.mapType('\t\n', SQLDialect.MYSQL)).toBe('any');
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
      expect(typeMapper.mapType('DATETIME')).toBe('Date');
    });

    it('should handle AUTO dialect', () => {
      expect(typeMapper.mapType('INT', SQLDialect.AUTO)).toBe('number');
      expect(typeMapper.mapType('VARCHAR', SQLDialect.AUTO)).toBe('string');
    });
  });

  describe('Custom type mappings', () => {
    it('should support custom type mappings in constructor', () => {
      const customMapper = new TypeMapper({
        customMappings: {
          mysql: {
            'custom_type': 'CustomType',
            'special_int': 'bigint'
          }
        }
      });

      expect(customMapper.mapType('CUSTOM_TYPE', SQLDialect.MYSQL)).toBe('CustomType');
      expect(customMapper.mapType('SPECIAL_INT', SQLDialect.MYSQL)).toBe('bigint');
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

    it('should handle custom mappings for multiple dialects', () => {
      typeMapper.addCustomMapping(SQLDialect.MYSQL, 'custom_type', 'MySQLCustom');
      typeMapper.addCustomMapping(SQLDialect.POSTGRESQL, 'custom_type', 'PostgreSQLCustom');
      typeMapper.addCustomMapping(SQLDialect.SQLITE, 'custom_type', 'SQLiteCustom');

      expect(typeMapper.mapType('CUSTOM_TYPE', SQLDialect.MYSQL)).toBe('MySQLCustom');
      expect(typeMapper.mapType('CUSTOM_TYPE', SQLDialect.POSTGRESQL)).toBe('PostgreSQLCustom');
      expect(typeMapper.mapType('CUSTOM_TYPE', SQLDialect.SQLITE)).toBe('SQLiteCustom');
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

    it('should include helpful information in strict mode errors', () => {
      const strictMapper = new TypeMapper({ strictMode: true });
      
      try {
        strictMapper.mapType('UNKNOWN_TYPE', SQLDialect.MYSQL);
      } catch (error) {
        expect(error).toBeInstanceOf(TypeMappingError);
        expect((error as TypeMappingError).message).toContain('UNKNOWN_TYPE');
        expect((error as TypeMappingError).sqlType).toBe('UNKNOWN_TYPE');
        expect((error as TypeMappingError).dialect).toBe('mysql');
      }
    });
  });

  describe('Utility methods', () => {
    it('should return supported types for each dialect', () => {
      const mysqlTypes = typeMapper.getSupportedTypes(SQLDialect.MYSQL);
      const postgresTypes = typeMapper.getSupportedTypes(SQLDialect.POSTGRESQL);
      const sqliteTypes = typeMapper.getSupportedTypes(SQLDialect.SQLITE);

      expect(mysqlTypes).toContain('int');
      expect(mysqlTypes).toContain('varchar');
      expect(mysqlTypes).toContain('datetime');
      
      expect(postgresTypes).toContain('integer');
      expect(postgresTypes).toContain('text');
      expect(postgresTypes).toContain('timestamp');
      
      expect(sqliteTypes).toContain('integer');
      expect(sqliteTypes).toContain('text');
      expect(sqliteTypes).toContain('real');
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

    it('should get default mappings for each dialect', () => {
      const defaultMysqlMappings = TypeMapper.getDefaultMappings(SQLDialect.MYSQL);
      const defaultPostgresMappings = TypeMapper.getDefaultMappings(SQLDialect.POSTGRESQL);
      const defaultSqliteMappings = TypeMapper.getDefaultMappings(SQLDialect.SQLITE);

      expect(defaultMysqlMappings['int']).toBe('number');
      expect(defaultMysqlMappings['varchar']).toBe('string');
      
      expect(defaultPostgresMappings['integer']).toBe('number');
      expect(defaultPostgresMappings['text']).toBe('string');
      
      expect(defaultSqliteMappings['integer']).toBe('number');
      expect(defaultSqliteMappings['text']).toBe('string');
    });

    it('should handle AUTO dialect in utility methods', () => {
      const autoTypes = typeMapper.getSupportedTypes(SQLDialect.AUTO);
      expect(autoTypes).toContain('int'); // Should default to MySQL
      
      expect(typeMapper.isTypeSupported('INT', SQLDialect.AUTO)).toBe(true);
      
      const autoMappings = TypeMapper.getDefaultMappings(SQLDialect.AUTO);
      expect(autoMappings['int']).toBe('number');
    });
  });

  describe('Type normalization', () => {
    it('should normalize types with size specifications', () => {
      const typesWithSizes = [
        'VARCHAR(255)',
        'CHAR(10)',
        'INT(11)',
        'DECIMAL(10,2)',
        'FLOAT(7,4)',
        'NUMERIC(15,5)'
      ];

      typesWithSizes.forEach(type => {
        const result = typeMapper.mapType(type, SQLDialect.MYSQL);
        expect(result).not.toBe('any'); // Should be mapped correctly
      });
    });

    it('should normalize types with modifiers', () => {
      const typesWithModifiers = [
        'INT UNSIGNED',
        'BIGINT SIGNED',
        'DECIMAL(10,2) UNSIGNED',
        'FLOAT UNSIGNED'
      ];

      typesWithModifiers.forEach(type => {
        const result = typeMapper.mapType(type, SQLDialect.MYSQL);
        expect(result).toBe('number');
      });
    });

    it('should handle case insensitive type matching', () => {
      const caseVariations = [
        ['int', 'INT', 'Int', 'iNt'],
        ['varchar', 'VARCHAR', 'VarChar', 'varCHAR'],
        ['boolean', 'BOOLEAN', 'Boolean', 'bOOLEAN']
      ];

      caseVariations.forEach(variations => {
        const expectedType = typeMapper.mapType(variations[0], SQLDialect.MYSQL);
        variations.forEach(variation => {
          expect(typeMapper.mapType(variation, SQLDialect.MYSQL)).toBe(expectedType);
        });
      });
    });
  });
});