import { describe, it, expect } from 'vitest';
import { FieldParser } from '../src/parser/field-parser.js';
import { FieldConstraintType, SQLParseError } from '../src/types/index.js';

describe('FieldParser - Comprehensive Tests', () => {
  describe('Basic field parsing', () => {
    it('should parse simple field definitions', () => {
      const testCases = [
        { input: 'id INT', expected: { name: 'id', type: 'INT', nullable: true } },
        { input: 'name VARCHAR(100)', expected: { name: 'name', type: 'VARCHAR(100)', nullable: true } },
        { input: 'age SMALLINT', expected: { name: 'age', type: 'SMALLINT', nullable: true } },
        { input: 'salary DECIMAL(10,2)', expected: { name: 'salary', type: 'DECIMAL(10,2)', nullable: true } },
        { input: 'is_active BOOLEAN', expected: { name: 'is_active', type: 'BOOLEAN', nullable: true } }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = FieldParser.parseField(input);
        expect(result.name).toBe(expected.name);
        expect(result.type).toBe(expected.type);
        expect(result.nullable).toBe(expected.nullable);
      });
    });

    it('should parse fields with NOT NULL constraint', () => {
      const result = FieldParser.parseField('name VARCHAR(100) NOT NULL');
      
      expect(result.name).toBe('name');
      expect(result.type).toBe('VARCHAR(100)');
      expect(result.nullable).toBe(false);
      expect(result.constraints).toHaveLength(0);
    });

    it('should parse fields with PRIMARY KEY constraint', () => {
      const result = FieldParser.parseField('id INT PRIMARY KEY');
      
      expect(result.name).toBe('id');
      expect(result.type).toBe('INT');
      expect(result.nullable).toBe(false); // PRIMARY KEY implies NOT NULL
      expect(result.constraints).toHaveLength(1);
      expect(result.constraints[0].type).toBe(FieldConstraintType.PRIMARY_KEY);
    });

    it('should parse fields with UNIQUE constraint', () => {
      const result = FieldParser.parseField('email VARCHAR(255) UNIQUE');
      
      expect(result.name).toBe('email');
      expect(result.type).toBe('VARCHAR(255)');
      expect(result.nullable).toBe(true);
      expect(result.constraints).toHaveLength(1);
      expect(result.constraints[0].type).toBe(FieldConstraintType.UNIQUE);
    });

    it('should parse fields with AUTO_INCREMENT constraint', () => {
      const result = FieldParser.parseField('id INT AUTO_INCREMENT');
      
      expect(result.name).toBe('id');
      expect(result.type).toBe('INT');
      expect(result.constraints).toHaveLength(1);
      expect(result.constraints[0].type).toBe(FieldConstraintType.AUTO_INCREMENT);
    });
  });

  describe('Default values', () => {
    it('should parse fields with string default values', () => {
      const testCases = [
        { input: "status VARCHAR(20) DEFAULT 'active'", expected: 'active' },
        { input: 'status VARCHAR(20) DEFAULT "inactive"', expected: 'inactive' },
        { input: 'role VARCHAR(20) DEFAULT admin', expected: 'admin' }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = FieldParser.parseField(input);
        expect(result.defaultValue).toBe(expected);
      });
    });

    it('should parse fields with numeric default values', () => {
      const testCases = [
        { input: 'count INT DEFAULT 0', expected: '0' },
        { input: 'price DECIMAL(10,2) DEFAULT 99.99', expected: '99.99' },
        { input: 'rating FLOAT DEFAULT 5.0', expected: '5.0' }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = FieldParser.parseField(input);
        expect(result.defaultValue).toBe(expected);
      });
    });

    it('should parse fields with function default values', () => {
      const testCases = [
        { input: 'created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP', expected: 'CURRENT_TIMESTAMP' },
        { input: 'updated_at TIMESTAMP DEFAULT NOW()', expected: 'NOW()' },
        { input: 'uuid VARCHAR(36) DEFAULT UUID()', expected: 'UUID()' }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = FieldParser.parseField(input);
        expect(result.defaultValue).toBe(expected);
      });
    });

    it('should parse fields with NULL default', () => {
      const result = FieldParser.parseField('optional_field VARCHAR(255) DEFAULT NULL');
      
      expect(result.name).toBe('optional_field');
      expect(result.defaultValue).toBe('NULL');
      expect(result.nullable).toBe(true);
    });
  });

  describe('Comments', () => {
    it('should parse fields with single-quoted comments', () => {
      const result = FieldParser.parseField("id INT COMMENT 'Primary key identifier'");
      
      expect(result.name).toBe('id');
      expect(result.type).toBe('INT');
      expect(result.comment).toBe('Primary key identifier');
    });

    it('should parse fields with double-quoted comments', () => {
      const result = FieldParser.parseField('name VARCHAR(100) COMMENT "User full name"');
      
      expect(result.name).toBe('name');
      expect(result.type).toBe('VARCHAR(100)');
      expect(result.comment).toBe('User full name');
    });

    it('should parse fields with comments containing special characters', () => {
      const result = FieldParser.parseField("description TEXT COMMENT 'User\\'s description with special chars: @#$%'");
      
      expect(result.name).toBe('description');
      expect(result.comment).toBe("User's description with special chars: @#$%");
    });
  });

  describe('Complex field types', () => {
    it('should parse MySQL-specific types', () => {
      const testCases = [
        { input: 'tiny_flag TINYINT(1)', expected: { name: 'tiny_flag', type: 'TINYINT(1)' } },
        { input: 'medium_text MEDIUMTEXT', expected: { name: 'medium_text', type: 'MEDIUMTEXT' } },
        { input: 'long_data LONGBLOB', expected: { name: 'long_data', type: 'LONGBLOB' } },
        { input: 'year_field YEAR(4)', expected: { name: 'year_field', type: 'YEAR(4)' } }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = FieldParser.parseField(input);
        expect(result.name).toBe(expected.name);
        expect(result.type).toBe(expected.type);
      });
    });

    it('should parse PostgreSQL-specific types', () => {
      const testCases = [
        { input: 'id SERIAL', expected: { name: 'id', type: 'SERIAL' } },
        { input: 'data JSONB', expected: { name: 'data', type: 'JSONB' } },
        { input: 'uuid_field UUID', expected: { name: 'uuid_field', type: 'UUID' } },
        { input: 'binary_data BYTEA', expected: { name: 'binary_data', type: 'BYTEA' } },
        { input: 'tags TEXT[]', expected: { name: 'tags', type: 'TEXT[]' } }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = FieldParser.parseField(input);
        expect(result.name).toBe(expected.name);
        expect(result.type).toBe(expected.type);
      });
    });

    it('should parse SQLite-specific types', () => {
      const testCases = [
        { input: 'id INTEGER', expected: { name: 'id', type: 'INTEGER' } },
        { input: 'value REAL', expected: { name: 'value', type: 'REAL' } },
        { input: 'data BLOB', expected: { name: 'data', type: 'BLOB' } },
        { input: 'name TEXT', expected: { name: 'name', type: 'TEXT' } }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = FieldParser.parseField(input);
        expect(result.name).toBe(expected.name);
        expect(result.type).toBe(expected.type);
      });
    });

    it('should parse ENUM types', () => {
      const result = FieldParser.parseField("status ENUM('active', 'inactive', 'pending')");
      
      expect(result.name).toBe('status');
      expect(result.type).toBe("ENUM('active', 'inactive', 'pending')");
    });

    it('should parse SET types', () => {
      const result = FieldParser.parseField("permissions SET('read', 'write', 'delete')");
      
      expect(result.name).toBe('permissions');
      expect(result.type).toBe("SET('read', 'write', 'delete')");
    });

    it('should parse numeric types with precision and scale', () => {
      const testCases = [
        { input: 'price DECIMAL(10,2)', expected: 'DECIMAL(10,2)' },
        { input: 'percentage NUMERIC(5,2)', expected: 'NUMERIC(5,2)' },
        { input: 'coordinate DOUBLE(8,6)', expected: 'DOUBLE(8,6)' }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = FieldParser.parseField(input);
        expect(result.type).toBe(expected);
      });
    });

    it('should parse types with UNSIGNED/SIGNED modifiers', () => {
      const testCases = [
        { input: 'count INT UNSIGNED', expected: 'INT UNSIGNED' },
        { input: 'balance BIGINT SIGNED', expected: 'BIGINT SIGNED' },
        { input: 'amount DECIMAL(10,2) UNSIGNED', expected: 'DECIMAL(10,2) UNSIGNED' }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = FieldParser.parseField(input);
        expect(result.type).toBe(expected);
      });
    });
  });

  describe('Multiple constraints', () => {
    it('should parse fields with multiple constraints', () => {
      const result = FieldParser.parseField('id INT NOT NULL AUTO_INCREMENT PRIMARY KEY');
      
      expect(result.name).toBe('id');
      expect(result.type).toBe('INT');
      expect(result.nullable).toBe(false);
      expect(result.constraints).toHaveLength(2);
      expect(result.constraints.map(c => c.type)).toContain(FieldConstraintType.AUTO_INCREMENT);
      expect(result.constraints.map(c => c.type)).toContain(FieldConstraintType.PRIMARY_KEY);
    });

    it('should parse fields with constraints, default, and comment', () => {
      const result = FieldParser.parseField('email VARCHAR(255) UNIQUE NOT NULL DEFAULT "" COMMENT "User email address"');
      
      expect(result.name).toBe('email');
      expect(result.type).toBe('VARCHAR(255)');
      expect(result.nullable).toBe(false);
      expect(result.defaultValue).toBe('');
      expect(result.comment).toBe('User email address');
      expect(result.constraints).toHaveLength(1);
      expect(result.constraints[0].type).toBe(FieldConstraintType.UNIQUE);
    });
  });

  describe('Multiple field parsing', () => {
    it('should parse multiple field definitions', () => {
      const fieldsString = `
        id INT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE,
        age INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      `;
      
      const result = FieldParser.parseFields(fieldsString);
      
      expect(result).toHaveLength(5);
      expect(result[0].name).toBe('id');
      expect(result[1].name).toBe('name');
      expect(result[2].name).toBe('email');
      expect(result[3].name).toBe('age');
      expect(result[4].name).toBe('created_at');
    });

    it('should skip table-level constraints when parsing multiple fields', () => {
      const fieldsString = `
        id INT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255),
        PRIMARY KEY (id),
        UNIQUE KEY uk_email (email),
        FOREIGN KEY (user_id) REFERENCES users(id),
        INDEX idx_name (name)
      `;
      
      const result = FieldParser.parseFields(fieldsString);
      
      expect(result).toHaveLength(3); // Only field definitions, not constraints
      expect(result[0].name).toBe('id');
      expect(result[1].name).toBe('name');
      expect(result[2].name).toBe('email');
    });

    it('should handle fields with complex parentheses in types', () => {
      const fieldsString = `
        id INT,
        coordinates POINT,
        data JSON,
        amount DECIMAL(10,2),
        status ENUM('active', 'inactive'),
        permissions SET('read', 'write', 'delete')
      `;
      
      const result = FieldParser.parseFields(fieldsString);
      
      expect(result).toHaveLength(6);
      expect(result[3].type).toBe('DECIMAL(10,2)');
      expect(result[4].type).toBe("ENUM('active', 'inactive')");
      expect(result[5].type).toBe("SET('read', 'write', 'delete')");
    });

    it('should handle empty field definitions gracefully', () => {
      const fieldsString = `
        id INT,
        ,
        name VARCHAR(100),
        ,
        email VARCHAR(255)
      `;
      
      const result = FieldParser.parseFields(fieldsString);
      
      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('id');
      expect(result[1].name).toBe('name');
      expect(result[2].name).toBe('email');
    });
  });

  describe('Error handling', () => {
    it('should throw error for invalid field definitions', () => {
      const invalidCases = [
        '',
        '   ',
        'INVALID',
        'PRIMARY KEY (id)', // Table-level constraint
        'FOREIGN KEY (user_id) REFERENCES users(id)', // Table-level constraint
        'INDEX idx_name (name)' // Table-level constraint
      ];

      invalidCases.forEach(invalidCase => {
        expect(() => FieldParser.parseField(invalidCase)).toThrow(SQLParseError);
      });
    });

    it('should throw error for invalid fields string in parseFields', () => {
      expect(() => FieldParser.parseFields('')).toThrow(SQLParseError);
      expect(() => FieldParser.parseFields(null as any)).toThrow(SQLParseError);
    });

    it('should provide helpful error messages', () => {
      try {
        FieldParser.parseField('');
      } catch (error) {
        expect(error).toBeInstanceOf(SQLParseError);
        expect((error as SQLParseError).message).toContain('Invalid field definition');
      }

      try {
        FieldParser.parseField('PRIMARY KEY (id)');
      } catch (error) {
        expect(error).toBeInstanceOf(SQLParseError);
        expect((error as SQLParseError).message).toContain('Table-level constraint');
      }
    });
  });

  describe('Edge cases', () => {
    it('should handle field names with underscores and numbers', () => {
      const testCases = [
        'user_id INT',
        'field_123 VARCHAR(100)',
        'table2_field_name TEXT',
        'field_with_very_long_name_123 BIGINT'
      ];

      testCases.forEach(fieldDef => {
        const result = FieldParser.parseField(fieldDef);
        expect(result.name).toBeTruthy();
        expect(result.type).toBeTruthy();
      });
    });

    it('should handle mixed case field names and types', () => {
      const result = FieldParser.parseField('UserName VARCHAR(100) NOT NULL');
      
      expect(result.name).toBe('UserName');
      expect(result.type).toBe('VARCHAR(100)');
      expect(result.nullable).toBe(false);
    });

    it('should handle extra whitespace in field definitions', () => {
      const result = FieldParser.parseField('   id    INT    PRIMARY    KEY   ');
      
      expect(result.name).toBe('id');
      expect(result.type).toBe('INT');
      expect(result.constraints).toHaveLength(1);
      expect(result.constraints[0].type).toBe(FieldConstraintType.PRIMARY_KEY);
    });

    it('should handle fields with complex default expressions', () => {
      const testCases = [
        { input: 'created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP', expected: 'CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP' },
        { input: 'uuid VARCHAR(36) DEFAULT (UUID())', expected: '(UUID())' },
        { input: 'random_value INT DEFAULT (RAND() * 100)', expected: '(RAND() * 100)' }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = FieldParser.parseField(input);
        expect(result.defaultValue).toBe(expected);
      });
    });
  });
});