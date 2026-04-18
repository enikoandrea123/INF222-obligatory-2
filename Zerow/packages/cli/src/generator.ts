import type {
    AdditiveExpression,
    Assignment,
    Literal,
    MultiplicativeExpression,
    NegExpression,
    PrimaryExpression,
    Program,
    VariableDeclaration,
    VariableReference
} from 'zerow-language';
import * as fs from 'node:fs';
import {
    code,
    codesec,
    export_,
    exportdesc,
    exportsec,
    func,
    funcsec,
    functype,
    i32,
    Info,
    instr,
    localidx,
    locals,
    module,
    typesec,
    valtype
} from './util.js';
import { extractDestinationAndName } from './util.js';

export function generateOutput(model: Program, source: string, destination: string): string {
    const data = extractDestinationAndName(destination);

    if (!fs.existsSync(data.destination)) {
        fs.mkdirSync(data.destination, { recursive: true });
    }
    fs.writeFileSync(destination, compile(model));
    return destination;
}

export function compile(model: Program) {
    const program = generateProgram(model);
    const mod = module(program);

    return Uint8Array.from(mod.flat(Infinity));
}

function generateProgram(model: Program) {
    const symbols = new Map<string, Info>();
    let nextLocalIndex = 0;

    for (const statement of model.statements) {
        if (statement.$type === 'VariableDeclaration') {
            symbols.set(statement.name, { name: statement.name, idx: nextLocalIndex++ });
        }
    }

    const results = model.returns.map(() => valtype.i32);
    const mainType = functype([], results);
    const typeSection = typesec([mainType]);
    const functionSection = funcsec([0]);
    const exportSection = exportsec([export_('main', exportdesc.func(0))]);

    const body: Array<number | number[]> = [];

    for (const statement of model.statements) {
        body.push(...generateStatement(statement, symbols));
    }

    for (const returnStatement of model.returns) {
        body.push(...generateExpression(returnStatement.expr, symbols));
    }

    body.push(instr.end);

    const localEntries = nextLocalIndex > 0 ? [locals(nextLocalIndex, valtype.i32)] : [];
    const codeSection = codesec([code(func(localEntries, body))]);

    return [typeSection, functionSection, exportSection, codeSection];
}

function generateStatement(statement: VariableDeclaration | Assignment, symbols: Map<string, Info>): Array<number | number[]> {
    if (statement.$type === 'VariableDeclaration') {
        const info = getSymbolInfo(statement.name, symbols);
        return [
            ...generateExpression(statement.expr, symbols),
            instr.local.set,
            localidx(info.idx)
        ];
    }

    const variableName = statement.variable.ref?.name ?? statement.variable.$refText;
    const info = getSymbolInfo(variableName, symbols);
    return [
        ...generateExpression(statement.expr, symbols),
        instr.local.set,
        localidx(info.idx)
    ];
}

function generateExpression(
    expression: AdditiveExpression | MultiplicativeExpression | PrimaryExpression,
    symbols: Map<string, Info>
): Array<number | number[]> {
    switch (expression.$type) {
        case 'AdditiveExpression': {
            const instructions = generateExpression(expression.left, symbols);

            expression.right.forEach((right, index) => {
                instructions.push(...generateExpression(right, symbols));
                instructions.push(
                    expression.op[index] === 'add' ? instr.i32.add : instr.i32.sub
                );
            });

            return instructions;
        }
        case 'MultiplicativeExpression': {
            const instructions = generateExpression(expression.left, symbols);

            expression.right.forEach((right, index) => {
                instructions.push(...generateExpression(right, symbols));
                instructions.push(
                    expression.op[index] === 'mul' ? instr.i32.mul : instr.i32.div_s
                );
            });

            return instructions;
        }
        case 'Literal':
            return generateLiteral(expression);
        case 'VariableReference':
            return generateVariableReference(expression, symbols);
        case 'NegExpression':
            return generateNegExpression(expression, symbols);
        default:
            return [];
    }
}

function generateLiteral(literal: Literal): Array<number | number[]> {
    return [instr.i32.const, i32(Number(literal.value))];
}

function generateVariableReference(
    reference: VariableReference,
    symbols: Map<string, Info>
): Array<number | number[]> {
    const variableName = reference.variable.ref?.name ?? reference.variable.$refText;
    const info = getSymbolInfo(variableName, symbols);
    return [instr.local.get, localidx(info.idx)];
}

function generateNegExpression(
    expression: NegExpression,
    symbols: Map<string, Info>
): Array<number | number[]> {
    if (expression.expr.$type === 'Literal') {
        return [instr.i32.const, i32(-Number(expression.expr.value))];
    }

    return [
        instr.i32.const,
        i32(0),
        ...generateExpression(expression.expr, symbols),
        instr.i32.sub
    ];
}

function getSymbolInfo(name: string, symbols: Map<string, Info>): Info {
    const info = symbols.get(name);
    if (!info) {
        throw new Error(`Unknown symbol: ${name}`);
    }
    return info;
}
