import { TableSchema, ExtractorOptions, SQLDialect, SQLParseError } from '../types/index.js';
import { validateSqlInput, sanitizeSqlInput } from '../utils/validation.js';

/**
 * Basic SQL parser for extracting CREATE TABLE statements
 */
export class SQLParser {
  // Regex pattern to match CREATE TABLE statements
  private static readonly CREATE_TABLE_REGEX = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:`([^`]+)`|"([^"]+)"|(\w+))\s*\(((?:[^()]|\([^)]*\))*)\)(?:\s*ENGINE\s*=\s*\w+)?(?:\s*DEFAULT\s+CHARSET\s*=\s*[\w\-]+)?(?:\s*COLLATE\s*=\s*[\w_\-]+)?(?:\s*AUTO_INCREMENT\s*=\s*\d+)?(?:\s*COMMENT\s*=\s*'[^']*')?;?/gi;

  /**
   * Parse SQL content and extract CREATE TABLE statements
   * @param sql SQL content to parse
   * @param options Extractor options
   * @returns Array of raw table definitions
   */
  public static parse(sql: string, options: ExtractorOptions = {}): RawTableDefinition[] {
    // Validate SQL input using comprehensive validation
    validateSqlInput(sql);

    // Sanitize SQL input to remove potentially dangerous content
    const sanitizedSql = sanitizeSqlInput(sql);

    const tables: RawTableDefinition[] = [];
    let match: RegExpExecArray | null;

    // Reset regex lastIndex to ensure clean parsing
    this.CREATE_TABLE_REGEX.lastIndex = 0;

    // Parse on sanitized SQL but calculate line numbers from original
    while ((match = this.CREATE_TABLE_REGEX.exec(sanitizedSql)) !== null) {
      try {
        // Extract table name from the captured groups (handles different quote styles)
        const tableName = match[1] || match[2] || match[3];
        const fieldsString = match[4];

        if (!tableName) {
          throw new SQLParseError('Could not extract table name from CREATE TABLE statement');
        }

        if (!fieldsString) {
          throw new SQLParseError(`No field definitions found for table: ${tableName}`);
        }

        // Find the corresponding position in original SQL for accurate line numbers
        const originalMatch = sql.indexOf(tableName);
        const lineNumber = originalMatch >= 0 ? this.calculateLineNumber(sql, originalMatch) : 1;

        tables.push({
          name: tableName.trim(),
          fieldsString: fieldsString.trim(),
          lineNumber,
          originalMatch: match[0]
        });

      } catch (error) {
        if (error instanceof SQLParseError) {
          throw error;
        }
        throw new SQLParseError(`Error parsing CREATE TABLE statement: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    if (tables.length === 0) {
      throw new SQLParseError('No CREATE TABLE statements found in the provided SQL');
    }

    return tables;
  }

  /**
   * Extract CREATE TABLE statements from SQL content
   * @param sql SQL content
   * @returns Array of CREATE TABLE statement strings
   */
  public static extractCreateTableStatements(sql: string): string[] {
    const rawTables = this.parse(sql);
    return rawTables.map(table => table.originalMatch);
  }

  /**
   * Check if SQL content contains CREATE TABLE statements
   * @param sql SQL content to check
   * @returns True if CREATE TABLE statements are found
   */
  public static hasCreateTableStatements(sql: string): boolean {
    if (!sql || typeof sql !== 'string') {
      return false;
    }

    try {
      // Use basic validation but don't throw on failure
      const sanitizedSql = sanitizeSqlInput(sql);
      this.CREATE_TABLE_REGEX.lastIndex = 0;
      return this.CREATE_TABLE_REGEX.test(sanitizedSql);
    } catch {
      return false;
    }
  }

  /**
   * Calculate line number for a given position in the SQL string
   * @param sql SQL content
   * @param position Character position
   * @returns Line number (1-based)
   */
  private static calculateLineNumber(sql: string, position: number): number {
    if (position < 0 || position >= sql.length) {
      return 1;
    }

    const beforePosition = sql.substring(0, position);
    const lines = beforePosition.split('\n');
    return lines.length;
  }
}

/**
 * Raw table definition extracted from SQL
 */
export interface RawTableDefinition {
  name: string;
  fieldsString: string;
  lineNumber: number;
  originalMatch: string;
}