import type { AstNode, LangiumCoreServices, LangiumDocument } from 'langium';
import chalk from 'chalk';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { URI } from 'langium';

export async function extractDocument(fileName: string, services: LangiumCoreServices): Promise<LangiumDocument> {
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

    const validationErrors = (document.diagnostics ?? []).filter(e => e.severity === 1);
    if (validationErrors.length > 0) {
        console.error(chalk.red('There are validation errors:'));
        for (const validationError of validationErrors) {
            console.error(chalk.red(
                `line ${validationError.range.start.line + 1}: ${validationError.message} [${document.textDocument.getText(validationError.range)}]`
            ));
        }
        process.exit(1);
    }

    return document;
}

export async function extractAstNode<T extends AstNode>(fileName: string, services: LangiumCoreServices): Promise<T> {
    return (await extractDocument(fileName, services)).parseResult?.value as T;
}

interface FilePathData {
    destination: string,
    name: string
}

export function extractDestinationAndName(destination: string): FilePathData {
    return {
        destination: path.dirname(destination),
        name: path.basename(destination)
    };
}

export function stringToBytes(s: string): number[] {
  const bytes = new TextEncoder().encode(s);
  return Array.from(bytes);
}

export function magic(): number[] {
  return stringToBytes("\0asm");
}

export function version(): number[] {
  return [0x01, 0x00, 0x00, 0x00];
}

const CONTINUATION_BIT = 0b10000000;
const SEVEN_BIT_MASK_BIG_INT = 0b01111111n;

function leb128(v: number): number[] {
  let val = BigInt(v);
  let more = true;
  const r = [];

  while (more) {
    const b = Number(val & SEVEN_BIT_MASK_BIG_INT);
    val = val >> 7n;
    more = val !== 0n;
    if (more) {
      r.push(b | CONTINUATION_BIT);
    } else {
      r.push(b);
    }
  }
  return r;
}

function sleb128(v: number): number[] {
  let val = BigInt(v);
  let more = true;
  const r = [];

  while (more) {
    const b = Number(val & SEVEN_BIT_MASK_BIG_INT);
    const signBitSet = !!(b & 0x40);
    val = val >> 7n;
    if ((val === 0n && !signBitSet) || (val === -1n && signBitSet)) {
      more = false;
      r.push(b);
    } else {
      r.push(b | CONTINUATION_BIT);
    }
  }
  return r;
}

const MIN_U32 = 0;
const MAX_U32 = 2 ** 32 - 1;
const MIN_I32 = -(2 ** 32 / 2);
const MAX_I32 = 2 ** 32 / 2 - 1;
const I32_NEG_OFFSET = 2 ** 32;

export function u32(v: number): number[] {
  if (v < MIN_U32 || v > MAX_U32) {
    throw Error(`value is out of range for u32: ${v}`);
  }
  return leb128(v);
}

export function i32(v: number): number[] {
  if (v < MIN_I32 || v > MAX_U32) {
    throw Error(`value is out of range for i32: ${v}`);
  }
  if (v > MAX_I32) {
    return sleb128(v - I32_NEG_OFFSET);
  }
  return sleb128(v);
}

export function section(id: number, contents: any[]) {
  const sizeInBytes = contents.flat(Infinity).length;
  return [id, u32(sizeInBytes), contents];
}

export function vec(elements: string | any[]) {
  return [u32(elements.length), elements];
}

const SECTION_ID_TYPE = 0x01;
const SECTION_ID_FUNCTION = 0x03;
const SECTION_ID_EXPORT = 0x07;
const SECTION_ID_CODE = 0x0A;

export function functype(paramTypes: string | any[], resultTypes: string | any[]) {
  return [0x60, vec(paramTypes), vec(resultTypes)];
}

export function typesec(functypes: string | any[]) {
  return section(SECTION_ID_TYPE, vec(functypes));
}

export const typeidx = (x: number) => u32(x);

export const funcidx = (x: number) => u32(x);

export function funcsec(typeidxs: string | any[]) {
  return section(SECTION_ID_FUNCTION, vec(typeidxs));
}

export function code(func: any[]) {
  const sizeInBytes = func.flat(Infinity).length;
  return [u32(sizeInBytes), func];
}

export function func(locals: string | any[], body: (number | any[])[]) {
  return [vec(locals), body];
}

export function codesec(codes: string | any[]) {
  return section(SECTION_ID_CODE, vec(codes));
}

export function name(s: string) {
  return vec(stringToBytes(s));
}

export function export_(nm: string, exportdesc: any[]) {
  return [name(nm), exportdesc];
}

export function exportsec(exports: string | any[]) {
  return section(SECTION_ID_EXPORT, vec(exports));
}

export const exportdesc = {
  func(idx: number) {
    return [0x00, funcidx(idx)];
  },
};

export function module(sections: any[]) {
  return [magic(), version(), sections];
}

export const instr = {
  end: 0x0b,
  i32: {
    const: 0x41,
    add: 0x6a,
    sub: 0x6b,
    mul: 0x6c,
    div_s: 0x6d
  },
  local: {
    get: 0x20,
    set: 0x21
  },
};

export const valtype = {
  i32: 0x7f
};

export function locals(n: number, type: number) {
  return [u32(n), type];
}

export const localidx = (x: number) => u32(x);
export interface Info {
  name: string;
  idx: number;
}
