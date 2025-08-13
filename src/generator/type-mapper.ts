/**
 * Type Mapper - Maps SQL types to TypeScript types based on dialect
 */

import { SQLDialect, TypeMappingError } from '../types/index.js';

export interface CustomTypeMappings {
  [dialect: string]: {
    [sqlType: string]: string;
  };
}

export interface TypeMapperOptions {
  customMappings?: CustomTypeMappings;
  strictMode?: boolean; // If true, throw errors instead of warnings for unknown types
}

export class TypeMapper {
  private customMappings: CustomTypeMappings;
  private strictMode: boolean;
  private static readonly TYPE_MAPPINGS = {
    mysql: {
      'int': 'number',
      'bigint': 'number',
      'tinyint': 'number',
      'smallint': 'number',
      'mediumint': 'number',
      'float': 'number',
      'double': 'number',
      'decimal': 'number',
      'numeric': 'number',
      'varchar': 'string',
      'char': 'string',
      'text': 'string',
      'longtext': 'string',
      'mediumtext': 'string',
      'tinytext': 'string',
      'datetime': 'Date',
      'timestamp': 'Date',
      'date': 'Date',
      'time': 'string',
      'year': 'number',
      'boolean': 'boolean',
      'tinyint(1)': 'boolean',
      'bit': 'boolean',
      'json': 'object',
      'blob': 'Buffer',
      'longblob': 'Buffer',
      'mediumblob': 'Buffer',
      'tinyblob': 'Buffer',
      'binary': 'Buffer',
      'varbinary': 'Buffer'
    },
    postgresql: {
      'integer': 'number',
      'int': 'number',
      'int4': 'number',
      'bigint': 'number',
      'int8': 'number',
      'smallint': 'number',
      'int2': 'number',
      'real': 'number',
      'float4': 'number',
      'double precision': 'number',
      'float8': 'number',
      'numeric': 'number',
      'decimal': 'number',
      'varchar': 'string',
      'character varying': 'string',
      'char': 'string',
      'character': 'string',
      'text': 'string',
      'timestamp': 'Date',
      'timestamptz': 'Date',
      'timestamp with time zone': 'Date',
      'timestamp without time zone': 'Date',
      'date': 'Date',
      'time': 'string',
      'timetz': 'string',
      'time with time zone': 'string',
      'time without time zone': 'string',
      'boolean': 'boolean',
      'bool': 'boolean',
      'json': 'object',
      'jsonb': 'object',
      'uuid': 'string',
      'bytea': 'Buffer',
      'serial': 'number',
      'bigserial': 'number',
      'smallserial': 'number'
    },
    sqlite: {
      'integer': 'number',
      'int': 'number',
      'real': 'number',
      'float': 'number',
      'double': 'number',
      'text': 'string',
      'varchar': 'string',
      'char': 'string',
      'blob': 'Buffer',
      'numeric': 'number',
      'decimal': 'number',
      'boolean': 'boolean',
      'datetime': 'Date',
      'timestamp': 'Date',
      'date': 'Date',
      'time': 'string'
    }
  };

  constructor(options: TypeMapperOptions = {}) {
    this.customMappings = options.customMappings || {};
    this.strictMode = options.strictMode || false;
  }

  /**
   * Detects the SQL dialect from SQL content
   * @param sqlContent The SQL content to analyze
   * @returns The detected SQL dialect
   */
  static detectDialect(sqlContent: string): SQLDialect {
    const content = sqlContent.toLowerCase();
    
    // PostgreSQL-specific indicators
    if (content.includes('serial') || 
        content.includes('bigserial') || 
        content.includes('smallserial') ||
        content.includes('timestamptz') ||
        content.includes('jsonb') ||
        content.includes('uuid') ||
        content.includes('bytea') ||
        content.includes('double precision') ||
        content.includes('character varying')) {
      return SQLDialect.POSTGRESQL;
    }
    
    // MySQL-specific indicators
    if (content.includes('auto_increment') ||
        content.includes('tinyint') ||
        content.includes('mediumint') ||
        content.includes('longtext') ||
        content.includes('mediumtext') ||
        content.includes('tinytext') ||
        content.includes('longblob') ||
        content.includes('mediumblob') ||
        content.includes('tinyblob') ||
        content.includes('engine=') ||
        content.includes('charset=') ||
        content.includes('collate=')) {
      return SQLDialect.MYSQL;
    }
    
    // SQLite-specific indicators (less distinctive, so check last)
    if (content.includes('autoincrement') ||
        content.includes('without rowid') ||
        content.includes('pragma')) {
      return SQLDialect.SQLITE;
    }
    
    // Default to MySQL if no specific indicators found
    return SQLDialect.MYSQL;
  }

