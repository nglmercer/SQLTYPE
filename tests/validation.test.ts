/**
 * Tests for input validation and sanitization utilities
 */

import { describe, it, expect } from 'vitest';
import {
  validateSqlInput,
  sanitizeSqlInput,
  validateFilePath,
  validateFileSize,
  validateMemoryUsage,
  validateTableCount,
  validateFieldCount,
  validateForProcessing,
  validateAndConvertInput,
  ValidationLimits,
  DEFAULT_VALIDATION_LIMITS,
  createValidationLimits,
  validateLimits
} from '../src/utils/validation.js';
import { SQLParseError, FileReadError } from '../src/types/index.js';

describe('SQL Input Validation', () => {
  describe('validateSqlInput', () => {
    it('should accept valid SQL input', () => {
      const validSql = 'CREATE TABLE users (id INT PRIMARY KEY, name VARCHAR(100));';
      expect(() => validateSqlInput(validSql)).not.toThrow();
    });

    it('should reject null or undefined input', () => {
      expect(() => validateSqlInput(null as any)).toThrow(SQLParseError);
      expect(() => validateSqlInput(undefined as any)).toThrow(SQLParseError);
    });

    it('should reject non-string input', () => {
      expect(() => validateSqlInput(123 as any)).toThrow(SQLParseError);
      expect(() => validateSqlInput({} as any)).toThrow(SQLParseError);
    });

    it('should reject empty input', () => {
      expect(() => validateSqlInput('')).toThrow(SQLParseError);
      expect(() => validateSqlInput('   ')).toThrow(SQLParseError);
    });

    it('should reject input that is too large', () => {
      const largeSql = 'CREATE TABLE test (id INT);'.repeat(1000000);
      const limits: ValidationLimits = { ...DEFAULT_VALIDATION_LIMITS, maxSqlLength: 1000 };
      expect(() => validateSqlInput(largeSql, limits)).toThrow(SQLParseError);
    });

    it('should reject SQL with dangerous patterns', () => {
      const dangerousSql = 'CREATE TABLE users (id INT); DROP TABLE users;';
      expect(() => validateSqlInput(dangerousSql)).toThrow(SQLParseError);
    });

    it('should reject SQL with script injection', () => {
      const scriptSql = 'CREATE TABLE test (id INT); <script>alert("xss")</script>';
      expect(() => validateSqlInput(scriptSql)).toThrow(SQLParseError);
    });

    it('should reject SQL with command injection patterns', () => {
      const commandSql = 'CREATE TABLE test (id INT); $(rm -rf /)';
      expect(() => validateSqlInput(commandSql)).toThrow(SQLParseError);
    });

    it('should reject malformed SQL with unmatched parentheses', () => {
      const malformedSql = 'CREATE TABLE test (id INT';
      expect(() => validateSqlInput(malformedSql)).toThrow(SQLParseError);
    });

    it('should reject malformed SQL with unmatched quotes', () => {
      const malformedSql = 'CREATE TABLE test (name VARCHAR(100)"';
      expect(() => validateSqlInput(malformedSql)).toThrow(SQLParseError);
    });

    it('should reject SQL with excessive control characters', () => {
      const controlSql = 'CREATE TABLE test\x00\x01\x02 (id INT);';
      expect(() => validateSqlInput(controlSql)).toThrow(SQLParseError);
    });

    it('should require CREATE TABLE statements', () => {
      const noCreateTable = 'SELECT * FROM users;';
      expect(() => validateSqlInput(noCreateTable)).toThrow(SQLParseError);
    });
  });

  describe('sanitizeSqlInput', () => {
    it('should return empty string for invalid input', () => {
      expect(sanitizeSqlInput(null as any)).toBe('');
      expect(sanitizeSqlInput(undefined as any)).toBe('');
      expect(sanitizeSqlInput(123 as any)).toBe('');
    });

    it('should remove null bytes', () => {
      const input = 'CREATE TABLE test\x00 (id INT);';
      const result = sanitizeSqlInput(input);
      expect(result).not.toContain('\x00');
    });

    it('should remove excessive whitespace', () => {
      const input = 'CREATE    TABLE     test (id INT);';
      const result = sanitizeSqlInput(input);
      expect(result).toBe('CREATE TABLE test (id INT);');
    });

    it('should remove control characters except newlines and tabs', () => {
      const input = 'CREATE\x01 TABLE\x02 test\x03 (id INT);';
      const result = sanitizeSqlInput(input);
      expect(result).toBe('CREATE TABLE test (id INT);');
    });

    it('should normalize line endings', () => {
      const input = 'CREATE TABLE test\r\n(id INT\r);';
      const result = sanitizeSqlInput(input);
      expect(result).toBe('CREATE TABLE test\n(id INT\n);');
    });

    it('should preserve valid SQL structure', () => {
      const input = 'CREATE TABLE users (\n  id INT PRIMARY KEY,\n  name VARCHAR(100)\n);';
      const result = sanitizeSqlInput(input);
      expect(result).toContain('CREATE TABLE users');
      expect(result).toContain('id INT PRIMARY KEY');
    });
  });
});

