import { describe, expect, test, beforeAll } from 'vitest';
import { parseHelper } from 'langium/test';
import { createZerowServices } from '../src/zerow-module.js';
import type { Program, Assignment, VariableDeclaration } from '../src/generated/ast.js';

let parse: ReturnType<typeof parseHelper>;

beforeAll(() => {
    const services = createZerowServices().Zerow;
    parse = parseHelper(services);
});

describe('Linking tests', () => {

    test('Resolve variable reference', async () => {
        const document = await parse(`
            unit meter
            declare x equals 5[meter]
            assign 10[meter] to x
        `);

        expect(document.parseResult.parserErrors.length).toBe(0);

        const root = document.parseResult.value as Program;

        const statements = root.statements;
        expect(statements).toBeDefined();
        expect(statements.length).toBeGreaterThan(0);

        const assignment = statements.find((s): s is Assignment => s.$type === 'Assignment');
        expect(assignment).toBeDefined();

        const variable = assignment!.variable.ref as VariableDeclaration;
        expect(variable).toBeDefined();

        expect(variable.name).toBe('x');
    });

});