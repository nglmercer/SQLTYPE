import { describe, it, expect } from 'vitest';
import { FieldParser } from '../src/parser/field-parser.js';
import { FieldConstraintType, SQLParseError } from '../src/types/index.js';

describe('FieldParser', () => {
  describe('parseField', () => {
    it('should parse a simple field definition', () => {
      const fieldDef = 'id INT PRIMARY KEY';
      
      const result = FieldParser.parseField(fieldDef);
      
      expect(result.name).toBe('id');
      expect(result.type).toBe('INT');
      expect(result.nullable).toBe(false);
      expect(result.constraints).toHaveLength(1);
      expect(result.constraints[0].type).toBe(FieldConstraintType.PRIMARY_KEY);
    });

    it('should parse field with NOT NULL constraint', () => {
      const fieldDef = 'name VARCHAR(100) NOT NULL';
      
      const result = FieldParser.parseField(fieldDef);
      
      expect(result.name).toBe('name');
      expect(result.type).toBe('VARCHAR(100)');
      expect(result.nullable).toBe(false);
      expect(result.constraints).toHaveLength(0);
    });

    it('should parse field with DEFAULT value', () => {
      const fieldDef = "status VARCHAR(20) DEFAULT 'active'";
      
      const result = FieldParser.parseField(fieldDef);
      
      expect(result.name).toBe('status');
      expect(result.type).toBe('VARCHAR(20)');
      expect(result.nullable).toBe(true);
      expect(result.defaultValue).toBe('active');
    });

    it('should parse field with COMMENT', () => {
      const fieldDef = "id INT COMMENT 'Primary key'";
      
      const result = FieldParser.parseField(fieldDef);
      
      expect(result.name).toBe('id');
      expect(result.type).toBe('INT');
      expect(result.comment).toBe('Primary key');
    });

    it('should parse field with AUTO_INCREMENT', () => {
      const fieldDef = 'id INT AUTO_INCREMENT PRIMARY KEY';
      
      const result = FieldParser.parseField(fieldDef);
      
      expect(result.name).toBe('id');
      expect(result.type).toBe('INT');
      expect(result.nullable).toBe(false);
      expect(result.constraints).toHaveLength(2);
      expect(result.constraints.map(c => c.type)).toContain(FieldConstraintType.AUTO_INCREMENT);
      expect(result.constraints.map(c => c.type)).toContain(FieldConstraintType.PRIMARY_KEY);
    });

    it('should parse field with UNIQUE constraint', () => {
      const fieldDef = 'email VARCHAR(255) UNIQUE NOT NULL';
      
      const result = FieldParser.parseField(fieldDef);
      
      expect(result.name).toBe('email');
      expect(result.type).toBe('VARCHAR(255)');
      expect(result.nullable).toBe(false);
      expect(result.constraints).toHaveLength(1);
      expect(result.constraints[0].type).toBe(FieldConstraintType.UNIQUE);
    });

    it('should parse field with backtick-quoted name', () => {
      const fieldDef = '`user_id` INT NOT NULL';
      
      const result = FieldParser.parseField(fieldDef);
      
      expect(result.name).toBe('user_id');
      expect(result.type).toBe('INT');
      expect(result.nullable).toBe(false);
    });

    it('should parse field with double-quoted name', () => {
      const fieldDef = '"user_id" INT NOT NULL';
      
      const result = FieldParser.parseField(fieldDef);
      
      expect(result.name).toBe('user_id');
      expect(result.type).toBe('INT');
      expect(result.nullable).toBe(false);
    });

    it('should parse field with complex type definition', () => {
      const fieldDef = 'amount DECIMAL(10,2) UNSIGNED NOT NULL';
      
      const result = FieldParser.parseField(fieldDef);
      
      expect(result.name).toBe('amount');
      expect(result.type).toBe('DECIMAL(10,2) UNSIGNED');
      expect(result.nullable).toBe(false);
    });

    it('should parse nullable field by default', () => {
      const fieldDef = 'description TEXT';
      
      const result = FieldParser.parseField(fieldDef);
      
      expect(result.name).toBe('description');
      expect(result.type).toBe('TEXT');
      expect(result.nullable).toBe(true);
    });

    it('should throw error for invalid field definition', () => {
      expect(() => FieldParser.parseField('')).toThrow(SQLParseError);
      expect(() => FieldParser.parseField('INVALID')).toThrow(SQLParseError);
    });

    it('should throw error for table-level constraints', () => {
      expect(() => FieldParser.parseField('PRIMARY KEY (id)')).toThrow(SQLParseError);
      expect(() => FieldParser.parseField('FOREIGN KEY (user_id) REFERENCES users(id)')).toThrow(SQLParseError);
    });

    it('should parse field with CHECK constraint', () => {
      const fieldDef = 'age INT CHECK (age >= 0)';
      
      const result = FieldParser.parseField(fieldDef);
      
      expect(result.name).toBe('age');
      expect(result.type).toBe('INT');
      expect(result.constraints).toHaveLength(1);
      expect(result.constraints[0].type).toBe(FieldConstraintType.CHECK);
      expect(result.constraints[0].value).toBe('age >= 0');
    });

    it('should parse field with FOREIGN KEY constraint', () => {
      const fieldDef = 'user_id INT REFERENCES users(id)';
      
      const result = FieldParser.parseField(fieldDef);
      
      expect(result.name).toBe('user_id');
      expect(result.type).toBe('INT');
      expect(result.constraints).toHaveLength(1);
      expect(result.constraints[0].type).toBe(FieldConstraintType.FOREIGN_KEY);
      expect(result.constraints[0].value).toBe('users(id)');
    });

    it('should parse field with multiple constraints', () => {
      const fieldDef = 'id INT NOT NULL AUTO_INCREMENT PRIMARY KEY COMMENT "Primary identifier"';
      
      const result = FieldParser.parseField(fieldDef);
      
      expect(result.name).toBe('id');
      expect(result.type).toBe('INT');
      expect(result.nullable).toBe(false);
      expect(result.comment).toBe('Primary identifier');
      expect(result.constraints).toHaveLength(2);
      expect(result.constraints.map(c => c.type)).toContain(FieldConstraintType.AUTO_INCREMENT);
      expect(result.constraints.map(c => c.type)).toContain(FieldConstraintType.PRIMARY_KEY);
    });

    it('should parse ENUM field types', () => {
      const fieldDef = "status ENUM('active', 'inactive', 'pending') DEFAULT 'active'";
      
      const result = FieldParser.parseField(fieldDef);
      
      expect(result.name).toBe('status');
      expect(result.type).toBe("ENUM('active', 'inactive', 'pending')");
      expect(result.defaultValue).toBe('active');
    });

    it('should parse SET field types', () => {
      const fieldDef = "permissions SET('read', 'write', 'delete')";
      
      const result = FieldParser.parseField(fieldDef);
      
      expect(result.name).toBe('permissions');
      expect(result.type).toBe("SET('read', 'write', 'delete')");
    });

    it('should parse PostgreSQL array types', () => {
      const fieldDef = 'tags TEXT[]';
      
      const result = FieldParser.parseField(fieldDef);
      
      expect(result.name).toBe('tags');
      expect(result.type).toBe('TEXT[]');
    });

    it('should parse complex numeric types', () => {
      const fieldDef = 'price DECIMAL(10,2) UNSIGNED NOT NULL';
      
      const result = FieldParser.parseField(fieldDef);
      
      expect(result.name).toBe('price');
      expect(result.type).toBe('DECIMAL(10,2) UNSIGNED');
      expect(result.nullable).toBe(false);
    });

    it('should handle fields with quoted default values', () => {
      const fieldDef = 'created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP';
      
      const result = FieldParser.parseField(fieldDef);
      
      expect(result.name).toBe('created_at');
      expect(result.type).toBe('TIMESTAMP');
      expect(result.defaultValue).toBe('CURRENT_TIMESTAMP');
    });

    it('should handle fields with NULL default', () => {
      const fieldDef = 'optional_field VARCHAR(255) DEFAULT NULL';
      
      const result = FieldParser.parseField(fieldDef);
      
      expect(result.name).toBe('optional_field');
      expect(result.type).toBe('VARCHAR(255)');
      expect(result.defaultValue).toBe('NULL');
      expect(result.nullable).toBe(true);
    });
  });

  describe('parseFields', () => {
    it('should parse multiple field definitions', () => {
      const fieldsString = `
        id INT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      `;
      
      const result = FieldParser.parseFields(fieldsString);
      
      expect(result).toHaveLength(4);
      expect(result[0].name).toBe('id');
      expect(result[1].name).toBe('name');
      expect(result[2].name).toBe('email');
      expect(result[3].name).toBe('created_at');
    });

    it('should skip table-level constraints', () => {
      const fieldsString = `
        id INT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY email_unique (email)
      `;
      
      const result = FieldParser.parseFields(fieldsString);
      
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('id');
      expect(result[1].name).toBe('name');
    });

    it('should handle fields with parentheses in type definitions', () => {
      const fieldsString = `
        id INT,
        coordinates POINT,
        data JSON,
        amount DECIMAL(10,2)
      `;
      
      const result = FieldParser.parseFields(fieldsString);
      
      expect(result).toHaveLength(4);
      expect(result[0].name).toBe('id');
      expect(result[1].name).toBe('coordinates');
      expect(result[2].name).toBe('data');
      expect(result[3].name).toBe('amount');
      expect(result[3].type).toBe('DECIMAL(10,2)');
    });

    it('should handle empty field definitions gracefully', () => {
      const fieldsString = `
        id INT,
        ,
        name VARCHAR(100)
      `;
      
      const result = FieldParser.parseFields(fieldsString);
      
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('id');
      expect(result[1].name).toBe('name');
    });

    it('should throw error for invalid fields string', () => {
      expect(() => FieldParser.parseFields('')).toThrow(SQLParseError);
      expect(() => FieldParser.parseFields(null as any)).toThrow(SQLParseError);
    });
  });
});