describe('File Path Validation', () => {
  describe('validateFilePath', () => {
    it('should accept valid file paths', () => {
      expect(() => validateFilePath('test.sql')).not.toThrow();
      expect(() => validateFilePath('./data/schema.sql')).not.toThrow();
      expect(() => validateFilePath('src/database/schema.sql')).not.toThrow();
    });

    it('should reject null or undefined paths', () => {
      expect(() => validateFilePath(null as any)).toThrow(FileReadError);
      expect(() => validateFilePath(undefined as any)).toThrow(FileReadError);
      expect(() => validateFilePath('')).toThrow(FileReadError);
    });

    it('should reject non-string paths', () => {
      expect(() => validateFilePath(123 as any)).toThrow(FileReadError);
    });

    it('should reject paths with null bytes', () => {
      expect(() => validateFilePath('test\x00.sql')).toThrow(FileReadError);
    });

    it('should reject path traversal attempts', () => {
      expect(() => validateFilePath('../../../etc/passwd')).toThrow(FileReadError);
      expect(() => validateFilePath('data/../../../secret.txt')).toThrow(FileReadError);
    });

    it('should reject dangerous system paths', () => {
      expect(() => validateFilePath('/etc/passwd')).toThrow(FileReadError);
      expect(() => validateFilePath('C:\\Windows\\System32\\config')).toThrow(FileReadError);
      expect(() => validateFilePath('/System/Library/Preferences')).toThrow(FileReadError);
    });

    it('should reject paths that are too long', () => {
      const longPath = 'a'.repeat(300) + '.sql';
      expect(() => validateFilePath(longPath)).toThrow(FileReadError);
    });

    it('should reject paths with invalid characters', () => {
      expect(() => validateFilePath('test<file>.sql')).toThrow(FileReadError);
      expect(() => validateFilePath('test|file.sql')).toThrow(FileReadError);
      expect(() => validateFilePath('test"file.sql')).toThrow(FileReadError);
    });
  });
});

describe('Size and Memory Validation', () => {
  describe('validateFileSize', () => {
    it('should accept valid file sizes', () => {
      expect(() => validateFileSize(1024)).not.toThrow();
      expect(() => validateFileSize(1024 * 1024)).not.toThrow();
    });

    it('should reject invalid size values', () => {
      expect(() => validateFileSize(-1)).toThrow(FileReadError);
      expect(() => validateFileSize('invalid' as any)).toThrow(FileReadError);
    });

    it('should reject sizes that exceed limits', () => {
      const limits: ValidationLimits = { ...DEFAULT_VALIDATION_LIMITS, maxFileSize: 1024 };
      expect(() => validateFileSize(2048, limits)).toThrow(FileReadError);
    });
  });

  describe('validateMemoryUsage', () => {
    it('should accept reasonable memory usage', () => {
      expect(() => validateMemoryUsage(1024 * 1024)).not.toThrow();
    });

    it('should reject excessive memory usage', () => {
      const limits: ValidationLimits = { ...DEFAULT_VALIDATION_LIMITS, maxMemoryUsage: 1024 };
      expect(() => validateMemoryUsage(2048, limits)).toThrow(SQLParseError);
    });
  });

  describe('validateTableCount', () => {
    it('should accept reasonable table counts', () => {
      expect(() => validateTableCount(10)).not.toThrow();
      expect(() => validateTableCount(100)).not.toThrow();
    });

    it('should reject invalid table counts', () => {
      expect(() => validateTableCount(-1)).toThrow(SQLParseError);
      expect(() => validateTableCount('invalid' as any)).toThrow(SQLParseError);
    });

    it('should reject excessive table counts', () => {
      const limits: ValidationLimits = { ...DEFAULT_VALIDATION_LIMITS, maxTableCount: 10 };
      expect(() => validateTableCount(20, limits)).toThrow(SQLParseError);
    });
  });

  describe('validateFieldCount', () => {
    it('should accept reasonable field counts', () => {
      expect(() => validateFieldCount(5, 'users')).not.toThrow();
      expect(() => validateFieldCount(50, 'products')).not.toThrow();
    });

    it('should reject invalid field counts', () => {
      expect(() => validateFieldCount(-1, 'users')).toThrow(SQLParseError);
      expect(() => validateFieldCount('invalid' as any, 'users')).toThrow(SQLParseError);
    });

    it('should reject excessive field counts', () => {
      const limits: ValidationLimits = { ...DEFAULT_VALIDATION_LIMITS, maxFieldCount: 10 };
      expect(() => validateFieldCount(20, 'users', limits)).toThrow(SQLParseError);
    });
  });
});

