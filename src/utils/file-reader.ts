/**
 * File reading utilities with error handling and validation
 */

import { promises as fs } from 'fs';
import { resolve, isAbsolute } from 'path';
import { FileReadError } from '../types/index.js';
import { validateFilePath as validateFilePathSecurity, validateFileSize } from './validation.js';

/**
 * Maximum file size in bytes (100MB)
 */
const MAX_FILE_SIZE = 100 * 1024 * 1024;

/**
 * Supported text encodings
 */
export type FileEncoding = 'utf8' | 'utf16le' | 'latin1' | 'ascii';

/**
 * Options for file reading
 */
export interface FileReadOptions {
  encoding?: FileEncoding;
  maxSize?: number;
  validatePath?: boolean;
}

/**
 * Validates a file path for security and accessibility
 * @param filePath - The file path to validate
 * @throws {FileReadError} If the path is invalid or unsafe
 */
export function validateFilePath(filePath: string): void {
  // Use the comprehensive validation from validation.ts
  validateFilePathSecurity(filePath);
}

/**
 * Checks if a file exists and is readable
 * @param filePath - The file path to check
 * @returns Promise that resolves to true if file exists and is readable
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath, fs.constants.F_OK | fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Gets file stats including size
 * @param filePath - The file path to check
 * @returns Promise that resolves to file stats
 * @throws {FileReadError} If file cannot be accessed
 */
export async function getFileStats(filePath: string): Promise<{ size: number; isFile: boolean }> {
  try {
    const stats = await fs.stat(filePath);
    return {
      size: stats.size,
      isFile: stats.isFile()
    };
  } catch (error) {
    throw new FileReadError(
      `Cannot access file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      filePath
    );
  }
}

/**
 * Validates file content for SQL processing
 * @param content - The file content to validate
 * @param filePath - The file path for error reporting
 * @throws {FileReadError} If content is invalid
 */
export function validateFileContent(content: string, filePath: string): void {
  if (typeof content !== 'string') {
    throw new FileReadError('File content must be a string', filePath);
  }

  if (content.length === 0) {
    throw new FileReadError('File is empty', filePath);
  }

  // Check for binary content (basic heuristic)
  const nullByteCount = (content.match(/\0/g) || []).length;
  if (nullByteCount > content.length * 0.01) {
    throw new FileReadError('File appears to contain binary data', filePath);
  }
}

/**
 * Reads a file asynchronously with error handling and validation
 * @param filePath - The path to the file to read
 * @param options - Options for file reading
 * @returns Promise that resolves to the file content as string
 * @throws {FileReadError} If file cannot be read or is invalid
 */
export async function readFile(
  filePath: string, 
  options: FileReadOptions = {}
): Promise<string> {
  const {
    encoding = 'utf8',
    maxSize = MAX_FILE_SIZE,
    validatePath = true
  } = options;

  try {
    // Validate file path if requested
    if (validatePath) {
      validateFilePath(filePath);
    }

    // Check if file exists
    if (!(await fileExists(filePath))) {
      throw new FileReadError('File does not exist or is not readable', filePath);
    }

    // Check file stats
    const stats = await getFileStats(filePath);
    if (!stats.isFile) {
      throw new FileReadError('Path is not a file', filePath);
    }

    // Check file size using validation utility
    validateFileSize(stats.size, { maxFileSize: maxSize } as any, filePath);

    // Read file content
    const content = await fs.readFile(filePath, { encoding });

    // Validate content
    validateFileContent(content, filePath);

    return content;
  } catch (error) {
    if (error instanceof FileReadError) {
      throw error;
    }
    
    throw new FileReadError(
      `Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      filePath
    );
  }
}

/**
 * Reads a file synchronously with error handling and validation
 * @param filePath - The path to the file to read
 * @param options - Options for file reading
 * @returns The file content as string
 * @throws {FileReadError} If file cannot be read or is invalid
 */
export function readFileSync(
  filePath: string, 
  options: Omit<FileReadOptions, 'maxSize'> = {}
): string {
  const { encoding = 'utf8', validatePath = true } = options;

  try {
    // Validate file path if requested
    if (validatePath) {
      validateFilePath(filePath);
    }

    // Read file content synchronously
    const fs = require('fs');
    const content = fs.readFileSync(filePath, { encoding });

    // Validate content
    validateFileContent(content, filePath);

    return content;
  } catch (error) {
    if (error instanceof FileReadError) {
      throw error;
    }
    
    throw new FileReadError(
      `Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      filePath
    );
  }
}

/**
 * Reads multiple files concurrently
 * @param filePaths - Array of file paths to read
 * @param options - Options for file reading
 * @returns Promise that resolves to array of file contents
 * @throws {FileReadError} If any file cannot be read
 */
export async function readMultipleFiles(
  filePaths: string[],
  options: FileReadOptions = {}
): Promise<string[]> {
  if (!Array.isArray(filePaths) || filePaths.length === 0) {
    throw new FileReadError('File paths must be a non-empty array', '');
  }

  try {
    const readPromises = filePaths.map(filePath => readFile(filePath, options));
    return await Promise.all(readPromises);
  } catch (error) {
    if (error instanceof FileReadError) {
      throw error;
    }
    
    throw new FileReadError(
      `Failed to read multiple files: ${error instanceof Error ? error.message : 'Unknown error'}`,
      filePaths.join(', ')
    );
  }
}