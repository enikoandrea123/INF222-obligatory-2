import type { ValidationChecks, ValidationAcceptor } from 'langium';
import type { ZerowAstType, Program, VariableDeclaration, VariableReference } from './generated/ast.js';
import { createZerowServices } from './zerow-module.js';

type ZerowServices = ReturnType<typeof createZerowServices>['Zerow'];

export function registerValidationChecks(services: ZerowServices) {
    const registry = services.validation.ValidationRegistry;

    const checks: ValidationChecks<ZerowAstType> = {
        Program: (program: Program, accept: ValidationAcceptor) => {
            const declaredVars = new Map<string, VariableDeclaration>();
            for (const stmt of program.statements) {
                if (stmt.$type === 'VariableDeclaration') {
                    declaredVars.set(stmt.name, stmt);
                }
            }

            function checkNode(node: any) {
                if (!node) return;
                if (node.$type === 'VariableReference') {
                    const varName = node.variable?.ref?.name ?? node.variable;
                    if (!declaredVars.has(varName)) {
                        accept('error', `Variable '${varName}' is not declared`, { node });
                    }
                }
                for (const key of Object.keys(node)) {
                    const value = node[key];
                    if (Array.isArray(value)) {
                        value.forEach(checkNode);
                    } else if (value && typeof value === 'object') {
                        checkNode(value);
                    }
                }
            }

            program.statements.forEach(checkNode);
            program.returns.forEach(checkNode);
        }
    };

    registry.register(checks);
}