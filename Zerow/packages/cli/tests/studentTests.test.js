import { createZerowServices } from 'zerow-language';
import { extractAstNode } from '../out/util.js';
import { compile } from '../out/generator.js';
import { NodeFileSystem } from 'langium/node';
import * as path from 'node:path';
import * as fs from 'node:fs';
import chalk from 'chalk';
import { URI } from 'langium';

function loadMod(bytes) {
    const mod = new WebAssembly.Module(bytes);
    return new WebAssembly.Instance(mod).exports;
}

async function compileAndRun(source) {
    const services = createZerowServices(NodeFileSystem).Zerow;
    const model = await extractAstNode(source, services);
    const wasmByteCode = compile(model);
    let wasmMain = loadMod(wasmByteCode).main;
    return wasmMain();
}

async function extractTestDocument(fileName, services) {
    const extensions = services.LanguageMetaData.fileExtensions;
    if (!extensions.includes(path.extname(fileName))) {
        console.error(chalk.yellow(`Please choose a file with one of these extensions: ${extensions}.`));
        process.exit(1);
    }

    if (!fs.existsSync(fileName)) {
        console.error(chalk.red(`File ${fileName} does not exist.`));
        process.exit(1);
    }

    const document = await services.shared.workspace.LangiumDocuments.getOrCreateDocument(URI.file(path.resolve(fileName)));
    await services.shared.workspace.DocumentBuilder.build([document], { validation: true });

    return document;
}

async function parseProgram(source) {
    const services = createZerowServices(NodeFileSystem).Zerow;
    const model = await extractTestDocument(source, services);
    return model;
}

describe('CompileAndRun', () => {
    test('sampleProgram', () => {
        return compileAndRun("test_programs/sampleProgram.zw")
            .then(x => expect(x).toEqual([5, 12, 1, 12]));
    });
    test('negation', () => {
        return compileAndRun("test_programs/negateLiteral.zw")
            .then(x => expect(x).toEqual([-5, -8, -6, 2, 13]));
    });
    test('operations', () => {
        return compileAndRun("test_programs/operations.zw")
            .then(x => expect(x).toEqual([50250, 4005, 315]));
    });
    test('noReturns', () => {
        return compileAndRun("test_programs/noReturns.zw")
            .then(x => expect(x).toEqual(undefined));
    });
    test('noStatements', () => {
        return compileAndRun("test_programs/noStatements.zw")
            .then(x => expect(x).toEqual([1, 80, 6, 75]));
    });
    test('noReturnsOrStatements', () => {
        return compileAndRun("test_programs/noReturnsOrStatements.zw")
            .then(x => expect(x).toEqual(undefined));
    });
    test('changeOfUnit', () => {
        return compileAndRun("test_programs/changeOfUnit.zw")
            .then(x => expect(x).toEqual([21250, 4005, 315, 9504]));
    });
});


