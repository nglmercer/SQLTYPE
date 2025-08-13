import { describe, it, expect } from 'vitest';
import { SQLParser } from '../src/parser/sql-parser.js';
import { SQLParseError } from '../src/types/index.js';

describe('SQLParser - Comprehensive Tests', () => {
  describe('Various CREATE TABLE syntaxes', () => {
    it('should handle simple table without quotes', () => {
      const sql = `
        CREATE TABLE users (
          id INT PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          email VARCHAR(255) UNIQUE
        );
      `;

      const result = SQLParser.parse(sql);
      
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('users');
      expect(result[0].fieldsString).toContain('id INT PRIMARY KEY');
      expect(result[0].fieldsString).toContain('name VARCHAR(100) NOT NULL');
    });

    it('should handle multiple tables in one SQL', () => {
      const sql = `
        CREATE TABLE users (
          id INT PRIMARY KEY,
          name VARCHAR(100) NOT NULL
        );
        
        CREATE TABLE posts (
          id INT PRIMARY KEY,
          title VARCHAR(200),
          user_id INT,
          content TEXT
        );
        
        CREATE TABLE comments (
          id INT PRIMARY KEY,
          post_id INT,
          author VARCHAR(100),
          message TEXT
        );
      `;

      const result = SQLParser.parse(sql);
      
      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('users');
      expect(result[1].name).toBe('posts');
      expect(result[2].name).toBe('comments');
    });

    it('should handle tables with various field types', () => {
      const sql = `
        CREATE TABLE data_types (
          id INT,
          name VARCHAR(255),
          age SMALLINT,
          salary DECIMAL(10,2),
          is_active BOOLEAN,
          created_at TIMESTAMP,
          data JSON,
          content TEXT
        );
      `;

      const result = SQLParser.parse(sql);
      
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('data_types');
      expect(result[0].fieldsString).toContain('DECIMAL(10,2)');
      expect(result[0].fieldsString).toContain('BOOLEAN');
      expect(result[0].fieldsString).toContain('TIMESTAMP');
    });

    it('should handle MySQL-specific syntax', () => {
      const sql = `
        CREATE TABLE mysql_table (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          status TINYINT(1) DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `;

      const result = SQLParser.parse(sql);
      
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('mysql_table');
      expect(result[0].fieldsString).toContain('AUTO_INCREMENT');
      expect(result[0].fieldsString).toContain('TINYINT(1)');
    });

    it('should handle PostgreSQL-specific syntax', () => {
      const sql = `
        CREATE TABLE postgres_table (
          id SERIAL PRIMARY KEY,
          name CHARACTER VARYING(255) NOT NULL,
          email TEXT UNIQUE,
          data JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `;

      const result = SQLParser.parse(sql);
      
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('postgres_table');
      expect(result[0].fieldsString).toContain('SERIAL');
      expect(result[0].fieldsString).toContain('CHARACTER VARYING');
      expect(result[0].fieldsString).toContain('JSONB');
    });

    it('should handle SQLite-specific syntax', () => {
      const sql = `
        CREATE TABLE sqlite_table (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          value REAL,
          data BLOB
        );
      `;

      const result = SQLParser.parse(sql);
      
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('sqlite_table');
      expect(result[0].fieldsString).toContain('AUTOINCREMENT');
      expect(result[0].fieldsString).toContain('REAL');
      expect(result[0].fieldsString).toContain('BLOB');
    });

    it('should handle IF NOT EXISTS clause', () => {
      const sql = `
        CREATE TABLE IF NOT EXISTS conditional_table (
          id INT PRIMARY KEY,
          name VARCHAR(100)
        );
      `;

      const result = SQLParser.parse(sql);
      
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('conditional_table');
    });

    it('should handle table with constraints', () => {
      const sql = `
        CREATE TABLE constrained_table (
          id INT PRIMARY KEY,
          user_id INT NOT NULL,
          email VARCHAR(255) UNIQUE,
          status VARCHAR(20) DEFAULT 'active',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id),
          INDEX idx_email (email),
          UNIQUE KEY uk_user_email (user_id, email)
        );
      `;

      const result = SQLParser.parse(sql);
      
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('constrained_table');
      expect(result[0].fieldsString).toContain('FOREIGN KEY');
      expect(result[0].fieldsString).toContain('INDEX');
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle SQL with comments', () => {
      const sql = `
        -- This is a comment
        CREATE TABLE commented_table (
          id INT PRIMARY KEY, -- Primary key field
          name VARCHAR(100) /* Name field */
        );
        /* End of table */
      `;

      const result = SQLParser.parse(sql);
      
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('commented_table');
    });

    it('should handle SQL with extra whitespace', () => {
      const sql = `
        
        
        CREATE    TABLE    spaced_table    (
          id    INT    PRIMARY    KEY,
          name    VARCHAR(100)    NOT    NULL
        )    ;
        
        
      `;

      const result = SQLParser.parse(sql);
      
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('spaced_table');
    });

    it('should handle mixed case SQL keywords', () => {
      const sql = `
        create table MixedCase_Table (
          ID int primary key,
          Name varchar(100) not null,
          Email VARCHAR(255) UNIQUE
        );
      `;

      const result = SQLParser.parse(sql);
      
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('MixedCase_Table');
    });

    it('should throw error for empty SQL', () => {
      expect(() => SQLParser.parse('')).toThrow(SQLParseError);
      expect(() => SQLParser.parse('   ')).toThrow(SQLParseError);
    });

    it('should throw error for SQL without CREATE TABLE', () => {
      const sql = 'SELECT * FROM users;';
      expect(() => SQLParser.parse(sql)).toThrow(SQLParseError);
    });

    it('should throw error for malformed CREATE TABLE', () => {
      const sql = 'CREATE TABLE incomplete_table';
      expect(() => SQLParser.parse(sql)).toThrow(SQLParseError);
    });
  });

  describe('Line number calculation', () => {
    it('should calculate correct line numbers for multiple tables', () => {
      const sql = `-- Line 1
CREATE TABLE first_table (
  id INT PRIMARY KEY
);

-- Line 6
CREATE TABLE second_table (
  id INT PRIMARY KEY,
  name VARCHAR(100)
);`;

      const result = SQLParser.parse(sql);
      
      expect(result).toHaveLength(2);
      expect(result[0].lineNumber).toBe(2);
      expect(result[1].lineNumber).toBe(7);
    });
  });

  describe('Utility methods', () => {
    it('should extract CREATE TABLE statements as strings', () => {
      const sql = `
        CREATE TABLE table1 (id INT);
        CREATE TABLE table2 (id INT);
      `;

      const statements = SQLParser.extractCreateTableStatements(sql);
      
      expect(statements).toHaveLength(2);
      expect(statements[0]).toContain('CREATE TABLE table1');
      expect(statements[1]).toContain('CREATE TABLE table2');
    });

    it('should detect presence of CREATE TABLE statements', () => {
      const validSql = 'CREATE TABLE test (id INT);';
      const invalidSql = 'SELECT * FROM test;';
      
      expect(SQLParser.hasCreateTableStatements(validSql)).toBe(true);
      expect(SQLParser.hasCreateTableStatements(invalidSql)).toBe(false);
      expect(SQLParser.hasCreateTableStatements('')).toBe(false);
      expect(SQLParser.hasCreateTableStatements(null as any)).toBe(false);
    });
  });
});