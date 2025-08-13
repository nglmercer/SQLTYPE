import { describe, it, expect } from 'vitest';
import { SQLParser } from '../src/parser/sql-parser.js';
import { SQLParseError } from '../src/types/index.js';

describe('SQLParser', () => {
  describe('parse', () => {
    it('should extract a simple CREATE TABLE statement', () => {
      const sql = `
        CREATE TABLE users (
          id INT PRIMARY KEY,
          name VARCHAR(100) NOT NULL
        );
      `;

      const result = SQLParser.parse(sql);
      
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('users');
      expect(result[0].fieldsString).toContain('id INT PRIMARY KEY');
      expect(result[0].fieldsString).toContain('name VARCHAR(100) NOT NULL');
    });

    it('should extract multiple CREATE TABLE statements', () => {
      const sql = `
        CREATE TABLE users (
          id INT PRIMARY KEY,
          name VARCHAR(100)
        );
        
        CREATE TABLE posts (
          id INT PRIMARY KEY,
          title VARCHAR(200),
          user_id INT
        );
      `;

      const result = SQLParser.parse(sql);
      
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('users');
      expect(result[1].name).toBe('posts');
    });

    it('should handle table names with backticks', () => {
      const sql = `
        CREATE TABLE \`user_table\` (
          id INT PRIMARY KEY,
          name VARCHAR(100) NOT NULL
        );
      `;
      
      const result = SQLParser.parse(sql);
      
      expect(result[0].name).toBe('user_table');
      expect(result[0].fieldsString).toContain('id INT PRIMARY KEY');
    });

    it('should handle table names with double quotes', () => {
      const sql = `
        CREATE TABLE "user_table" (
          id INT PRIMARY KEY,
          name VARCHAR(100) NOT NULL
        );
      `;
      
      const result = SQLParser.parse(sql);
      
      expect(result[0].name).toBe('user_table');
      expect(result[0].fieldsString).toContain('id INT PRIMARY KEY');
    });

    it('should handle IF NOT EXISTS clause', () => {
      const sql = 'CREATE TABLE IF NOT EXISTS users (id INT);';
      
      const result = SQLParser.parse(sql);
      
      expect(result[0].name).toBe('users');
    });

    it('should handle MySQL engine and charset options', () => {
      const sql = `
        CREATE TABLE users (
          id INT PRIMARY KEY
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
      `;
      
      const result = SQLParser.parse(sql);
      
      expect(result[0].name).toBe('users');
      expect(result[0].fieldsString).toContain('id INT PRIMARY KEY');
    });

    it('should throw error for invalid SQL input', () => {
      expect(() => SQLParser.parse('')).toThrow(SQLParseError);
      expect(() => SQLParser.parse(null as any)).toThrow(SQLParseError);
    });

    it('should throw error when no CREATE TABLE statements found', () => {
      const sql = 'SELECT * FROM users;';
      
      expect(() => SQLParser.parse(sql)).toThrow(SQLParseError);
    });

    it('should calculate line numbers correctly', () => {
      const sql = `
        -- Comment line
        CREATE TABLE users (
          id INT PRIMARY KEY,
          name VARCHAR(100)
        );
        
        CREATE TABLE posts (
          id INT PRIMARY KEY
        );
      `;

      const result = SQLParser.parse(sql);
      
      expect(result[0].lineNumber).toBe(3); // users table starts at line 3
      expect(result[1].lineNumber).toBe(8); // posts table starts at line 8
    });

    it('should handle complex MySQL CREATE TABLE with all options', () => {
      const sql = `
        CREATE TABLE IF NOT EXISTS \`complex_table\` (
          \`id\` int(11) NOT NULL AUTO_INCREMENT,
          \`name\` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
          \`email\` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
          \`created_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (\`id\`),
          UNIQUE KEY \`email_unique\` (\`email\`)
        ) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Complex table example';
      `;

      const result = SQLParser.parse(sql);
      
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('complex_table');
      expect(result[0].fieldsString).toContain('id');
      expect(result[0].fieldsString).toContain('AUTO_INCREMENT');
    });

    it('should handle PostgreSQL CREATE TABLE syntax', () => {
      const sql = `
        CREATE TABLE users (
          id SERIAL PRIMARY KEY,
          name CHARACTER VARYING(255) NOT NULL,
          email TEXT UNIQUE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `;

      const result = SQLParser.parse(sql);
      
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('users');
      expect(result[0].fieldsString).toContain('SERIAL');
      expect(result[0].fieldsString).toContain('CHARACTER VARYING');
    });

    it('should handle SQLite CREATE TABLE syntax', () => {
      const sql = `
        CREATE TABLE users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT UNIQUE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        ) WITHOUT ROWID;
      `;

      const result = SQLParser.parse(sql);
      
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('users');
      expect(result[0].fieldsString).toContain('AUTOINCREMENT');
    });

    it('should handle tables with complex field types', () => {
      const sql = `
        CREATE TABLE complex_types (
          id INT,
          amount DECIMAL(10,2) UNSIGNED,
          data JSON,
          coordinates POINT,
          tags SET('tag1', 'tag2', 'tag3'),
          status ENUM('active', 'inactive', 'pending')
        );
      `;

      const result = SQLParser.parse(sql);
      
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('complex_types');
      expect(result[0].fieldsString).toContain('DECIMAL(10,2)');
      expect(result[0].fieldsString).toContain('JSON');
      expect(result[0].fieldsString).toContain('ENUM');
    });
  });

  describe('extractCreateTableStatements', () => {
    it('should return array of CREATE TABLE statement strings', () => {
      const sql = `
        CREATE TABLE users (id INT);
        CREATE TABLE posts (id INT);
      `;

      const statements = SQLParser.extractCreateTableStatements(sql);
      
      expect(statements).toHaveLength(2);
      expect(statements[0]).toContain('CREATE TABLE users');
      expect(statements[1]).toContain('CREATE TABLE posts');
    });
  });

  describe('hasCreateTableStatements', () => {
    it('should return true when CREATE TABLE statements exist', () => {
      const sql = 'CREATE TABLE users (id INT);';
      
      expect(SQLParser.hasCreateTableStatements(sql)).toBe(true);
    });

    it('should return false when no CREATE TABLE statements exist', () => {
      const sql = 'SELECT * FROM users;';
      
      expect(SQLParser.hasCreateTableStatements(sql)).toBe(false);
    });

    it('should return false for invalid input', () => {
      expect(SQLParser.hasCreateTableStatements('')).toBe(false);
      expect(SQLParser.hasCreateTableStatements(null as any)).toBe(false);
    });
  });
});