import { TableSchema, TableConstraint, TableConstraintType, ExtractorOptions, SQLParseError } from '../types/index.js';
import { SQLParser, RawTableDefinition } from './sql-parser.js';
import { FieldParser } from './field-parser.js';
import { validateTableCount, validateFieldCount } from '../utils/validation.js';

/**
 * Extractor that combines SQL parser and field parser to create complete TableSchema objects
 */
export class TableExtractor {
  // Regex patterns for table-level constraints
  private static readonly TABLE_CONSTRAINT_PATTERNS = {
    PRIMARY_KEY: /(?:^|\s|,)\s*(?:CONSTRAINT\s+\w+\s+)?PRIMARY\s+KEY\s*\(([^)]+)\)/gi,
    FOREIGN_KEY: /(?:^|\s|,)\s*(?:CONSTRAINT\s+(\w+)\s+)?FOREIGN\s+KEY\s*\(([^)]+)\)\s+REFERENCES\s+(\w+)\s*\(([^)]+)\)/gi,
    UNIQUE: /(?:^|\s|,)\s*(?:CONSTRAINT\s+(\w+)\s+)?UNIQUE(?:\s+KEY\s+(\w+))?\s*\(([^)]+)\)/gi,
    INDEX: /(?:^|\s|,)\s*(?:(?<!UNIQUE\s)KEY|INDEX)\s+(\w+)\s*\(([^)]+)\)/gi
  };

  /**
   * Extract complete table schemas from SQL content
   * @param sql SQL content containing CREATE TABLE statements
   * @param options Extractor options
   * @returns Array of TableSchema objects
   */
  public static extractTables(sql: string, options: ExtractorOptions = {}): TableSchema[] {
    if (!sql || typeof sql !== 'string') {
      throw new SQLParseError('Invalid SQL input: must be a non-empty string');
    }

    try {
      // Parse SQL to get raw table definitions
      const rawTables = SQLParser.parse(sql, options);
      
      // Validate table count
      validateTableCount(rawTables.length);
      
      // Convert each raw table to a complete TableSchema
      const tables: TableSchema[] = [];
      
      for (const rawTable of rawTables) {
        try {
          const tableSchema = this.extractTableSchema(rawTable, options);
          
          // Validate field count for this table
          validateFieldCount(tableSchema.fields.length, tableSchema.name);
          
          tables.push(tableSchema);
        } catch (error) {
          if (error instanceof SQLParseError) {
            throw new SQLParseError(
              `Error extracting table '${rawTable.name}': ${error.message}`,
              rawTable.lineNumber
            );
          }
          throw error;
        }
      }

      return tables;
    } catch (error) {
      if (error instanceof SQLParseError) {
        throw error;
      }
      throw new SQLParseError(`Error extracting tables: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract a single table schema from a raw table definition
   * @param rawTable Raw table definition from SQL parser
   * @param options Extractor options
   * @returns Complete TableSchema object
   */
  private static extractTableSchema(rawTable: RawTableDefinition, options: ExtractorOptions): TableSchema {
    try {
      // Parse fields from the fields string
      const fields = FieldParser.parseFields(rawTable.fieldsString);
      
      // Extract table-level constraints
      const constraints = this.extractTableConstraints(rawTable.fieldsString);
      
      return {
        name: rawTable.name,
        fields,
        constraints
      };
    } catch (error) {
      if (error instanceof SQLParseError) {
        throw error;
      }
      throw new SQLParseError(
        `Error processing table schema: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Extract table-level constraints from the fields string
   * @param fieldsString Raw fields string containing field and constraint definitions
   * @returns Array of TableConstraint objects
   */
  private static extractTableConstraints(fieldsString: string): TableConstraint[] {
    const constraints: TableConstraint[] = [];

    // Extract PRIMARY KEY constraints
    this.TABLE_CONSTRAINT_PATTERNS.PRIMARY_KEY.lastIndex = 0;
    let match: RegExpExecArray | null;
    
    while ((match = this.TABLE_CONSTRAINT_PATTERNS.PRIMARY_KEY.exec(fieldsString)) !== null) {
      if (match[1]) {
        const fields = this.parseFieldList(match[1]);
        constraints.push({
          type: TableConstraintType.PRIMARY_KEY,
          fields
        });
      }
    }

    // Extract FOREIGN KEY constraints
    this.TABLE_CONSTRAINT_PATTERNS.FOREIGN_KEY.lastIndex = 0;
    while ((match = this.TABLE_CONSTRAINT_PATTERNS.FOREIGN_KEY.exec(fieldsString)) !== null) {
      if (match[2] && match[3] && match[4]) {
        const constraintName = match[1];
        const fields = this.parseFieldList(match[2]);
        const referenceTable = match[3];
        const referenceFields = this.parseFieldList(match[4]);
        
        constraints.push({
          type: TableConstraintType.FOREIGN_KEY,
          fields,
          reference: {
            table: referenceTable,
            fields: referenceFields
          }
        });
      }
    }

    // Extract UNIQUE constraints
    this.TABLE_CONSTRAINT_PATTERNS.UNIQUE.lastIndex = 0;
    while ((match = this.TABLE_CONSTRAINT_PATTERNS.UNIQUE.exec(fieldsString)) !== null) {
      if (match[3]) {
        const constraintName = match[1];
        const indexName = match[2];
        const fields = this.parseFieldList(match[3]);
        
        constraints.push({
          type: TableConstraintType.UNIQUE,
          fields
        });
      }
    }

    // Extract INDEX constraints
    this.TABLE_CONSTRAINT_PATTERNS.INDEX.lastIndex = 0;
    while ((match = this.TABLE_CONSTRAINT_PATTERNS.INDEX.exec(fieldsString)) !== null) {
      if (match[1] && match[2]) {
        const indexName = match[1];
        const fields = this.parseFieldList(match[2]);
        
        constraints.push({
          type: TableConstraintType.INDEX,
          fields
        });
      }
    }

    return constraints;
  }

  /**
   * Parse a comma-separated list of field names
   * @param fieldList String containing comma-separated field names
   * @returns Array of cleaned field names
   */
  private static parseFieldList(fieldList: string): string[] {
    if (!fieldList) {
      return [];
    }

    return fieldList
      .split(',')
      .map(field => {
        // Remove quotes and whitespace
        let cleanField = field.trim();
        if ((cleanField.startsWith('`') && cleanField.endsWith('`')) ||
            (cleanField.startsWith('"') && cleanField.endsWith('"')) ||
            (cleanField.startsWith("'") && cleanField.endsWith("'"))) {
          cleanField = cleanField.slice(1, -1);
        }
        return cleanField.trim();
      })
      .filter(field => field.length > 0);
  }

  /**
   * Extract a single table schema from SQL content (convenience method)
   * @param sql SQL content containing a single CREATE TABLE statement
   * @param options Extractor options
   * @returns Single TableSchema object
   */
  public static extractSingleTable(sql: string, options: ExtractorOptions = {}): TableSchema {
    const tables = this.extractTables(sql, options);
    
    if (tables.length === 0) {
      throw new SQLParseError('No tables found in SQL content');
    }
    
    if (tables.length > 1) {
      throw new SQLParseError(`Expected single table, found ${tables.length} tables`);
    }
    
    return tables[0]!;
  }

  /**
   * Check if SQL content contains valid table definitions
   * @param sql SQL content to validate
   * @returns True if valid table definitions are found
   */
  public static hasValidTables(sql: string): boolean {
    try {
      const tables = this.extractTables(sql);
      return tables.length > 0;
    } catch {
      return false;
    }
  }
}