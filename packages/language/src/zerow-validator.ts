import type { ValidationChecks, ValidationAcceptor } from 'langium';
import type {
    AdditiveExpression,
    Assignment,
    MultiplicativeExpression,
    NegExpression,
    Program,
    PrimaryExpression,
    VariableDeclaration,
    ZerowAstType
} from './generated/ast.js';
import { createZerowServices } from './zerow-module.js';

type ZerowServices = ReturnType<typeof createZerowServices>['Zerow'];

export function registerValidationChecks(services: ZerowServices) {
    const registry = services.validation.ValidationRegistry;

    const checks: ValidationChecks<ZerowAstType> = {
        Program: (program: Program, accept: ValidationAcceptor) => {
            const declaredVars = new Map<string, VariableDeclaration>();
            const variableUnits = new Map<string, string | undefined>();

            function getUnit(
                expr: AdditiveExpression | MultiplicativeExpression | NegExpression | PrimaryExpression | undefined
            ): string | undefined {
                if (!expr) {
                    return undefined;
                }

                if (expr.$type === 'Literal') {
                    return expr.unit?.ref?.name;
                }

                if (expr.$type === 'VariableReference') {
                    const variableName = expr.variable?.ref?.name;
                    return variableName ? variableUnits.get(variableName) : undefined;
                }

                if (expr.$type === 'NegExpression') {
                    return getUnit(expr.expr);
                }

                if (expr.$type === 'AdditiveExpression' || expr.$type === 'MultiplicativeExpression') {
                    const leftUnit = getUnit(expr.left);

                    for (const right of expr.right) {
                        const rightUnit = getUnit(right);
                        if (leftUnit !== rightUnit) {
                            return undefined;
                        }
                    }

                    return leftUnit;
                }

                return undefined;
            }

            function checkExpression(
                expr: AdditiveExpression | MultiplicativeExpression | NegExpression | PrimaryExpression | undefined
            ): void {
                if (!expr) {
                    return;
                }

                if (expr.$type === 'VariableReference') {
                    const variableName = expr.variable?.ref?.name;
                    if (variableName && !declaredVars.has(variableName)) {
                        accept('error', `Variable '${variableName}' is used before its declaration`, { node: expr });
                    }
                    return;
                }

                if (expr.$type === 'AdditiveExpression' || expr.$type === 'MultiplicativeExpression') {
                    checkExpression(expr.left);

                    const leftUnit = getUnit(expr.left);
                    for (const right of expr.right) {
                        checkExpression(right);

                        const rightUnit = getUnit(right);
                        if (leftUnit && rightUnit && leftUnit !== rightUnit) {
                            accept(
                                'error',
                                `Unit mismatch: '${leftUnit}' and '${rightUnit}' are not compatible`,
                                { node: expr }
                            );
                        }
                    }
                    return;
                }

                if (expr.$type === 'NegExpression') {
                    checkExpression(expr.expr);
                }
            }

            function updateVariableUnit(
                statement: VariableDeclaration | Assignment,
                expr: AdditiveExpression | MultiplicativeExpression | NegExpression | PrimaryExpression
            ): void {
                const unit = getUnit(expr);
                const name = statement.$type === 'VariableDeclaration'
                    ? statement.name
                    : statement.variable.ref?.name ?? statement.variable.$refText;
                variableUnits.set(name, unit);
            }

            for (const stmt of program.statements) {
                if (stmt.$type === 'VariableDeclaration') {
                    if (declaredVars.has(stmt.name)) {
                        accept('error', `Variable '${stmt.name}' has already been declared`, { node: stmt });
                    }

                    checkExpression(stmt.expr);
                    declaredVars.set(stmt.name, stmt);
                    updateVariableUnit(stmt, stmt.expr);
                } else if (stmt.$type === 'Assignment') {
                    const variableName = stmt.variable.ref?.name;
                    if (variableName && !declaredVars.has(variableName)) {
                        accept('error', `Variable '${variableName}' is assigned before its declaration`, { node: stmt });
                    }

                    checkExpression(stmt.expr);
                    updateVariableUnit(stmt, stmt.expr);
                }
            }

            for (const ret of program.returns) {
                checkExpression(ret.expr);
            }
        }
    };

    registry.register(checks);
}