describe('Faulty programs that shouldn\'t parse', () => {

    test('undeclaredUnitDeclare', () => {
        return parseProgram("test_programs/undeclaredUnitDeclare.zw")
            .then(document => {
                const validationErrors = (document.diagnostics ?? []).filter(e => e.severity === 1);
                expect(validationErrors.length).toBeGreaterThan(0);
            });
    });

    test('undeclaredUnitReturn', () => {
        return parseProgram("test_programs/undeclaredUnitReturn.zw")
            .then(document => {
                const validationErrors = (document.diagnostics ?? []).filter(e => e.severity === 1);
                expect(validationErrors.length).toBeGreaterThan(0);
            });
    });

    test('undeclaredVariableAssign', () => {
        return parseProgram("test_programs/undeclaredVariableAssign.zw")
            .then(document => {
                const validationErrors = (document.diagnostics ?? []).filter(e => e.severity === 1);
                expect(validationErrors.length).toBeGreaterThan(0);
            });
    });

    test('undeclaredVariableReturn', () => {
        return parseProgram("test_programs/undeclaredVariableReturn.zw")
            .then(document => {
                const validationErrors = (document.diagnostics ?? []).filter(e => e.severity === 1);
                expect(validationErrors.length).toBeGreaterThan(0);
            });
    });

    test('wrongOrderVariable', () => {
        return parseProgram("test_programs/wrongOrderVariable.zw")
            .then(document => {
                const validationErrors = (document.diagnostics ?? []).filter(e => e.severity === 1);
                expect(validationErrors.length).toBeGreaterThan(0);
            });
    });
    test('invalidTypeCheckAdd', () => {
        return parseProgram("test_programs/invalidTypeCheckAdd.zw")
            .then(document => {
                const validationErrors = (document.diagnostics ?? []).filter(e => e.severity === 1);
                expect(validationErrors.length).toBeGreaterThan(0);
            });
    });
    test('invalidTypeCheckSub', () => {
        return parseProgram("test_programs/invalidTypeCheckSub.zw")
            .then(document => {
                const validationErrors = (document.diagnostics ?? []).filter(e => e.severity === 1);
                expect(validationErrors.length).toBeGreaterThan(0);
            });
    });
    test('invalidTypeCheckMul', () => {
        return parseProgram("test_programs/invalidTypeCheckMul.zw")
            .then(document => {
                const validationErrors = (document.diagnostics ?? []).filter(e => e.severity === 1);
                expect(validationErrors.length).toBeGreaterThan(0);
            });
    });
    test('invalidTypeCheckDiv', () => {
        return parseProgram("test_programs/invalidTypeCheckDiv.zw")
            .then(document => {
                const validationErrors = (document.diagnostics ?? []).filter(e => e.severity === 1);
                expect(validationErrors.length).toBeGreaterThan(0);
            });
    });
    test('redeclaration', () => {
        return parseProgram("test_programs/redeclaration.zw")
            .then(document => {
                const validationErrors = (document.diagnostics ?? []).filter(e => e.severity === 1);
                expect(validationErrors.length).toBeGreaterThan(0);
            });
    });
    test('assignUnitToVariableRef', () => {
        return parseProgram("test_programs/assignUnitToVariableRef.zw")
            .then(document => {
                const validationErrors = (document.diagnostics ?? []).filter(e => e.severity === 1);
                expect(validationErrors.length).toBeGreaterThan(0);
            });
    });
    test('incorrectChangeOfUnit', () => {
        return parseProgram("test_programs/incorrectChangeOfUnit.zw")
            .then(document => {
                const validationErrors = (document.diagnostics ?? []).filter(e => e.severity === 1);
                expect(validationErrors.length).toBeGreaterThan(0);
            });
    });

    // These tests are to check that we don't get an error in the validator when resolving references
    console.errorWithoutExceptions = console.error;
    console.error = (...messages) => {
        console.errorWithoutExceptions(...messages);
        throw new Error(messages[0]);
    }

    test('missingUnitAssign', () => {
        return parseProgram("test_programs/missingUnitAssign.zw")
            .then(document => {
                const validationErrors = (document.diagnostics ?? []).filter(e => e.severity === 1);
                expect(document).not.toBeUndefined();
                expect(validationErrors.length).toBeGreaterThan(0);
            });
    });
    test('missingUnitDeclaration', () => {
        return parseProgram("test_programs/missingUnitDeclaration.zw")
            .then(document => {
                const validationErrors = (document.diagnostics ?? []).filter(e => e.severity === 1);
                expect(validationErrors.length).toBeGreaterThan(0);
            });
    });
    test('missingUnitReturns', () => {
        return parseProgram("test_programs/missingUnitReturns.zw")
            .then(document => {
                const validationErrors = (document.diagnostics ?? []).filter(e => e.severity === 1);
                expect(validationErrors.length).toBeGreaterThan(0);
            });
    });
})