  /**
   * Maps a SQL type to its corresponding TypeScript type
   * @param sqlType The SQL type to map (e.g., 'VARCHAR(255)', 'INT', 'DATETIME')
   * @param dialect The SQL dialect to use for mapping
   * @returns The corresponding TypeScript type
   */
  mapType(sqlType: string, dialect: SQLDialect = SQLDialect.MYSQL): string {
    if (!sqlType) {
      console.warn('Empty SQL type provided, defaulting to "any"');
      return 'any';
    }

    // Clean and lowercase the type for processing
    const cleanType = sqlType.toLowerCase().trim();
    
    // Get the mapping for the specified dialect
    const dialectMappings = this.getMergedMappings(dialect);
    
    if (!dialectMappings) {
      const message = `Unsupported dialect "${dialect}", defaulting to MySQL mappings`;
      if (this.strictMode) {
        throw new TypeMappingError(message, sqlType, dialect);
      }
      console.warn(message);
      return this.mapType(sqlType, SQLDialect.MYSQL);
    }

    // Handle special cases before normalization
    const specialCase = this.handleSpecialCases(cleanType, dialect, dialectMappings);
    if (specialCase) {
      return specialCase;
    }

    // Normalize the SQL type by removing size specifications and converting to lowercase
    const normalizedType = this.normalizeType(cleanType);

    // Try to find exact match first
    if (dialectMappings[normalizedType]) {
      return dialectMappings[normalizedType];
    }

    // Try to find partial matches for complex types
    const partialMatch = this.findPartialMatch(normalizedType, dialectMappings);
    if (partialMatch) {
      return partialMatch;
    }

    // If no mapping found, handle based on strict mode
    const message = `Unrecognized SQL type "${sqlType}" for dialect "${dialect}"`;
    if (this.strictMode) {
      throw new TypeMappingError(message, sqlType, dialect);
    }
    
    console.warn(`${message}, defaulting to "any"`);
    return 'any';
  }

  /**
   * Gets merged mappings combining default and custom mappings for a dialect
   * @param dialect The SQL dialect
   * @returns The merged mappings or null if dialect is unsupported
   */
  private getMergedMappings(dialect: SQLDialect): Record<string, string> | null {
    // Handle AUTO dialect by detecting from content or defaulting to MySQL
    let actualDialect = dialect;
    if (dialect === SQLDialect.AUTO) {
      actualDialect = SQLDialect.MYSQL; // Default to MySQL for AUTO
    }

    const defaultMappings = TypeMapper.TYPE_MAPPINGS[actualDialect as keyof typeof TypeMapper.TYPE_MAPPINGS];
    if (!defaultMappings) {
      return null;
    }

    const customMappings = this.customMappings[actualDialect] || {};
    
    // Merge custom mappings over default mappings
    return { ...defaultMappings, ...customMappings };
  }

