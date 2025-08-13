/**
 * TypeScript Generator - Converts TableSchema objects to TypeScript interfaces
 */

import { TableSchema, FieldSchema, GeneratorOptions } from '../types/index.js';
import { TypeMapper } from './type-mapper.js';
import { applyNamingConvention, capitalize } from '../utils/string-utils.js';

export class TypeScriptGenerator {
  private typeMapper: TypeMapper;

  constructor(typeMapper?: TypeMapper) {
    this.typeMapper = typeMapper || new TypeMapper();
  }

  /**
   * Generates TypeScript interfaces from table schemas
   * @param schemas Array of table schemas to convert
   * @param options Generation options
   * @returns Generated TypeScript code as string
   */
  generate(schemas: TableSchema[], options: GeneratorOptions = {}): string {
    if (!schemas || schemas.length === 0) {
      return '';
    }

    const generatedInterfaces = schemas.map(schema => 
      this.generateInterface(schema, options)
    ).filter(Boolean);

    // Add file header comment if comments are enabled
    let fileHeader = '';
    if (options.includeComments) {
      fileHeader = this.generateFileHeader(schemas.length);
    }

    const code = fileHeader + generatedInterfaces.join('\n\n');
    return this.formatCode(code);
  }

  /**
   * Generates a single TypeScript interface from a table schema
   * @param schema The table schema to convert
   * @param options Generation options
   * @returns Generated TypeScript interface as string
   */
  private generateInterface(schema: TableSchema, options: GeneratorOptions): string {
    const interfaceName = this.formatInterfaceName(schema.name, options);
    
    // Generate JSDoc comment for the interface if comments are enabled
    let interfaceComment = '';
    if (options.includeComments) {
      interfaceComment = this.generateInterfaceComment(schema);
    }
    
    // Generate field declarations
    const fieldDeclarations = schema.fields.map(field => 
      this.generateFieldDeclaration(field, options)
    ).join('\n');

    // Build the interface or type
    const declaration = options.exportType === 'type' 
      ? `export type ${interfaceName} = {`
      : `export interface ${interfaceName} {`;

    return `${interfaceComment}${declaration}
${fieldDeclarations}
}`;
  }

  /**
   * Generates a TypeScript field declaration from a field schema
   * @param field The field schema to convert
   * @param options Generation options
   * @returns Generated field declaration as string
   */
  private generateFieldDeclaration(field: FieldSchema, options: GeneratorOptions): string {
    const fieldName = this.formatFieldName(field.name, options);
    const tsType = this.typeMapper.mapType(field.type);
    
    // Determine if field is optional
    const isOptional = this.isFieldOptional(field, options);
    const optionalMarker = isOptional ? '?' : '';
    
    // Handle nullable types
    const finalType = this.getFinalFieldType(field, tsType, options);
    
    // Generate JSDoc comment for the field if comments are enabled and field has a comment
    let fieldComment = '';
    if (options.includeComments && field.comment) {
      fieldComment = this.generateFieldComment(field);
    }
    
    // Generate the field declaration with proper indentation
    const fieldDeclaration = `  ${fieldName}${optionalMarker}: ${finalType};`;
    
    return fieldComment ? `${fieldComment}${fieldDeclaration}` : fieldDeclaration;
  }

  /**
   * Determines if a field should be marked as optional in TypeScript
   * @param field The field schema
   * @param options Generation options
   * @returns True if field should be optional
   */
  private isFieldOptional(field: FieldSchema, options: GeneratorOptions): boolean {
    // If optionalFields option is enabled, all fields are optional
    if (options.optionalFields) {
      return true;
    }

    // Field is optional if it has a default value
    return field.defaultValue !== undefined;
  }

  /**
   * Gets the final TypeScript type for a field, handling nullable types
   * @param field The field schema
   * @param baseType The base TypeScript type
   * @param options Generation options
   * @returns The final TypeScript type
   */
  private getFinalFieldType(field: FieldSchema, baseType: string, options: GeneratorOptions): string {
    // If field is nullable and not optional, add null union
    if (field.nullable && !this.isFieldOptional(field, options)) {
      return `${baseType} | null`;
    }

    return baseType;
  }

