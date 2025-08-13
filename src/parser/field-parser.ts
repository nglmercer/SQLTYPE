import { FieldSchema, FieldConstraint, FieldConstraintType, SQLParseError } from '../types/index.js';

/**
 * Parser for individual field definitions within CREATE TABLE statements
 */
export class FieldParser {
  // Regex patterns for field parsing
  private static readonly FIELD_DEFINITION_REGEX = /^\s*(?:`([^`]+)`|"([^"]+)"|(\w+))\s+((?:\w+(?:\([^)]*\))?(?:\s*\[\])?(?:\s+(?:UNSIGNED|SIGNED|ZEROFILL))*)+)\s*(.*?)$/i;
  private static readonly CONSTRAINT_PATTERNS = {
    NOT_NULL: /\bNOT\s+NULL\b/i,
    NULL: /\bNULL\b/i,
    PRIMARY_KEY: /\bPRIMARY\s+KEY\b/i,
    UNIQUE: /\bUNIQUE\b/i,
    AUTO_INCREMENT: /\bAUTO_INCREMENT\b/i,
    DEFAULT: /\bDEFAULT\s+((?:['"][^'"]*['"]|\([^)]*\)|\w+\([^)]*\)|[^\s,]+)(?:\s+ON\s+UPDATE\s+(?:['"][^'"]*['"]|\([^)]*\)|\w+\([^)]*\)|[^\s,]+))?)/i,
    COMMENT: /\bCOMMENT\s+['"]([^'"\\]*(?:\\.[^'"\\]*)*)['"]/i,
    FOREIGN_KEY: /\bREFERENCES\s+(\w+)\s*\(([^)]+)\)/i,
    CHECK: /\bCHECK\s*\(([^)]+)\)/i
  };

  /**
   * Parse a field definition string into a FieldSchema object
   * @param fieldDefinition Raw field definition string
   * @param lineNumber Line number for error reporting
   * @returns Parsed FieldSchema object
   */
  public static parseField(fieldDefinition: string, lineNumber?: number): FieldSchema {
    if (!fieldDefinition || typeof fieldDefinition !== 'string') {
      throw new SQLParseError('Invalid field definition: must be a non-empty string', lineNumber);
    }

    const trimmedDef = fieldDefinition.trim();
    if (!trimmedDef) {
      throw new SQLParseError('Empty field definition', lineNumber);
    }

    // Skip table-level constraints (they start with constraint keywords)
    if (this.isTableLevelConstraint(trimmedDef)) {
      throw new SQLParseError('Table-level constraint found where field definition expected', lineNumber);
    }

    const match = this.FIELD_DEFINITION_REGEX.exec(trimmedDef);
    if (!match) {
      throw new SQLParseError(`Could not parse field definition: ${trimmedDef}`, lineNumber);
    }

    // Extract field name (from any of the capture groups)
    const fieldName = match[1] || match[2] || match[3];
    const fieldType = match[4];
    const constraintsString = match[5] || '';

    if (!fieldName) {
      throw new SQLParseError(`Could not extract field name from: ${trimmedDef}`, lineNumber);
    }

    if (!fieldType) {
      throw new SQLParseError(`Could not extract field type from: ${trimmedDef}`, lineNumber);
    }

    // Parse constraints and attributes
    const constraints = this.parseConstraints(constraintsString);
    const nullable = this.determineNullability(constraintsString);
    const defaultValue = this.extractDefaultValue(constraintsString);
    const comment = this.extractComment(constraintsString);

    return {
      name: fieldName.trim(),
      type: fieldType.trim(),
      nullable,
      defaultValue: defaultValue !== undefined ? defaultValue : undefined,
      constraints,
      comment: comment || undefined
    };
  }

  /**
   * Parse multiple field definitions from a fields string
   * @param fieldsString String containing all field definitions
   * @returns Array of FieldSchema objects
   */
  public static parseFields(fieldsString: string): FieldSchema[] {
    if (!fieldsString || typeof fieldsString !== 'string') {
      throw new SQLParseError('Invalid fields string: must be a non-empty string');
    }

    const fields: FieldSchema[] = [];
    const fieldDefinitions = this.splitFieldDefinitions(fieldsString);

    for (let i = 0; i < fieldDefinitions.length; i++) {
      const fieldDef = fieldDefinitions[i]?.trim();
      
      if (!fieldDef) {
        continue; // Skip empty definitions
      }

      try {
        // Skip table-level constraints
        if (this.isTableLevelConstraint(fieldDef)) {
          continue;
        }

        const field = this.parseField(fieldDef, i + 1);
        fields.push(field);
      } catch (error) {
        if (error instanceof SQLParseError) {
          throw new SQLParseError(`Error parsing field ${i + 1}: ${error.message}`, i + 1);
        }
        throw error;
      }
    }

    return fields;
  }

  /**
   * Split field definitions string into individual field definition strings
   * @param fieldsString Raw fields string from CREATE TABLE
   * @returns Array of individual field definition strings
   */
  private static splitFieldDefinitions(fieldsString: string): string[] {
    const definitions: string[] = [];
    let currentDef = '';
    let parenDepth = 0;
    let inQuotes = false;
    let quoteChar = '';

    for (let i = 0; i < fieldsString.length; i++) {
      const char = fieldsString[i];
      const prevChar = i > 0 ? fieldsString[i - 1] : '';

      // Handle quotes
      if ((char === '"' || char === "'" || char === '`') && prevChar !== '\\') {
        if (!inQuotes) {
          inQuotes = true;
          quoteChar = char;
        } else if (char === quoteChar) {
          inQuotes = false;
          quoteChar = '';
        }
      }

      // Handle parentheses (only when not in quotes)
      if (!inQuotes) {
        if (char === '(') {
          parenDepth++;
        } else if (char === ')') {
          parenDepth--;
        }
      }

      // Handle comma separation (only when not in quotes and at depth 0)
      if (!inQuotes && parenDepth === 0 && char === ',') {
        definitions.push(currentDef.trim());
        currentDef = '';
        continue;
      }

      currentDef += char;
    }

    // Add the last definition
    if (currentDef.trim()) {
      definitions.push(currentDef.trim());
    }

    return definitions;
  }

  /**
   * Check if a definition is a table-level constraint rather than a field
   * @param definition Definition string to check
   * @returns True if it's a table-level constraint
   */
  private static isTableLevelConstraint(definition: string): boolean {
    const trimmed = definition.trim().toUpperCase();
    return (
      trimmed.startsWith('PRIMARY KEY') ||
      trimmed.startsWith('FOREIGN KEY') ||
      trimmed.startsWith('UNIQUE') ||
      trimmed.startsWith('INDEX') ||
      trimmed.startsWith('KEY') ||
      trimmed.startsWith('CONSTRAINT') ||
      trimmed.startsWith('CHECK')
    );
  }

  /**
   * Parse constraints from the constraints string
   * @param constraintsString String containing constraint information
   * @returns Array of FieldConstraint objects
   */
  private static parseConstraints(constraintsString: string): FieldConstraint[] {
    const constraints: FieldConstraint[] = [];

    if (this.CONSTRAINT_PATTERNS.PRIMARY_KEY.test(constraintsString)) {
      constraints.push({ type: FieldConstraintType.PRIMARY_KEY });
    }

    if (this.CONSTRAINT_PATTERNS.UNIQUE.test(constraintsString)) {
      constraints.push({ type: FieldConstraintType.UNIQUE });
    }

    if (this.CONSTRAINT_PATTERNS.AUTO_INCREMENT.test(constraintsString)) {
      constraints.push({ type: FieldConstraintType.AUTO_INCREMENT });
    }

    // Foreign key constraint
    const foreignKeyMatch = this.CONSTRAINT_PATTERNS.FOREIGN_KEY.exec(constraintsString);
    if (foreignKeyMatch) {
      constraints.push({
        type: FieldConstraintType.FOREIGN_KEY,
        value: `${foreignKeyMatch[1]}(${foreignKeyMatch[2]})`
      });
    }

    // Check constraint
    const checkMatch = this.CONSTRAINT_PATTERNS.CHECK.exec(constraintsString);
    if (checkMatch && checkMatch[1]) {
      constraints.push({
        type: FieldConstraintType.CHECK,
        value: checkMatch[1]
      });
    }

    return constraints;
  }

  /**
   * Determine if a field is nullable based on constraints
   * @param constraintsString String containing constraint information
   * @returns True if field is nullable
   */
  private static determineNullability(constraintsString: string): boolean {
    // Explicit NOT NULL takes precedence
    if (this.CONSTRAINT_PATTERNS.NOT_NULL.test(constraintsString)) {
      return false;
    }

    // PRIMARY KEY fields are implicitly NOT NULL
    if (this.CONSTRAINT_PATTERNS.PRIMARY_KEY.test(constraintsString)) {
      return false;
    }

    // Default to nullable (most SQL databases allow NULL by default)
    return true;
  }

  /**
   * Extract default value from constraints string
   * @param constraintsString String containing constraint information
   * @returns Default value or undefined
   */
  private static extractDefaultValue(constraintsString: string): string | undefined {
    // Use a more comprehensive approach to extract DEFAULT values
    const defaultMatch = /\bDEFAULT\s+/i.exec(constraintsString);
    if (!defaultMatch) {
      return undefined;
    }
    
    let startIndex = defaultMatch.index + defaultMatch[0].length;
    let defaultValue = '';
    let i = startIndex;
    let inQuotes = false;
    let quoteChar = '';
    let parenCount = 0;
    
    // Parse character by character to handle complex expressions
    while (i < constraintsString.length) {
      const char = constraintsString[i];
      const prevChar = i > 0 ? constraintsString[i - 1] : '';
      
      // Handle quotes
      if (!inQuotes && (char === '"' || char === "'")) {
        inQuotes = true;
        quoteChar = char;
        defaultValue += char;
      } else if (inQuotes && char === quoteChar && prevChar !== '\\') {
        inQuotes = false;
        quoteChar = '';
        defaultValue += char;
      } else if (inQuotes) {
        defaultValue += char;
      } else {
        // Handle parentheses when not in quotes
        if (char === '(') {
          parenCount++;
          defaultValue += char;
        } else if (char === ')') {
          parenCount--;
          defaultValue += char;
          // If we've closed all parentheses and this was a function call, we might be done
          if (parenCount === 0 && defaultValue.includes('(')) {
            // Check if next significant token is a keyword that ends the default value
            const remaining = constraintsString.substring(i + 1).trim();
            if (/^(COMMENT|NOT\s+NULL|NULL|PRIMARY\s+KEY|UNIQUE|AUTO_INCREMENT|,|$)/i.test(remaining)) {
              break;
            }
          }
        } else if (parenCount === 0) {
          // Not in parentheses, check for end conditions
          if (char && /\s/.test(char)) {
            // Check if this whitespace is followed by a keyword that ends the default
            const remaining = constraintsString.substring(i).trim();
            if (/^(ON\s+UPDATE|COMMENT|NOT\s+NULL|NULL|PRIMARY\s+KEY|UNIQUE|AUTO_INCREMENT|,|$)/i.test(remaining)) {
              // Special case for ON UPDATE
              if (/^ON\s+UPDATE/i.test(remaining)) {
                const onUpdateMatch = /^ON\s+UPDATE\s+(\S+)/i.exec(remaining);
                if (onUpdateMatch) {
                  defaultValue += ' ON UPDATE ' + onUpdateMatch[1];
                  break;
                }
              } else {
                break;
              }
            } else {
              defaultValue += char;
            }
          } else {
            defaultValue += char;
          }
        } else {
          defaultValue += char;
        }
      }
      i++;
    }
    
    defaultValue = defaultValue.trim();
    
    // Remove quotes if present for simple quoted values (but not for complex expressions)
     if ((defaultValue.startsWith("'") && defaultValue.endsWith("'") && !defaultValue.slice(1, -1).includes(' ')) ||
         (defaultValue.startsWith('"') && defaultValue.endsWith('"') && !defaultValue.slice(1, -1).includes(' '))) {
       defaultValue = defaultValue.slice(1, -1);
     }
    
    return defaultValue !== '' ? defaultValue : '';
  }

  /**
   * Extract comment from constraints string
   * @param constraintsString String containing constraint information
   * @returns Comment text or undefined
   */
  private static extractComment(constraintsString: string): string | undefined {
    const match = this.CONSTRAINT_PATTERNS.COMMENT.exec(constraintsString);
    if (match && match[1]) {
      // Handle escaped quotes in comments
      return match[1].replace(/\\'/g, "'").replace(/\\"/g, '"');
    }
    return undefined;
  }
}