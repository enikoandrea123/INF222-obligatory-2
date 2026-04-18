grammar Zerow

entry Program:
    units+=UnitDeclaration*
    statements+=Statement*
    returns+=ReturnStatement*
;

UnitDeclaration:
    'unit' name=ID
;

Statement:
      VariableDeclaration
    | Assignment
;

VariableDeclaration:
    'declare' name=ID 'equals' expr=Expression
;

Assignment:
    'assign' expr=Expression 'to' variable=[VariableDeclaration]
;

ReturnStatement:
    'returns' expr=Expression
;

Expression:
    AdditiveExpression
;

AdditiveExpression:
    left=MultiplicativeExpression (op+=('add' | 'sub') right+=MultiplicativeExpression)*
;

MultiplicativeExpression:
    left=PrimaryExpression (op+=('mul' | 'div') right+=PrimaryExpression)*
;

PrimaryExpression:
      Literal
    | VariableReference
    | NegExpression
    | '(' Expression ')'
;

Literal:
    value=INT '[' unit=[UnitDeclaration] ']'
;

VariableReference:
    variable=[VariableDeclaration]
;

NegExpression:
    'neg' expr=PrimaryExpression
;

hidden terminal WS: /\s+/;
hidden terminal ML_COMMENT: /\/\*[\s\S]*?\*\//;
hidden terminal SL_COMMENT: /\/\/[^\r\n]*/;

terminal ID: /[a-zA-Z_][a-zA-Z0-9_]*/;
terminal INT: /[0-9]+/;
