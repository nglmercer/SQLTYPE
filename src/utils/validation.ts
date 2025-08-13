/**
 * Input validation and sanitization utilities
 * Provides comprehensive validation for SQL input, file paths, and memory management
 */

import { SQLParseError, FileReadError } from '../types/index.js';

/**
 * Configuration for validation limits
 */
export interface ValidationLimits {
  maxSqlLength: number;
  maxFileSize: number;
  maxMemoryUsage: number;
  maxTableCount: number;
  maxFieldCount: number;
}

/**
 * Default validation limits
 */
export const DEFAULT_VALIDATION_LIMITS: ValidationLimits = {
  maxSqlLength: 50 * 1024 * 1024, // 50MB of SQL text
  maxFileSize: 100 * 1024 * 1024, // 100MB file size
  maxMemoryUsage: 200 * 1024 * 1024, // 200MB memory usage
  maxTableCount: 1000, // Maximum number of tables
  maxFieldCount: 500 // Maximum fields per table
};

/**
 * SQL injection patterns to detect and prevent
 * These patterns are designed to catch malicious SQL while allowing legitimate CREATE TABLE statements
 */
const DANGEROUS_SQL_PATTERNS = [
  // Multiple statements with dangerous combinations (but allow legitimate INSERT INTO)
  /;\s*(DROP|DELETE|UPDATE|ALTER)\s+/gi,
  // Dangerous INSERT patterns (not legitimate INSERT INTO table)
  /;\s*INSERT\s+(?!INTO\s+[`\w]+\s*\()/gi,
  // UNION attacks
  /\bUNION\b.*\bSELECT\b/gi,
  // Script injection
  /<script[^>]*>.*?<\/script>/gi,
  // Command injection (but allow backticks in field names and HTML entities)
  /(\||\$\(|\$\{)/g,
  // Dangerous shell operators (but not HTML entities)
  /&(?![a-zA-Z]+;)/g,
  // Path traversal in SQL comments
  /\/\*.*\.\.[\/\\].*\*\//gi,
  // Suspicious hex patterns (very long hex strings that might be shellcode)
  /0x[0-9a-f]{16,}/gi,
  // SQL injection with comments to bypass filters
  /\/\*.*\*\/.*\b(DROP|DELETE|UPDATE|UNION|SELECT)\b/gi
];

/**
 * Patterns that indicate potentially malformed SQL
 */
const MALFORMED_SQL_PATTERNS = [
  // Excessive nested parentheses (potential DoS)
  /\({10,}/g,
  // CREATE TABLE without any parentheses at all
  /CREATE\s+TABLE\s+\w+\s*;?\s*$/gi
];

/**
 * Check for unmatched parentheses and quotes in SQL
 * @param sql SQL content to check
 * @returns true if SQL has unmatched delimiters
 */
function hasUnmatchedDelimiters(sql: string): boolean {
  let parenCount = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inBacktick = false;
  
  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    const prevChar = i > 0 ? sql[i - 1] : '';
    
    // Skip escaped characters
    if (prevChar === '\\') {
      continue;
    }
    
    // Handle quotes
    if (char === "'" && !inDoubleQuote && !inBacktick) {
      inSingleQuote = !inSingleQuote;
    } else if (char === '"' && !inSingleQuote && !inBacktick) {
      inDoubleQuote = !inDoubleQuote;
    } else if (char === '`' && !inSingleQuote && !inDoubleQuote) {
      inBacktick = !inBacktick;
    }
    
    // Handle parentheses (only when not inside quotes)
    if (!inSingleQuote && !inDoubleQuote && !inBacktick) {
      if (char === '(') {
        parenCount++;
      } else if (char === ')') {
        parenCount--;
        if (parenCount < 0) {
          return true; // More closing than opening
        }
      }
    }
  }
  
  // Check for unmatched delimiters
  return parenCount !== 0 || inSingleQuote || inDoubleQuote || inBacktick;
}

/**
 * Validates SQL input for security and format issues
 * @param sql SQL content to validate
 * @param limits Validation limits to apply
 * @throws {SQLParseError} If SQL is invalid or potentially dangerous
 */