  /**
   * Formats an interface name according to naming conventions
   * @param tableName The original table name
   * @param options Generation options
   * @returns Formatted interface name
   */
  private formatInterfaceName(tableName: string, options: GeneratorOptions): string {
    let name = tableName;

    // Apply naming convention first
    name = applyNamingConvention(name, options.naming || 'preserve');

    // Apply prefix and suffix
    if (options.prefix) {
      // Ensure the table name part is capitalized when adding prefix
      const capitalizedName = capitalize(name);
      name = options.prefix + capitalizedName;
    }
    if (options.suffix) {
      name = name + options.suffix;
    }

    // Ensure first character is uppercase for interface names (TypeScript convention)
    // unless it's snake_case or preserve mode
    if (options.naming !== 'snake_case' && options.naming !== 'preserve') {
      name = capitalize(name);
    }

    return name;
  }

  /**
   * Formats a field name according to naming conventions
   * @param fieldName The original field name
   * @param options Generation options
   * @returns Formatted field name
   */
  private formatFieldName(fieldName: string, options: GeneratorOptions): string {
    return applyNamingConvention(fieldName, options.naming || 'preserve');
  }



  /**
   * Generates file header comment for the generated TypeScript file
   * @param tableCount Number of tables being generated
   * @returns File header comment string
   */
  private generateFileHeader(tableCount: number): string {
    const timestamp = new Date().toISOString();
    return `/**
 * Auto-generated TypeScript interfaces from SQL schema
 * Generated on: ${timestamp}
 * Total interfaces: ${tableCount}
 * 
 * @warning This file is auto-generated. Do not edit manually.
 */

`;
  }

  /**
   * Generates JSDoc comment for an interface
   * @param schema The table schema
   * @returns JSDoc comment string
   */
  private generateInterfaceComment(schema: TableSchema): string {
    const tableName = schema.name;
    const fieldCount = schema.fields.length;
    
    return `/**
 * TypeScript interface for the '${tableName}' table
 * Generated from SQL schema with ${fieldCount} field${fieldCount !== 1 ? 's' : ''}
 */
`;
  }

  /**
   * Generates JSDoc comment for a field
   * @param field The field schema
   * @returns JSDoc comment string with proper indentation
   */
  private generateFieldComment(field: FieldSchema): string {
    const comment = field.comment || '';
    const sqlType = field.type;
    const nullable = field.nullable ? ' (nullable)' : '';
    const defaultValue = field.defaultValue ? ` (default: ${field.defaultValue})` : '';
    
    // Clean and format the comment
    const cleanComment = comment.trim();
    const typeInfo = `SQL type: ${sqlType}${nullable}${defaultValue}`;
    
    let commentLines = [];
    if (cleanComment) {
      commentLines.push(cleanComment);
    }
    
    // Add constraint information if present
    if (field.constraints && field.constraints.length > 0) {
      const constraintTypes = field.constraints.map(c => c.type).join(', ');
      commentLines.push(`Constraints: ${constraintTypes}`);
    }
    
    commentLines.push(typeInfo);
    
    const formattedComment = commentLines
      .map(line => `   * ${line}`)
      .join('\n');
    
    return `  /**
${formattedComment}
   */
`;
  }

  /**
   * Formats the generated TypeScript code with proper indentation and spacing
   * @param code The raw TypeScript code
   * @returns Formatted TypeScript code
   */
  private formatCode(code: string): string {
    // Basic code formatting - ensure consistent spacing and indentation
    return code
      .replace(/\n\s*\n\s*\n/g, '\n\n') // Remove excessive blank lines (max 2 consecutive)
      .replace(/^\s+$/gm, '') // Remove trailing whitespace from empty lines
      .replace(/\s+$/gm, '') // Remove trailing whitespace from all lines
      .replace(/\{\s*\n\s*\}/g, '{}') // Format empty objects/interfaces
      .replace(/\n{3,}/g, '\n\n') // Ensure maximum of 2 consecutive newlines
      .trim() + '\n'; // Ensure file ends with single newline
  }
}