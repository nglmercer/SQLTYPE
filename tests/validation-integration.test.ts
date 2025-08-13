/**
 * Integration tests for validation functionality
 */

import { describe, it, expect } from 'vitest';
import { extractSchemas, generateTypes } from '../src/index.js';
import { SQLParseError } from '../src/types/index.js';

describe('Validation Integration Tests', () => {
  describe('SQL Input Validation', () => {
    it('should accept valid CREATE TABLE statements', () => {
      const validSql = `
        CREATE TABLE users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          username VARCHAR(50) NOT NULL,
          email VARCHAR(100) NOT NULL
        );
      `;
      
      expect(() => extractSchemas(validSql)).not.toThrow();
    });

    it('should reject SQL injection attempts', () => {
      const maliciousSql = `
        CREATE TABLE users (id INT);
        DROP TABLE users;
      `;
      
      expect(() => extractSchemas(maliciousSql)).toThrow(SQLParseError);
    });

    it('should reject script injection', () => {
      const scriptSql = `
        CREATE TABLE test (id INT);
        <script>alert('xss')</script>
      `;
      
      expect(() => extractSchemas(scriptSql)).toThrow(SQLParseError);
    });

    it('should reject command injection', () => {
      const commandSql = `
        CREATE TABLE test (id INT);
        $(rm -rf /)
      `;
      
      expect(() => extractSchemas(commandSql)).toThrow(SQLParseError);
    });

    it('should handle large but valid SQL', () => {
      const largeSql = `
        CREATE TABLE large_table (
          ${Array.from({ length: 50 }, (_, i) => `field${i} VARCHAR(100)`).join(',\n          ')}
        );
      `;
      
      expect(() => extractSchemas(largeSql)).not.toThrow();
    });

    it('should reject excessively large SQL', () => {
      const hugeSql = 'CREATE TABLE test (id INT);'.repeat(100000);
      
      expect(() => extractSchemas(hugeSql)).toThrow(SQLParseError);
    });
  });

  describe('Buffer Input Validation', () => {
    it('should accept valid SQL from buffer', () => {
      const sqlBuffer = Buffer.from('CREATE TABLE users (id INT PRIMARY KEY);', 'utf8');
      
      expect(() => extractSchemas(sqlBuffer)).not.toThrow();
    });

    it('should reject invalid UTF-8 buffers', () => {
      const invalidBuffer = Buffer.from([0xFF, 0xFE, 0xFD]);
      
      expect(() => extractSchemas(invalidBuffer)).toThrow(SQLParseError);
    });

    it('should reject oversized buffers', () => {
      const largeBuffer = Buffer.alloc(200 * 1024 * 1024); // 200MB
      
      expect(() => extractSchemas(largeBuffer)).toThrow(SQLParseError);
    });
  });

  describe('Memory and Resource Limits', () => {
    it('should reject too many tables', () => {
      const manyTables = Array.from({ length: 2000 }, (_, i) => 
        `CREATE TABLE table${i} (id INT);`
      ).join('\n');
      
      expect(() => extractSchemas(manyTables)).toThrow(SQLParseError);
    });

    it('should reject tables with too many fields', () => {
      const manyFields = `
        CREATE TABLE huge_table (
          ${Array.from({ length: 1000 }, (_, i) => `field${i} INT`).join(',\n          ')}
        );
      `;
      
      expect(() => extractSchemas(manyFields)).toThrow(SQLParseError);
    });
  });

  describe('Custom Validation Limits', () => {
    it('should respect custom table count limits', () => {
      const sql = `
        CREATE TABLE table1 (id INT);
        CREATE TABLE table2 (id INT);
        CREATE TABLE table3 (id INT);
      `;
      
      const customLimits = { maxTableCount: 2 };
      
      expect(() => extractSchemas(sql, {}, customLimits)).toThrow(SQLParseError);
    });

    it('should respect custom field count limits', () => {
      const sql = `
        CREATE TABLE test (
          field1 INT,
          field2 INT,
          field3 INT
        );
      `;
      
      const customLimits = { maxFieldCount: 2 };
      
      expect(() => extractSchemas(sql, {}, customLimits)).toThrow(SQLParseError);
    });

    it('should respect custom SQL length limits', () => {
      const sql = 'CREATE TABLE test (id INT PRIMARY KEY);';
      const customLimits = { maxSqlLength: 10 };
      
      expect(() => extractSchemas(sql, {}, customLimits)).toThrow(SQLParseError);
    });
  });

  describe('Real-world SQL Validation', () => {
    it('should handle complex real-world SQL', () => {
      const realSql = `
        CREATE TABLE users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          username VARCHAR(50) NOT NULL UNIQUE,
          email VARCHAR(100) NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_username (username),
          INDEX idx_email (email)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        
        CREATE TABLE posts (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          title VARCHAR(200) NOT NULL,
          content TEXT,
          status ENUM('draft', 'published', 'archived') DEFAULT 'draft',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_user_id (user_id),
          INDEX idx_status (status),
          INDEX idx_created_at (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `;
      
      const schemas = extractSchemas(realSql);
      const types = generateTypes(schemas);
      
      expect(schemas).toHaveLength(2);
      expect(schemas[0].name).toBe('users');
      expect(schemas[1].name).toBe('posts');
      expect(types).toContain('users');
      expect(types).toContain('posts');
    });

    it('should sanitize but preserve valid SQL structure', () => {
      const sqlWithExtraWhitespace = `
        CREATE    TABLE     users    (
          id     INT     PRIMARY     KEY,
          name   VARCHAR(100)   NOT   NULL
        );
      `;
      
      const schemas = extractSchemas(sqlWithExtraWhitespace);
      expect(schemas).toHaveLength(1);
      expect(schemas[0].name).toBe('users');
      expect(schemas[0].fields).toHaveLength(2);
    });
  });
});