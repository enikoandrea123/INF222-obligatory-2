import { describe, test, expect, beforeAll } from 'vitest';
import { parseHelper } from 'langium/test';
import { createZerowServices } from '../src/zerow-module.js';
import type { Program } from '../src/generated/ast.js';

let parse: ReturnType<typeof parseHelper>;

beforeAll(() => {
    const services = createZerowServices().Zerow;
    parse = parseHelper(services);
});

describe('Zerow parsing', () => {
    test('parses a simple program', async () => {
        const input = `
            unit kg
            declare a equals 1 [kg]
            assign 2 [kg] to a
            returns a
        `;

        const document = await parse(input);

        expect(document.parseResult.parserErrors.length).toBe(0);

        const root = document.parseResult.value as Program;

        expect(root.units.length).toBe(1);
        expect(root.statements.length).toBe(2);
        expect(root.returns.length).toBe(1);
    });
});