import { describe, expect, test, beforeAll } from 'vitest';
import { parseHelper } from 'langium/test';
import { createZerowServices } from '../src/zerow-module.js';
import type { Program } from '../src/generated/ast.js';

let parse: ReturnType<typeof parseHelper>;

beforeAll(() => {
    const services = createZerowServices().Zerow;
    parse = parseHelper(services);
});

describe('Parsing tests', () => {

    test('Parse simple declaration', async () => {
        const document = await parse(`
            unit meter
            declare x equals 5[meter]
            declare y equals 10[meter] add 5[meter]
            assign 20[meter] to x
            returns x add y
        `);

        expect(document.parseResult.parserErrors.length).toBe(0);

        const root = document.parseResult.value as Program;

        expect(root.units).toBeDefined();
        expect(root.units.length).toBe(1);

        expect(root.statements).toBeDefined();
        expect(root.statements.length).toBe(3);

        expect(root.returns).toBeDefined();
        expect(root.returns.length).toBe(1);
    });

});