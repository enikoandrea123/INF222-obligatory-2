import { describe, expect, test, beforeAll } from 'vitest';
import { createZerowServices } from '../src/zerow-module.js';
import { validationHelper } from 'langium/test';
import type { ValidationResult } from 'langium';
import type { Program } from '../src/generated/ast.js';

let validate: (text: string) => Promise<ValidationResult<Program>>;

beforeAll(() => {
    const services = createZerowServices().Zerow;
    validate = validationHelper(services);
});

describe('Validation tests', () => {

    test('Valid program', async () => {
        const result = await validate(`
            unit meter
            declare x equals 5[meter]
            declare y equals 10[meter]
            assign 20[meter] to x
        `);

        expect(result.issues?.length ?? 0).toBe(0);
    });

});