export function validateSqlInput(sql: string, limits: ValidationLimits = DEFAULT_VALIDATION_LIMITS): void {
  // Basic type and null checks
  if (sql === null || sql === undefined) {
    throw new SQLParseError('SQL input cannot be null or undefined');
  }

  if (typeof sql !== 'string') {
    throw new SQLParseError('SQL input must be a string');
  }

  // Length validation
  if (sql.length === 0) {
    throw new SQLParseError('SQL input cannot be empty');
  }

  if (sql.length > limits.maxSqlLength) {
    throw new SQLParseError(
      `SQL input too large: ${sql.length} bytes exceeds maximum of ${limits.maxSqlLength} bytes`
    );
  }

  // Check for dangerous patterns that might indicate SQL injection
  for (const pattern of DANGEROUS_SQL_PATTERNS) {
    pattern.lastIndex = 0; // Reset regex state
    if (pattern.test(sql)) {
      throw new SQLParseError('SQL input contains potentially dangerous patterns');
    }
  }

  // Check for malformed SQL patterns
  for (const pattern of MALFORMED_SQL_PATTERNS) {
    pattern.lastIndex = 0; // Reset regex state
    if (pattern.test(sql)) {
      throw new SQLParseError('SQL input appears to be malformed or incomplete');
    }
  }

  // Check for unmatched delimiters
  if (hasUnmatchedDelimiters(sql)) {
    throw new SQLParseError('SQL input has unmatched parentheses, quotes, or backticks');
  }

  // Check for excessive whitespace or control characters
  const controlCharCount = (sql.match(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g) || []).length;
  if (controlCharCount > sql.length * 0.01) {
    throw new SQLParseError('SQL input contains excessive control characters');
  }

  // Basic structure validation - must contain CREATE TABLE
  if (!/CREATE\s+TABLE/gi.test(sql)) {
    throw new SQLParseError('SQL input must contain at least one CREATE TABLE statement');
  }
}

/**
 * Sanitizes SQL input by removing or escaping potentially dangerous content
 * @param sql SQL content to sanitize
 * @returns Sanitized SQL content
 */
export function sanitizeSqlInput(sql: string): string {
  if (!sql || typeof sql !== 'string') {
    return '';
  }

  let sanitized = sql;

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');

  // Remove excessive whitespace
  sanitized = sanitized.replace(/\s{4,}/g, ' ');

  // Remove control characters except newlines and tabs
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Normalize line endings
  sanitized = sanitized.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  return sanitized.trim();
}

/**
 * Validates file path for security issues
 * @param filePath File path to validate
 * @throws {FileReadError} If path is invalid or potentially dangerous
 */
