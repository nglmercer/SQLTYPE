/**
 * Tests for TypeScript Generator
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TypeScriptGenerator } from '../src/generator/typescript-generator.js';
import { TableSchema, FieldSchema, GeneratorOptions, FieldConstraintType } from '../src/types/index.js';

describe('TypeScriptGenerator', () => {
  let generator: TypeScriptGenerator;

  beforeEach(() => {
    generator = new TypeScriptGenerator();
  });

  describe('generate', () => {
    it('should return empty string for empty schemas array', () => {
      const result = generator.generate([]);
      expect(result).toBe('');
    });

    it('should generate basic interface from table schema', () => {
      const schema: TableSchema = {
        name: 'users',
        fields: [
          {
            name: 'id',
            type: 'int',
            nullable: false,
            constraints: [{ type: FieldConstraintType.PRIMARY_KEY }]
          },
          {
            name: 'name',
            type: 'varchar(255)',
            nullable: false,
            constraints: []
          },
          {
            name: 'email',
            type: 'varchar(255)',
            nullable: true,
            constraints: []
          }
        ],
        constraints: []
      };

      const result = generator.generate([schema]);
      
      expect(result).toContain('export interface Users {');
      expect(result).toContain('id: number;');
      expect(result).toContain('name: string;');
      expect(result).toContain('email: string | null;');
    });

    it('should handle multiple table schemas', () => {
      const schemas: TableSchema[] = [
        {
          name: 'users',
          fields: [
            {
              name: 'id',
              type: 'int',
              nullable: false,
              constraints: [{ type: FieldConstraintType.PRIMARY_KEY }]
            }
          ],
          constraints: []
        },
        {
          name: 'posts',
          fields: [
            {
              name: 'id',
              type: 'int',
              nullable: false,
              constraints: [{ type: FieldConstraintType.PRIMARY_KEY }]
            }
          ],
          constraints: []
        }
      ];

      const result = generator.generate(schemas);
      
      expect(result).toContain('export interface Users {');
      expect(result).toContain('export interface Posts {');
    });
  });

  describe('naming conventions', () => {
    const schema: TableSchema = {
      name: 'user_profiles',
      fields: [
        {
          name: 'user_id',
          type: 'int',
          nullable: false,
          constraints: []
        },
        {
          name: 'first_name',
          type: 'varchar(255)',
          nullable: false,
          constraints: []
        }
      ],
      constraints: []
    };

    it('should apply camelCase naming convention', () => {
      const options: GeneratorOptions = { naming: 'camelCase' };
      const result = generator.generate([schema], options);
      
      expect(result).toContain('export interface UserProfiles {');
      expect(result).toContain('userId: number;');
      expect(result).toContain('firstName: string;');
    });

    it('should apply PascalCase naming convention', () => {
      const options: GeneratorOptions = { naming: 'PascalCase' };
      const result = generator.generate([schema], options);
      
      expect(result).toContain('export interface UserProfiles {');
      expect(result).toContain('UserId: number;');
      expect(result).toContain('FirstName: string;');
    });

    it('should apply snake_case naming convention', () => {
      const options: GeneratorOptions = { naming: 'snake_case' };
      const result = generator.generate([schema], options);
      
      expect(result).toContain('export interface user_profiles {');
      expect(result).toContain('user_id: number;');
      expect(result).toContain('first_name: string;');
    });

    it('should preserve original naming', () => {
      const options: GeneratorOptions = { naming: 'preserve' };
      const result = generator.generate([schema], options);
      
      expect(result).toContain('export interface user_profiles {');
      expect(result).toContain('user_id: number;');
      expect(result).toContain('first_name: string;');
    });
  });

  describe('optional fields', () => {
    const schema: TableSchema = {
      name: 'users',
      fields: [
        {
          name: 'id',
          type: 'int',
          nullable: false,
          constraints: [{ type: FieldConstraintType.PRIMARY_KEY }]
        },
        {
          name: 'name',
          type: 'varchar(255)',
          nullable: false,
          constraints: []
        },
        {
          name: 'email',
          type: 'varchar(255)',
          nullable: true,
          constraints: []
        },
        {
          name: 'created_at',
          type: 'datetime',
          nullable: false,
          defaultValue: 'CURRENT_TIMESTAMP',
          constraints: []
        }
      ],
      constraints: []
    };

    it('should mark nullable fields as optional with null union', () => {
      const result = generator.generate([schema]);
      
      expect(result).toContain('id: number;');
      expect(result).toContain('name: string;');
      expect(result).toContain('email: string | null;');
      expect(result).toContain('created_at?: Date;');
    });

    it('should mark all fields as optional when optionalFields is true', () => {
      const options: GeneratorOptions = { optionalFields: true };
      const result = generator.generate([schema], options);
      
      expect(result).toContain('id?: number;');
      expect(result).toContain('name?: string;');
      expect(result).toContain('email?: string;');
      expect(result).toContain('created_at?: Date;');
    });
  });

  describe('interface naming with prefix and suffix', () => {
    const schema: TableSchema = {
      name: 'users',
      fields: [
        {
          name: 'id',
          type: 'int',
          nullable: false,
          constraints: []
        }
      ],
      constraints: []
    };

    it('should apply prefix to interface name', () => {
      const options: GeneratorOptions = { prefix: 'DB' };
      const result = generator.generate([schema], options);
      
      expect(result).toContain('export interface DBUsers {');
    });

    it('should apply suffix to interface name', () => {
      const options: GeneratorOptions = { suffix: 'Model' };
      const result = generator.generate([schema], options);
      
      expect(result).toContain('export interface UsersModel {');
    });

    it('should apply both prefix and suffix', () => {
      const options: GeneratorOptions = { prefix: 'DB', suffix: 'Model' };
      const result = generator.generate([schema], options);
      
      expect(result).toContain('export interface DBUsersModel {');
    });
  });

  describe('export types', () => {
    const schema: TableSchema = {
      name: 'users',
      fields: [
        {
          name: 'id',
          type: 'int',
          nullable: false,
          constraints: []
        }
      ],
      constraints: []
    };

    it('should generate interface by default', () => {
      const result = generator.generate([schema]);
      expect(result).toContain('export interface Users {');
    });

    it('should generate type when exportType is "type"', () => {
      const options: GeneratorOptions = { exportType: 'type' };
      const result = generator.generate([schema], options);
      expect(result).toContain('export type Users = {');
    });
  });

  describe('complex naming scenarios', () => {
    const schema: TableSchema = {
      name: 'user_account_settings',
      fields: [
        {
          name: 'user_account_id',
          type: 'int',
          nullable: false,
          constraints: []
        },
        {
          name: 'notification_enabled',
          type: 'boolean',
          nullable: false,
          constraints: []
        }
      ],
      constraints: []
    };

    it('should handle complex names with camelCase', () => {
      const options: GeneratorOptions = { naming: 'camelCase' };
      const result = generator.generate([schema], options);
      
      expect(result).toContain('export interface UserAccountSettings {');
      expect(result).toContain('userAccountId: number;');
      expect(result).toContain('notificationEnabled: boolean;');
    });

    it('should handle complex names with PascalCase', () => {
      const options: GeneratorOptions = { naming: 'PascalCase' };
      const result = generator.generate([schema], options);
      
      expect(result).toContain('export interface UserAccountSettings {');
      expect(result).toContain('UserAccountId: number;');
      expect(result).toContain('NotificationEnabled: boolean;');
    });

    it('should combine naming conventions with prefix and suffix', () => {
      const options: GeneratorOptions = { 
        naming: 'camelCase',
        prefix: 'I',
        suffix: 'Entity'
      };
      const result = generator.generate([schema], options);
      
      expect(result).toContain('export interface IUserAccountSettingsEntity {');
      expect(result).toContain('userAccountId: number;');
      expect(result).toContain('notificationEnabled: boolean;');
    });
  });

  describe('comments and documentation', () => {
    const schema: TableSchema = {
      name: 'users',
      fields: [
        {
          name: 'id',
          type: 'int',
          nullable: false,
          constraints: [{ type: FieldConstraintType.PRIMARY_KEY }],
          comment: 'Unique identifier for the user'
        },
        {
          name: 'email',
          type: 'varchar(255)',
          nullable: false,
          constraints: [],
          comment: 'User email address'
        },
        {
          name: 'created_at',
          type: 'datetime',
          nullable: false,
          defaultValue: 'CURRENT_TIMESTAMP',
          constraints: [],
          comment: 'Timestamp when the user was created'
        },
        {
          name: 'status',
          type: 'enum("active","inactive")',
          nullable: true,
          constraints: [],
          comment: 'Current status of the user account'
        }
      ],
      constraints: []
    };

    it('should generate interface comments when includeComments is true', () => {
      const options: GeneratorOptions = { includeComments: true };
      const result = generator.generate([schema], options);
      
      expect(result).toContain('/**');
      expect(result).toContain("TypeScript interface for the 'users' table");
      expect(result).toContain('Generated from SQL schema with 4 fields');
      expect(result).toContain('*/');
    });

    it('should generate field comments when includeComments is true', () => {
      const options: GeneratorOptions = { includeComments: true };
      const result = generator.generate([schema], options);
      
      expect(result).toContain('Unique identifier for the user');
      expect(result).toContain('SQL type: int');
      expect(result).toContain('User email address');
      expect(result).toContain('SQL type: varchar(255)');
      expect(result).toContain('Timestamp when the user was created');
      expect(result).toContain('SQL type: datetime');
      expect(result).toContain('(default: CURRENT_TIMESTAMP)');
    });

    it('should not generate comments when includeComments is false', () => {
      const options: GeneratorOptions = { includeComments: false };
      const result = generator.generate([schema], options);
      
      expect(result).not.toContain('/**');
      expect(result).not.toContain('Unique identifier for the user');
      expect(result).not.toContain('SQL type:');
    });

    it('should handle fields without comments gracefully', () => {
      const options: GeneratorOptions = { includeComments: true };
      const result = generator.generate([schema], options);
      
      // Should still generate the status field
      expect(result).toContain('status');
      // Status field should be nullable (string | null) since it has no comment but is nullable
      expect(result).toContain('status: string | null;');
    });

    it('should handle nullable fields in comments', () => {
      const options: GeneratorOptions = { includeComments: true };
      const result = generator.generate([schema], options);
      
      // The status field is nullable and has a comment, so should show (nullable)
      expect(result).toContain('(nullable)');
      expect(result).toContain('Current status of the user account');
    });

    it('should generate file header when includeComments is true', () => {
      const options: GeneratorOptions = { includeComments: true };
      const result = generator.generate([schema], options);
      
      expect(result).toContain('Auto-generated TypeScript interfaces from SQL schema');
      expect(result).toContain('Generated on:');
      expect(result).toContain('Total interfaces: 1');
      expect(result).toContain('@warning This file is auto-generated. Do not edit manually.');
    });

    it('should include constraint information in field comments', () => {
      const options: GeneratorOptions = { includeComments: true };
      const result = generator.generate([schema], options);
      
      // The id field has PRIMARY_KEY constraint
      expect(result).toContain('Constraints: PRIMARY_KEY');
    });

    it('should not generate file header when includeComments is false', () => {
      const options: GeneratorOptions = { includeComments: false };
      const result = generator.generate([schema], options);
      
      expect(result).not.toContain('Auto-generated TypeScript interfaces');
      expect(result).not.toContain('@warning');
    });
  });

  describe('code formatting', () => {
    const schema: TableSchema = {
      name: 'test_table',
      fields: [
        {
          name: 'id',
          type: 'int',
          nullable: false,
          constraints: [{ type: FieldConstraintType.PRIMARY_KEY }]
        }
      ],
      constraints: []
    };

    it('should format code with proper indentation and spacing', () => {
      const result = generator.generate([schema]);
      
      // Should have proper indentation for fields
      expect(result).toContain('  id: number;');
      // Should end with a single newline
      expect(result.endsWith('\n')).toBe(true);
      expect(result.endsWith('\n\n')).toBe(false);
    });

    it('should remove excessive blank lines', () => {
      const result = generator.generate([schema]);
      
      // Should not have more than 2 consecutive newlines
      expect(result).not.toMatch(/\n{3,}/);
    });

    it('should remove trailing whitespace', () => {
      const result = generator.generate([schema]);
      
      // Split by lines and check none have trailing whitespace
      const lines = result.split('\n');
      lines.forEach(line => {
        if (line.length > 0) {
          expect(line).not.toMatch(/\s+$/);
        }
      });
    });
  });
});