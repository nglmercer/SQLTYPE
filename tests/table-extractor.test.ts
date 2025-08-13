import { describe, it, expect } from 'vitest';
import { TableExtractor } from '../src/parser/table-extractor.js';
import { TableConstraintType, FieldConstraintType, SQLParseError } from '../src/types/index.js';

describe('TableExtractor', () => {
  describe('extractTables', () => {
    it('should extract a simple table with fields', () => {
      const sql = `
        CREATE TABLE users (
          id INT PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          email VARCHAR(255) UNIQUE
        );
      `;

      const result = TableExtractor.extractTables(sql);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('users');
      expect(result[0].fields).toHaveLength(3);
      
      expect(result[0].fields[0].name).toBe('id');
      expect(result[0].fields[0].type).toBe('INT');
      expect(result[0].fields[0].nullable).toBe(false);
      expect(result[0].fields[0].constraints[0].type).toBe(FieldConstraintType.PRIMARY_KEY);
      
      expect(result[0].fields[1].name).toBe('name');
      expect(result[0].fields[1].type).toBe('VARCHAR(100)');
      expect(result[0].fields[1].nullable).toBe(false);
      
      expect(result[0].fields[2].name).toBe('email');
      expect(result[0].fields[2].type).toBe('VARCHAR(255)');
      expect(result[0].fields[2].constraints[0].type).toBe(FieldConstraintType.UNIQUE);
    });

    it('should extract table with table-level PRIMARY KEY constraint', () => {
      const sql = `
        CREATE TABLE users (
          id INT,
          name VARCHAR(100),
          PRIMARY KEY (id)
        );
      `;

      const result = TableExtractor.extractTables(sql);

      expect(result).toHaveLength(1);
      expect(result[0].constraints).toHaveLength(1);
      expect(result[0].constraints[0].type).toBe(TableConstraintType.PRIMARY_KEY);
      expect(result[0].constraints[0].fields).toEqual(['id']);
    });

    it('should extract table with composite PRIMARY KEY', () => {
      const sql = `
        CREATE TABLE user_roles (
          user_id INT,
          role_id INT,
          PRIMARY KEY (user_id, role_id)
        );
      `;

      const result = TableExtractor.extractTables(sql);

      expect(result).toHaveLength(1);
      expect(result[0].constraints).toHaveLength(1);
      expect(result[0].constraints[0].type).toBe(TableConstraintType.PRIMARY_KEY);
      expect(result[0].constraints[0].fields).toEqual(['user_id', 'role_id']);
    });

    it('should extract table with FOREIGN KEY constraint', () => {
      const sql = `
        CREATE TABLE posts (
          id INT PRIMARY KEY,
          user_id INT,
          title VARCHAR(200),
          FOREIGN KEY (user_id) REFERENCES users(id)
        );
      `;

      const result = TableExtractor.extractTables(sql);

      expect(result).toHaveLength(1);
      expect(result[0].constraints).toHaveLength(1);
      expect(result[0].constraints[0].type).toBe(TableConstraintType.FOREIGN_KEY);
      expect(result[0].constraints[0].fields).toEqual(['user_id']);
      expect(result[0].constraints[0].reference).toEqual({
        table: 'users',
        fields: ['id']
      });
    });

    it('should extract table with UNIQUE constraint', () => {
      const sql = `
        CREATE TABLE users (
          id INT PRIMARY KEY,
          email VARCHAR(255),
          username VARCHAR(100),
          UNIQUE (email),
          UNIQUE KEY username_unique (username)
        );
      `;

      const result = TableExtractor.extractTables(sql);

      expect(result).toHaveLength(1);
      expect(result[0].constraints).toHaveLength(2);
      
      const uniqueConstraints = result[0].constraints.filter(c => c.type === TableConstraintType.UNIQUE);
      expect(uniqueConstraints).toHaveLength(2);
      expect(uniqueConstraints[0].fields).toEqual(['email']);
      expect(uniqueConstraints[1].fields).toEqual(['username']);
    });

    it('should extract table with INDEX constraint', () => {
      const sql = `
        CREATE TABLE posts (
          id INT PRIMARY KEY,
          title VARCHAR(200),
          created_at TIMESTAMP,
          KEY title_idx (title),
          INDEX created_at_idx (created_at)
        );
      `;

      const result = TableExtractor.extractTables(sql);

      expect(result).toHaveLength(1);
      expect(result[0].constraints).toHaveLength(2);
      
      const indexConstraints = result[0].constraints.filter(c => c.type === TableConstraintType.INDEX);
      expect(indexConstraints).toHaveLength(2);
      expect(indexConstraints[0].fields).toEqual(['title']);
      expect(indexConstraints[1].fields).toEqual(['created_at']);
    });

    it('should extract multiple tables', () => {
      const sql = `
        CREATE TABLE users (
          id INT PRIMARY KEY,
          name VARCHAR(100)
        );
        
        CREATE TABLE posts (
          id INT PRIMARY KEY,
          user_id INT,
          title VARCHAR(200),
          FOREIGN KEY (user_id) REFERENCES users(id)
        );
      `;

      const result = TableExtractor.extractTables(sql);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('users');
      expect(result[1].name).toBe('posts');
      expect(result[1].constraints).toHaveLength(1);
      expect(result[1].constraints[0].type).toBe(TableConstraintType.FOREIGN_KEY);
    });

    it('should handle complex table with multiple constraint types', () => {
      const sql = `
        CREATE TABLE orders (
          id INT AUTO_INCREMENT,
          user_id INT NOT NULL,
          product_id INT NOT NULL,
          quantity INT DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (product_id) REFERENCES products(id),
          UNIQUE KEY user_product_unique (user_id, product_id),
          INDEX created_at_idx (created_at)
        );
      `;

      const result = TableExtractor.extractTables(sql);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('orders');
      expect(result[0].fields).toHaveLength(5);
      expect(result[0].constraints).toHaveLength(5); // 1 PK + 2 FK + 1 UNIQUE + 1 INDEX
      
      const constraintTypes = result[0].constraints.map(c => c.type);
      expect(constraintTypes).toContain(TableConstraintType.PRIMARY_KEY);
      expect(constraintTypes).toContain(TableConstraintType.FOREIGN_KEY);
      expect(constraintTypes).toContain(TableConstraintType.UNIQUE);
      expect(constraintTypes).toContain(TableConstraintType.INDEX);
    });

    it('should handle quoted field names in constraints', () => {
      const sql = `
        CREATE TABLE test (
          \`user-id\` INT,
          "order-id" INT,
          PRIMARY KEY (\`user-id\`, "order-id")
        );
      `;

      const result = TableExtractor.extractTables(sql);

      expect(result).toHaveLength(1);
      expect(result[0].constraints).toHaveLength(1);
      expect(result[0].constraints[0].fields).toEqual(['user-id', 'order-id']);
    });

    it('should throw error for invalid SQL', () => {
      expect(() => TableExtractor.extractTables('')).toThrow(SQLParseError);
      expect(() => TableExtractor.extractTables('INVALID SQL')).toThrow(SQLParseError);
    });
  });

  describe('extractSingleTable', () => {
    it('should extract a single table', () => {
      const sql = `
        CREATE TABLE users (
          id INT PRIMARY KEY,
          name VARCHAR(100)
        );
      `;

      const result = TableExtractor.extractSingleTable(sql);

      expect(result.name).toBe('users');
      expect(result.fields).toHaveLength(2);
    });

    it('should throw error when no tables found', () => {
      const sql = 'SELECT * FROM users;';
      
      expect(() => TableExtractor.extractSingleTable(sql)).toThrow(SQLParseError);
    });

    it('should throw error when multiple tables found', () => {
      const sql = `
        CREATE TABLE users (id INT);
        CREATE TABLE posts (id INT);
      `;
      
      expect(() => TableExtractor.extractSingleTable(sql)).toThrow(SQLParseError);
    });
  });

  describe('hasValidTables', () => {
    it('should return true for valid SQL with tables', () => {
      const sql = 'CREATE TABLE users (id INT);';
      
      expect(TableExtractor.hasValidTables(sql)).toBe(true);
    });

    it('should return false for invalid SQL', () => {
      const sql = 'INVALID SQL';
      
      expect(TableExtractor.hasValidTables(sql)).toBe(false);
    });

    it('should return false for SQL without tables', () => {
      const sql = 'SELECT * FROM users;';
      
      expect(TableExtractor.hasValidTables(sql)).toBe(false);
    });
  });
});