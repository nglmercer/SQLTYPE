/**
 * String utilities for naming conventions and text manipulation
 */

/**
 * Converts a string to camelCase
 * @param str - The string to convert
 * @returns The camelCase version of the string
 */
export function toCamelCase(str: string): string {
  return str
    .replace(/[_-]+(.)?/g, (_, char) => char ? char.toUpperCase() : '')
    .replace(/^[A-Z]/, char => char.toLowerCase());
}

/**
 * Converts a string to PascalCase
 * @param str - The string to convert
 * @returns The PascalCase version of the string
 */
export function toPascalCase(str: string): string {
  return str
    .replace(/[_-]+(.)?/g, (_, char) => char ? char.toUpperCase() : '')
    .replace(/^[a-z]/, char => char.toUpperCase());
}

/**
 * Converts a string to snake_case
 * @param str - The string to convert
 * @returns The snake_case version of the string
 */
export function toSnakeCase(str: string): string {
  return str
    .replace(/\W+/g, ' ')
    .split(/ |\B(?=[A-Z])/)
    .map(word => word.toLowerCase())
    .join('_');
}

/**
 * Cleans and normalizes a string by removing extra whitespace and special characters
 * @param str - The string to clean
 * @returns The cleaned string
 */
export function cleanString(str: string): string {
  return str
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s-_]/g, '');
}

/**
 * Normalizes a string by converting to lowercase and removing special characters
 * @param str - The string to normalize
 * @returns The normalized string
 */
export function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-_]/g, '')
    .replace(/\s+/g, '_');
}

/**
 * Applies naming convention transformation to a string
 * @param str - The string to transform
 * @param convention - The naming convention to apply
 * @returns The transformed string
 */
export function applyNamingConvention(
  str: string, 
  convention: 'camelCase' | 'PascalCase' | 'snake_case' | 'preserve'
): string {
  switch (convention) {
    case 'camelCase':
      return toCamelCase(str);
    case 'PascalCase':
      return toPascalCase(str);
    case 'snake_case':
      return toSnakeCase(str);
    case 'preserve':
    default:
      return str;
  }
}

/**
 * Removes SQL backticks and quotes from identifiers
 * @param identifier - The SQL identifier to clean
 * @returns The cleaned identifier
 */
export function cleanSQLIdentifier(identifier: string): string {
  return identifier.replace(/[`'"]/g, '').trim();
}

/**
 * Capitalizes the first letter of a string
 * @param str - The string to capitalize
 * @returns The capitalized string
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Checks if a string is a valid JavaScript identifier
 * @param str - The string to check
 * @returns True if the string is a valid identifier
 */
export function isValidIdentifier(str: string): boolean {
  return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(str);
}