  /**
   * Handles special cases that need to be processed before normalization
   * @param cleanType The cleaned SQL type
   * @param dialect The SQL dialect
   * @param mappings The dialect-specific mappings
   * @returns The mapped TypeScript type or null if no special case applies
   */
  private handleSpecialCases(cleanType: string, dialect: SQLDialect, mappings: Record<string, string>): string | null {
    // Handle MySQL-specific special cases
    if (dialect === SQLDialect.MYSQL) {
      // TINYINT(1) as boolean
      if (cleanType.match(/^tinyint\s*\(\s*1\s*\)/)) {
        return mappings['tinyint(1)'] || 'boolean';
      }
      
      // ENUM types as string
      if (cleanType.match(/^enum\s*\(/)) {
        return 'string';
      }
      
      // SET types as string
      if (cleanType.match(/^set\s*\(/)) {
        return 'string';
      }
    }

    // Handle PostgreSQL-specific special cases
    if (dialect === SQLDialect.POSTGRESQL) {
      // Array types
      if (cleanType.includes('[]')) {
        const baseType = cleanType.replace(/\[\]$/, '').trim();
        const baseMapping = this.mapType(baseType, dialect);
        return `${baseMapping}[]`;
      }
      
      // ENUM types as string
      if (cleanType.match(/^enum\s*\(/)) {
        return 'string';
      }
    }

    // Handle SQLite-specific special cases
    if (dialect === SQLDialect.SQLITE) {
      // SQLite is more flexible with types, but we can handle some common patterns
      if (cleanType.includes('int') && !cleanType.includes('point')) {
        return 'number';
      }
    }

    return null;
  }

  /**
   * Normalizes a SQL type by removing size specifications and converting to lowercase
   * @param sqlType The raw SQL type
   * @returns The normalized type
   */
  private normalizeType(sqlType: string): string {
    return sqlType
      .toLowerCase()
      .trim()
      // Remove size specifications like VARCHAR(255) -> varchar
      .replace(/\([^)]*\)/g, '')
      // Remove UNSIGNED, SIGNED keywords
      .replace(/\s+(unsigned|signed)$/i, '')
      // Remove extra whitespace
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Finds partial matches for complex SQL types
   * @param normalizedType The normalized SQL type
   * @param mappings The dialect-specific mappings
   * @returns The matched TypeScript type or null
   */
  private findPartialMatch(normalizedType: string, mappings: Record<string, string>): string | null {
    // Handle special cases like TINYINT(1) for MySQL boolean
    if (normalizedType === 'tinyint' && mappings['tinyint(1)']) {
      // For MySQL, TINYINT without size could be boolean, but we'll default to number
      // The specific TINYINT(1) case will be handled in dialect-specific logic
      return mappings['tinyint'] || 'number';
    }

    // Try to match the base type for compound types
    const baseType = normalizedType.split(' ')[0];
    if (baseType && mappings[baseType]) {
      return mappings[baseType];
    }

    return null;
  }

  /**
   * Gets all supported SQL types for a given dialect (including custom mappings)
   * @param dialect The SQL dialect
   * @returns Array of supported SQL types
   */
  getSupportedTypes(dialect: SQLDialect): string[] {
    const mappings = this.getMergedMappings(dialect);
    return mappings ? Object.keys(mappings) : [];
  }

  /**
   * Checks if a SQL type is supported for a given dialect
   * @param sqlType The SQL type to check
   * @param dialect The SQL dialect
   * @returns True if the type is supported
   */
  isTypeSupported(sqlType: string, dialect: SQLDialect): boolean {
    const normalizedType = this.normalizeType(sqlType);
    const mappings = this.getMergedMappings(dialect);
    
    if (!mappings) {
      return false;
    }

    return mappings[normalizedType] !== undefined || 
           this.findPartialMatch(normalizedType, mappings) !== null;
  }

  /**
   * Adds a custom type mapping for a specific dialect
   * @param dialect The SQL dialect
   * @param sqlType The SQL type
   * @param tsType The corresponding TypeScript type
   */
  addCustomMapping(dialect: SQLDialect, sqlType: string, tsType: string): void {
    if (!this.customMappings[dialect]) {
      this.customMappings[dialect] = {};
    }
    this.customMappings[dialect][sqlType.toLowerCase()] = tsType;
  }

  /**
   * Removes a custom type mapping for a specific dialect
   * @param dialect The SQL dialect
   * @param sqlType The SQL type to remove
   */
  removeCustomMapping(dialect: SQLDialect, sqlType: string): void {
    if (this.customMappings[dialect]) {
      delete this.customMappings[dialect][sqlType.toLowerCase()];
    }
  }

  /**
   * Gets all custom mappings for a dialect
   * @param dialect The SQL dialect
   * @returns The custom mappings object
   */
  getCustomMappings(dialect: SQLDialect): Record<string, string> {
    return this.customMappings[dialect] || {};
  }

  /**
   * Clears all custom mappings for a dialect
   * @param dialect The SQL dialect
   */
  clearCustomMappings(dialect: SQLDialect): void {
    if (this.customMappings[dialect]) {
      this.customMappings[dialect] = {};
    }
  }

  /**
   * Gets the default type mappings for a dialect (without custom mappings)
   * @param dialect The SQL dialect
   * @returns The default mappings
   */
  static getDefaultMappings(dialect: SQLDialect): Record<string, string> {
    // Handle AUTO dialect by defaulting to MySQL
    let actualDialect = dialect;
    if (dialect === SQLDialect.AUTO) {
      actualDialect = SQLDialect.MYSQL;
    }
    
    return TypeMapper.TYPE_MAPPINGS[actualDialect as keyof typeof TypeMapper.TYPE_MAPPINGS] || {};
  }
}