import type { ValidationChecks, ValidationAcceptor } from 'langium';
import type { ZerowAstType, Program, VariableDeclaration } from './generated/ast.js';
import { createZerowServices } from './zerow-module.js';

type ZerowServices = ReturnType<typeof createZerowServices>['Zerow'];

export function registerValidationChecks(services: ZerowServices) {
    const registry = services.validation.ValidationRegistry;

    const checks: ValidationChecks<ZerowAstType> = {
    Program: (program: Program, accept: ValidationAcceptor) => {

        const declaredVars = new Map<string, VariableDeclaration>();

    function getUnit(expr: any): string | undefined {
    if (!expr) return undefined;

    if (expr.$type === 'Literal') {
        return expr.unit.ref?.name;
    }

    if (expr.$type === 'VariableReference') {
        const decl = expr.variable.ref;
        if (decl) {
            return getUnit(decl.expr);
        }
    }

    if (expr.$type === 'NegExpression') {
        return getUnit(expr.expr);
    }

    if (expr.$type === 'MultiplicativeExpression') {
        let unit = getUnit(expr.left);

        for (const right of expr.right) {
            const rightUnit = getUnit(right);

            if (unit !== rightUnit) {
                return undefined;
            }
        }

        return unit;
    }

    if (expr.$type === 'AdditiveExpression') {
        let unit = getUnit(expr.left);

        for (const right of expr.right) {
            const rightUnit = getUnit(right);

            if (unit !== rightUnit) {
                return undefined;
            }
        }

        return unit;
    }

    return undefined;
}

        function checkExpression(expr: any) {
            if (!expr) return;


            if (expr.$type === 'VariableReference') {
                const ref = expr.variable.ref;

                if (ref && !declaredVars.has(ref.name)) {
                    accept(
                        'error',
                        `Variable '${ref.name}' is used before its declaration`,
                        { node: expr }
                    );
                }
            }

if (expr.$type === 'AdditiveExpression' || expr.$type === 'MultiplicativeExpression') {

    const leftUnit = getUnit(expr.left);

    for (const right of expr.right) {
        const rightUnit = getUnit(right);

        if (leftUnit && rightUnit && leftUnit !== rightUnit) {
            accept(
                'error',
                `Unit mismatch: '${leftUnit}' and '${rightUnit}' are not compatible`,
                { node: expr }
            );
        }
    }
}

            for (const key of Object.keys(expr)) {
                const value = expr[key];
                if (Array.isArray(value)) {
                    value.forEach(checkExpression);
                } else if (value && typeof value === 'object') {
                    checkExpression(value);
                }
            }
        }

        for (const stmt of program.statements) {

 if (stmt.$type === 'VariableDeclaration') {

    if (declaredVars.has(stmt.name)) {
        accept(
            'error',
            `Variable '${stmt.name}' has already been declared`,
            { node: stmt }
        );
    }

    checkExpression(stmt.expr);

    declaredVars.set(stmt.name, stmt);
}

            else if (stmt.$type === 'Assignment') {

    const ref = stmt.variable.ref;

    if (ref && !declaredVars.has(ref.name)) {
        accept(
            'error',
            `Variable '${ref.name}' is assigned before its declaration`,
            { node: stmt }
        );
    }


    checkExpression(stmt.expr);
}
        }
        for (const ret of program.returns) {
            checkExpression(ret.expr);
        }
    }
};

    registry.register(checks);
}