describe('Comprehensive Validation', () => {
  describe('validateForProcessing', () => {
    it('should accept valid SQL for processing', () => {
      const validSql = 'CREATE TABLE users (id INT PRIMARY KEY, name VARCHAR(100));';
      expect(() => validateForProcessing(validSql)).not.toThrow();
    });

    it('should reject SQL that fails any validation step', () => {
      const invalidSql = 'CREATE TABLE test; DROP TABLE users;';
      expect(() => validateForProcessing(invalidSql)).toThrow(SQLParseError);
    });

    it('should validate memory usage for large SQL', () => {
      const largeSql = 'CREATE TABLE test (id INT);'.repeat(1000);
      const limits: ValidationLimits = { ...DEFAULT_VALIDATION_LIMITS, maxMemoryUsage: 1000 };
      expect(() => validateForProcessing(largeSql, limits)).toThrow(SQLParseError);
    });
  });

  describe('validateAndConvertInput', () => {
    it('should convert and validate string input', () => {
      const input = 'CREATE TABLE users (id INT PRIMARY KEY);';
      const result = validateAndConvertInput(input);
      expect(result).toBe(input);
    });

    it('should convert and validate buffer input', () => {
      const input = Buffer.from('CREATE TABLE users (id INT PRIMARY KEY);', 'utf8');
      const result = validateAndConvertInput(input);
      expect(result).toBe('CREATE TABLE users (id INT PRIMARY KEY);');
    });

    it('should reject null or undefined input', () => {
      expect(() => validateAndConvertInput(null as any)).toThrow(SQLParseError);
      expect(() => validateAndConvertInput(undefined as any)).toThrow(SQLParseError);
    });

    it('should reject invalid input types', () => {
      expect(() => validateAndConvertInput(123 as any)).toThrow(SQLParseError);
      expect(() => validateAndConvertInput({} as any)).toThrow(SQLParseError);
    });

    it('should reject buffers that are too large', () => {
      const largeBuffer = Buffer.alloc(1024 * 1024);
      const limits: ValidationLimits = { ...DEFAULT_VALIDATION_LIMITS, maxFileSize: 1024 };
      expect(() => validateAndConvertInput(largeBuffer, limits)).toThrow(SQLParseError);
    });

    it('should reject buffers with invalid UTF-8', () => {
      const invalidBuffer = Buffer.from([0xFF, 0xFE, 0xFD]);
      expect(() => validateAndConvertInput(invalidBuffer)).toThrow(SQLParseError);
    });
  });
});

describe('Validation Limits', () => {
  describe('createValidationLimits', () => {
    it('should create limits with defaults', () => {
      const limits = createValidationLimits();
      expect(limits).toEqual(DEFAULT_VALIDATION_LIMITS);
    });

    it('should merge partial limits with defaults', () => {
      const partial = { maxTableCount: 50 };
      const limits = createValidationLimits(partial);
      expect(limits.maxTableCount).toBe(50);
      expect(limits.maxFileSize).toBe(DEFAULT_VALIDATION_LIMITS.maxFileSize);
    });
  });

  describe('validateLimits', () => {
    it('should accept valid limits', () => {
      expect(() => validateLimits(DEFAULT_VALIDATION_LIMITS)).not.toThrow();
    });

    it('should reject null or undefined limits', () => {
      expect(() => validateLimits(null as any)).toThrow();
      expect(() => validateLimits(undefined as any)).toThrow();
    });

    it('should reject non-object limits', () => {
      expect(() => validateLimits('invalid' as any)).toThrow();
    });

    it('should reject limits with missing fields', () => {
      const incomplete = { maxFileSize: 1024 } as any;
      expect(() => validateLimits(incomplete)).toThrow();
    });

    it('should reject limits with invalid values', () => {
      const invalid = { ...DEFAULT_VALIDATION_LIMITS, maxFileSize: -1 };
      expect(() => validateLimits(invalid)).toThrow();
    });

    it('should reject limits with invalid relationships', () => {
      const invalid = { 
        ...DEFAULT_VALIDATION_LIMITS, 
        maxSqlLength: 1000,
        maxFileSize: 500
      };
      expect(() => validateLimits(invalid)).toThrow();
    });
  });
});

describe('Integration Tests', () => {
  it('should handle real-world SQL with validation', () => {
    const realSql = `
      CREATE TABLE users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        email VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE posts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        title VARCHAR(200) NOT NULL,
        content TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `;
    
    expect(() => validateForProcessing(realSql)).not.toThrow();
    
    const sanitized = sanitizeSqlInput(realSql);
    expect(sanitized).toContain('CREATE TABLE users');
    expect(sanitized).toContain('CREATE TABLE posts');
  });

  it('should reject malicious SQL attempts', () => {
    const maliciousSql = `
      CREATE TABLE users (id INT);
      DROP TABLE users;
      INSERT INTO admin_users VALUES (1, 'hacker');
    `;
    
    expect(() => validateForProcessing(maliciousSql)).toThrow(SQLParseError);
  });

  it('should handle edge cases gracefully', () => {
    // Empty after sanitization
    const controlChars = '\x00\x01\x02\x03';
    expect(sanitizeSqlInput(controlChars)).toBe('');
    
    // Very long field names
    const longFieldSql = `CREATE TABLE test (${('a'.repeat(1000))} INT);`;
    expect(() => validateSqlInput(longFieldSql)).not.toThrow();
  });
});