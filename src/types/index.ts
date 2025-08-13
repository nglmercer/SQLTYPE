/**
 * Core type definitions for SQL schema extraction and TypeScript generation
 */

// Enums for supported SQL dialects
export enum SQLDialect {
  MYSQL = 'mysql',
  POSTGRESQL = 'postgresql',
  SQLITE = 'sqlite',
  AUTO = 'auto'
}

// Enums for constraint types
export enum FieldConstraintType {
  PRIMARY_KEY = 'PRIMARY_KEY',
  UNIQUE = 'UNIQUE',
  FOREIGN_KEY = 'FOREIGN_KEY',
  CHECK = 'CHECK',
  AUTO_INCREMENT = 'AUTO_INCREMENT'
}

export enum TableConstraintType {
  PRIMARY_KEY = 'PRIMARY_KEY',
  FOREIGN_KEY = 'FOREIGN_KEY',
  UNIQUE = 'UNIQUE',
  INDEX = 'INDEX'
}

export interface FieldConstraint {
  type: FieldConstraintType;
  value?: string;
}

export interface TableConstraint {
  type: TableConstraintType;
  fields: string[];
  reference?: {
    table: string;
    fields: string[];
  };
}

export interface FieldSchema {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: string | undefined;
  constraints: FieldConstraint[];
  comment?: string | undefined;
}

export interface TableSchema {
  name: string;
  fields: FieldSchema[];
  constraints: TableConstraint[];
}

export interface ExtractorOptions {
  dialect?: SQLDialect;
  includeComments?: boolean;
  caseSensitive?: boolean;
}

export interface GeneratorOptions {
  naming?: 'camelCase' | 'PascalCase' | 'snake_case' | 'preserve';
  optionalFields?: boolean;
  prefix?: string;
  suffix?: string;
  includeComments?: boolean;
  exportType?: 'interface' | 'type';
}

export interface CustomTypeMappings {
  [dialect: string]: {
    [sqlType: string]: string;
  };
}

export interface TypeMapperOptions {
  customMappings?: CustomTypeMappings;
  strictMode?: boolean;
}

// Error classes
export class SQLParseError extends Error {
  constructor(message: string, public line?: number, public column?: number) {
    super(message);
    this.name = 'SQLParseError';
  }
}

export class TypeMappingError extends Error {
  constructor(message: string, public sqlType: string, public dialect: string) {
    super(message);
    this.name = 'TypeMappingError';
  }
}

export class FileReadError extends Error {
  constructor(message: string, public filePath: string) {
    super(message);
    this.name = 'FileReadError';
  }
}