export function validateFilePath(filePath: string): void {
  if (!filePath || typeof filePath !== 'string') {
    throw new FileReadError('File path must be a non-empty string', filePath || '');
  }

  // Check for null bytes
  if (filePath.includes('\0')) {
    throw new FileReadError('File path contains null bytes', filePath);
  }

  // Check for path traversal attempts
  if (filePath.includes('..')) {
    throw new FileReadError('Path traversal detected in file path', filePath);
  }

  // Check for absolute paths that might be dangerous
  const dangerousPaths = [
    '/etc/',
    '/proc/',
    '/sys/',
    '/dev/',
    'C:\\Windows\\',
    'C:\\System32\\',
    '/System/',
    '/Library/'
  ];

  const normalizedPath = filePath.toLowerCase().replace(/\\/g, '/');
  for (const dangerousPath of dangerousPaths) {
    if (normalizedPath.includes(dangerousPath.toLowerCase())) {
      throw new FileReadError('File path points to restricted system directory', filePath);
    }
  }

  // Check path length
  if (filePath.length > 260) { // Windows MAX_PATH limit
    throw new FileReadError('File path too long', filePath);
  }

  // Check for invalid characters
  const invalidChars = /[<>:"|?*]/;
  if (invalidChars.test(filePath)) {
    throw new FileReadError('File path contains invalid characters', filePath);
  }
}

/**
 * Validates file size against limits
 * @param size File size in bytes
 * @param limits Validation limits
 * @param filePath File path for error reporting
 * @throws {FileReadError} If file size exceeds limits
 */
export function validateFileSize(size: number, limits: ValidationLimits = DEFAULT_VALIDATION_LIMITS, filePath: string = ''): void {
  if (typeof size !== 'number' || size < 0) {
    throw new FileReadError('Invalid file size', filePath);
  }

  if (size > limits.maxFileSize) {
    throw new FileReadError(
      `File size ${size} bytes exceeds maximum allowed size of ${limits.maxFileSize} bytes`,
      filePath
    );
  }
}

/**
 * Estimates memory usage for processing SQL content
 * @param sqlLength Length of SQL content
 * @param tableCount Estimated number of tables
 * @returns Estimated memory usage in bytes
 */
export function estimateMemoryUsage(sqlLength: number, tableCount: number = 1): number {
  // Rough estimation: SQL content + parsing overhead + result objects
  const sqlMemory = sqlLength * 2; // String storage overhead
  const parsingMemory = sqlLength * 0.5; // Parsing temporary objects
  const resultMemory = tableCount * 10000; // Estimated result object size per table
  
  return sqlMemory + parsingMemory + resultMemory;
}

/**
 * Validates memory usage against limits
 * @param estimatedUsage Estimated memory usage in bytes
 * @param limits Validation limits
 * @throws {SQLParseError} If estimated memory usage exceeds limits
 */
export function validateMemoryUsage(estimatedUsage: number, limits: ValidationLimits = DEFAULT_VALIDATION_LIMITS): void {
  if (estimatedUsage > limits.maxMemoryUsage) {
    throw new SQLParseError(
      `Estimated memory usage ${Math.round(estimatedUsage / 1024 / 1024)}MB exceeds limit of ${Math.round(limits.maxMemoryUsage / 1024 / 1024)}MB`
    );
  }
}

/**
 * Validates the number of tables against limits
 * @param tableCount Number of tables
 * @param limits Validation limits
 * @throws {SQLParseError} If table count exceeds limits
 */
export function validateTableCount(tableCount: number, limits: ValidationLimits = DEFAULT_VALIDATION_LIMITS): void {
  if (typeof tableCount !== 'number' || tableCount < 0) {
    throw new SQLParseError('Invalid table count');
  }

  if (tableCount > limits.maxTableCount) {
    throw new SQLParseError(
      `Table count ${tableCount} exceeds maximum allowed count of ${limits.maxTableCount}`
    );
  }
}

/**
 * Validates the number of fields in a table against limits
 * @param fieldCount Number of fields
 * @param tableName Table name for error reporting
 * @param limits Validation limits
 * @throws {SQLParseError} If field count exceeds limits
 */
export function validateFieldCount(fieldCount: number, tableName: string = '', limits: ValidationLimits = DEFAULT_VALIDATION_LIMITS): void {
  if (typeof fieldCount !== 'number' || fieldCount < 0) {
    throw new SQLParseError(`Invalid field count for table ${tableName}`);
  }

  if (fieldCount > limits.maxFieldCount) {
    throw new SQLParseError(
      `Field count ${fieldCount} in table '${tableName}' exceeds maximum allowed count of ${limits.maxFieldCount}`
    );
  }
}

/**
 * Comprehensive validation for SQL processing
 * @param sql SQL content to validate
 * @param limits Validation limits
 * @throws {SQLParseError} If validation fails
 */
export function validateForProcessing(sql: string, limits: ValidationLimits = DEFAULT_VALIDATION_LIMITS): void {
  // Validate SQL input
  validateSqlInput(sql, limits);

  // Estimate table count for memory validation
  const estimatedTableCount = (sql.match(/CREATE\s+TABLE/gi) || []).length;
  validateTableCount(estimatedTableCount, limits);

  // Estimate and validate memory usage
  const estimatedMemory = estimateMemoryUsage(sql.length, estimatedTableCount);
  validateMemoryUsage(estimatedMemory, limits);
}

/**
 * Validates buffer input and converts to string safely
 * @param input Buffer or string input
 * @param limits Validation limits
 * @returns Validated string content
 * @throws {SQLParseError} If input is invalid
 */
export function validateAndConvertInput(input: string | Buffer, limits: ValidationLimits = DEFAULT_VALIDATION_LIMITS): string {
  if (!input) {
    throw new SQLParseError('Input cannot be null or undefined');
  }

  let sqlContent: string;

  if (Buffer.isBuffer(input)) {
    // Validate buffer size
    if (input.length > limits.maxFileSize) {
      throw new SQLParseError(
        `Buffer size ${input.length} bytes exceeds maximum allowed size of ${limits.maxFileSize} bytes`
      );
    }

    // Convert buffer to string
    try {
      sqlContent = input.toString('utf8');
    } catch (error) {
      throw new SQLParseError('Failed to convert buffer to string: invalid UTF-8 encoding');
    }
  } else if (typeof input === 'string') {
    sqlContent = input;
  } else {
    throw new SQLParseError('Input must be a string or Buffer');
  }

  // Validate the resulting string
  validateSqlInput(sqlContent, limits);

  return sqlContent;
}

/**
 * Creates validation limits from partial configuration
 * @param partialLimits Partial validation limits
 * @returns Complete validation limits with defaults
 */
export function createValidationLimits(partialLimits: Partial<ValidationLimits> = {}): ValidationLimits {
  return {
    ...DEFAULT_VALIDATION_LIMITS,
    ...partialLimits
  };
}

/**
 * Validates that validation limits are reasonable
 * @param limits Validation limits to validate
 * @throws {Error} If limits are invalid
 */
export function validateLimits(limits: ValidationLimits): void {
  if (!limits || typeof limits !== 'object') {
    throw new Error('Validation limits must be an object');
  }

  const requiredFields: (keyof ValidationLimits)[] = [
    'maxSqlLength',
    'maxFileSize', 
    'maxMemoryUsage',
    'maxTableCount',
    'maxFieldCount'
  ];

  for (const field of requiredFields) {
    const value = limits[field];
    if (typeof value !== 'number' || value <= 0) {
      throw new Error(`Validation limit '${field}' must be a positive number`);
    }
  }

  // Validate relationships between limits
  if (limits.maxSqlLength > limits.maxFileSize) {
    throw new Error('maxSqlLength cannot be greater than maxFileSize');
  }

  if (limits.maxMemoryUsage < limits.maxFileSize) {
    throw new Error('maxMemoryUsage should be at least as large as maxFileSize');
  }
}