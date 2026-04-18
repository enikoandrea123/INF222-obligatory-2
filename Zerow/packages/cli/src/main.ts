import chalk from 'chalk';
import { Command } from 'commander';
import fs from 'node:fs';
import path from 'node:path';
import { NodeFileSystem } from 'langium/node';
import { createZerowServices, type Program } from 'zerow-language';
import { extractAstNode } from './util.js';
import { compile, generateOutput } from './generator.js';

declare const WebAssembly: {
    Module: new (bytes: Uint8Array) => object;
    Instance: new (mod: object) => { exports: Record<string, unknown> };
};

const packagePath = new URL('../package.json', import.meta.url);
const packageContent = fs.readFileSync(packagePath, 'utf-8');

function loadMod(bytes: Uint8Array) {
    const mod = new WebAssembly.Module(bytes);
    return new WebAssembly.Instance(mod).exports;
}

const compileAction = async (fileName: string, destination?: string): Promise<void> => {
    const services = createZerowServices(NodeFileSystem).Zerow;
    const model = await extractAstNode<Program>(fileName, services);
    const outputPath = destination ?? defaultDestination(fileName);
    const generatedFilePath = generateOutput(model, fileName, outputPath);
    console.log(chalk.green(`Wasm module generated successfully: ${generatedFilePath}`));
};

const compileAndRun = async (source: string): Promise<void> => {
    const services = createZerowServices(NodeFileSystem).Zerow;
    const model = await extractAstNode<Program>(source, services);
    const wasmByteCode = compile(model);
    const wasmMain = loadMod(wasmByteCode).main as CallableFunction;
    console.log(chalk.green(`Wasm output: ${wasmMain()}`));
};

function defaultDestination(fileName: string): string {
    const parsed = path.parse(fileName);
    return path.join(parsed.dir, `${parsed.name}.wasm`);
}

export default function (): void {
    const program = new Command();
    const fileExtensions = createZerowServices(NodeFileSystem).Zerow.LanguageMetaData.fileExtensions.join(', ');

    program.version(JSON.parse(packageContent).version);

    program
        .command('generate')
        .argument('<file>', `source file (possible file extensions: ${fileExtensions})`)
        .argument('[destination]', 'destination of the generated wasm file')
        .description('Generate a WebAssembly module from the given source file')
        .action(compileAction);

    program
        .command('run')
        .argument('<file>', `source file (possible file extensions: ${fileExtensions})`)
        .description('Attempt to compile and run the given program')
        .action(compileAndRun);

    program.parse(process.argv);
}
