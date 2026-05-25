// ============================================================
//  tests/test_parser.ts — Pruebas del Analizador Sintáctico
// ============================================================

import assert from "node:assert/strict";
import { Lexer }  from "../src/lexer";
import { Parser } from "../src/parser";
import {
  Program,
  LetStatement,
  ConstStatement,
  ReturnStatement,
  ExpressionStatement,
  WhileStatement,
  ForStatement,
  BreakStatement,
  ContinueStatement,
  Identifier,
  IntegerLiteral,
  FloatLiteral,
  StringLiteral,
  BooleanLiteral,
  NullLiteral,
  PrefixExpression,
  InfixExpression,
  AssignExpression,
  IfExpression,
  FunctionLiteral,
  CallExpression,
} from "../src/ast";

// ─────────────────────────────────────────────────────────────────────────────
// FUNCIÓN AUXILIAR
// ─────────────────────────────────────────────────────────────────────────────

function parse(source: string): Program {
  const lexer   = new Lexer(source);
  const parser  = new Parser(lexer);
  const program = parser.parseProgram();
  const errors  = parser.getErrors();

  assert.equal(
    errors.length,
    0,
    `El parser encontró ${errors.length} error(es):\n` +
    errors.map(e => `  • ${e}`).join("\n")
  );

  return program;
}

function parseWithErrors(source: string): string[] {
  const parser = new Parser(new Lexer(source));
  parser.parseProgram();
  return parser.getErrors();
}

function run(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`✔ ${name}`);
  } catch (error) {
    console.error(`✘ ${name}`);
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// LET STATEMENT
// ─────────────────────────────────────────────────────────────────────────────

run("let_con_entero", () => {
  const program = parse("let x = 5;");
  assert.equal(program.statements.length, 1);
  const stmt = program.statements[0] as LetStatement;
  assert.ok(stmt instanceof LetStatement);
  assert.equal(stmt.name.value, "x");
  assert.ok(stmt.value instanceof IntegerLiteral);
  assert.equal((stmt.value as IntegerLiteral).value, 5);
});

run("let_con_flotante", () => {
  const program = parse("let pi = 3.14;");
  const stmt = program.statements[0] as LetStatement;
  assert.ok(stmt.value instanceof FloatLiteral);
  assert.ok(Math.abs((stmt.value as FloatLiteral).value - 3.14) < 0.0001);
});

run("let_con_string", () => {
  const program = parse('let s = "hola";');
  const stmt = program.statements[0] as LetStatement;
  assert.ok(stmt.value instanceof StringLiteral);
  assert.equal((stmt.value as StringLiteral).value, "hola");
});

run("let_con_true", () => {
  const program = parse("let b = true;");
  const stmt = program.statements[0] as LetStatement;
  assert.ok(stmt.value instanceof BooleanLiteral);
  assert.equal((stmt.value as BooleanLiteral).value, true);
});

run("let_con_false", () => {
  const program = parse("let b = false;");
  const stmt = program.statements[0] as LetStatement;
  assert.ok(stmt.value instanceof BooleanLiteral);
  assert.equal((stmt.value as BooleanLiteral).value, false);
});

run("let_con_null", () => {
  const program = parse("let n = null;");
  const stmt = program.statements[0] as LetStatement;
  assert.ok(stmt.value instanceof NullLiteral);
});

run("let_con_expresion_infija", () => {
  const program = parse("let r = 10 + 5;");
  const stmt = program.statements[0] as LetStatement;
  assert.ok(stmt.value instanceof InfixExpression);
  assert.equal((stmt.value as InfixExpression).operator, "+");
});

run("let_funcion_guarda_nombre", () => {
  const program = parse("let f = function(x) { return x; };");
  const stmt = program.statements[0] as LetStatement;
  assert.ok(stmt.value instanceof FunctionLiteral);
  assert.equal((stmt.value as FunctionLiteral).name, "f");
});

// ─────────────────────────────────────────────────────────────────────────────
// CONST STATEMENT
// ─────────────────────────────────────────────────────────────────────────────

run("const_con_entero", () => {
  const program = parse("const MAX = 100;");
  const stmt = program.statements[0] as ConstStatement;
  assert.ok(stmt instanceof ConstStatement);
  assert.equal(stmt.name.value, "MAX");
  assert.ok(stmt.value instanceof IntegerLiteral);
  assert.equal((stmt.value as IntegerLiteral).value, 100);
});

run("const_funcion_guarda_nombre", () => {
  const program = parse("const suma = function(a, b) { return a + b; };");
  const stmt = program.statements[0] as ConstStatement;
  assert.ok(stmt.value instanceof FunctionLiteral);
  assert.equal((stmt.value as FunctionLiteral).name, "suma");
});

// ─────────────────────────────────────────────────────────────────────────────
// RETURN STATEMENT
// ─────────────────────────────────────────────────────────────────────────────

run("return_con_entero", () => {
  const program = parse("return 5;");
  const stmt = program.statements[0] as ReturnStatement;
  assert.ok(stmt instanceof ReturnStatement);
  assert.ok(stmt.returnValue instanceof IntegerLiteral);
  assert.equal((stmt.returnValue as IntegerLiteral).value, 5);
});

run("return_con_expresion", () => {
  const program = parse("return x + 1;");
  const stmt = program.statements[0] as ReturnStatement;
  assert.ok(stmt.returnValue instanceof InfixExpression);
});

// ─────────────────────────────────────────────────────────────────────────────
// EXPRESIONES PREFIJAS
// ─────────────────────────────────────────────────────────────────────────────

run("prefijo_negacion_logica", () => {
  const program = parse("!true;");
  const expr = (program.statements[0] as ExpressionStatement).expression as PrefixExpression;
  assert.ok(expr instanceof PrefixExpression);
  assert.equal(expr.operator, "!");
  assert.ok(expr.right instanceof BooleanLiteral);
});

run("prefijo_negacion_numerica", () => {
  const program = parse("-5;");
  const expr = (program.statements[0] as ExpressionStatement).expression as PrefixExpression;
  assert.ok(expr instanceof PrefixExpression);
  assert.equal(expr.operator, "-");
  assert.ok(expr.right instanceof IntegerLiteral);
  assert.equal((expr.right as IntegerLiteral).value, 5);
});

// ─────────────────────────────────────────────────────────────────────────────
// EXPRESIONES INFIJAS Y PRECEDENCIA
// ─────────────────────────────────────────────────────────────────────────────

run("operadores_infijos", () => {
  const operators = ["+", "-", "*", "/", "%", "**",
                     "==", "!=", "<", "<=", ">", ">=",
                     "&&", "||"];

  for (const op of operators) {
    const program = parse(`5 ${op} 3;`);
    const expr = (program.statements[0] as ExpressionStatement).expression;
    assert.ok(
      expr instanceof InfixExpression,
      `Se esperaba InfixExpression para el operador "${op}"`
    );
    assert.equal((expr as InfixExpression).operator, op);
  }
});

run("precedencia_suma_vs_multiplicacion", () => {
  // 1 + 2 * 3  →  1 + (2 * 3)
  const program = parse("1 + 2 * 3;");
  const expr = (program.statements[0] as ExpressionStatement).expression as InfixExpression;
  assert.equal(expr.operator, "+");
  assert.ok(expr.right instanceof InfixExpression);
  assert.equal((expr.right as InfixExpression).operator, "*");
});

run("parentesis_cambia_precedencia", () => {
  // (1 + 2) * 3  →  la multiplicación queda en la raíz
  const program = parse("(1 + 2) * 3;");
  const expr = (program.statements[0] as ExpressionStatement).expression as InfixExpression;
  assert.equal(expr.operator, "*");
  assert.ok(expr.left instanceof InfixExpression);
  assert.equal((expr.left as InfixExpression).operator, "+");
});

run("asociatividad_izquierda", () => {
  // 5 - 3 - 1  →  (5 - 3) - 1
  const program = parse("5 - 3 - 1;");
  const expr = (program.statements[0] as ExpressionStatement).expression as InfixExpression;
  assert.equal(expr.operator, "-");
  assert.ok(expr.left instanceof InfixExpression);
  assert.equal((expr.left as InfixExpression).operator, "-");
});

// ─────────────────────────────────────────────────────────────────────────────
// ASSIGN EXPRESSION
// ─────────────────────────────────────────────────────────────────────────────

run("asignacion_simple", () => {
  const program = parse("x = 10;");
  const expr = (program.statements[0] as ExpressionStatement).expression as AssignExpression;
  assert.ok(expr instanceof AssignExpression);
  assert.equal(expr.name.value, "x");
  assert.equal(expr.operator, "=");
  assert.ok(expr.value instanceof IntegerLiteral);
});

run("asignaciones_compuestas", () => {
  const cases: [string, string][] = [
    ["x += 1;", "+="],
    ["x -= 1;", "-="],
    ["x *= 2;", "*="],
    ["x /= 2;", "/="],
    ["x %= 3;", "%="],
  ];

  for (const [source, expectedOp] of cases) {
    const program = parse(source);
    const expr = (program.statements[0] as ExpressionStatement).expression as AssignExpression;
    assert.ok(expr instanceof AssignExpression, `Falló para ${source}`);
    assert.equal(expr.operator, expectedOp);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// IF / ELSE / ELSE IF
// ─────────────────────────────────────────────────────────────────────────────

run("if_simple_sin_else", () => {
  const program = parse("if (x) { let y = 1; }");
  const expr = (program.statements[0] as ExpressionStatement).expression as IfExpression;
  assert.ok(expr instanceof IfExpression);
  assert.ok(expr.condition instanceof Identifier);
  assert.equal(expr.consequence.statements.length, 1);
  assert.equal(expr.alternative, null);
});

run("if_con_else", () => {
  const program = parse("if (x) { } else { let a = 1; }");
  const expr = (program.statements[0] as ExpressionStatement).expression as IfExpression;
  assert.notEqual(expr.alternative, null);
  assert.equal(expr.alternative!.statements.length, 1);
});

run("else_if_anidado", () => {
  const source = `
    if (x > 0) {
      let r = 1;
    } else if (x == 0) {
      let r = 2;
    } else {
      let r = 3;
    }
  `;
  const program = parse(source);
  const if_ = (program.statements[0] as ExpressionStatement).expression as IfExpression;

  // El alternative contiene otro IfExpression
  assert.notEqual(if_.alternative, null);
  const innerStmt = if_.alternative!.statements[0] as ExpressionStatement;
  assert.ok(innerStmt.expression instanceof IfExpression);

  // El if anidado tiene su propio else
  const innerIf = innerStmt.expression as IfExpression;
  assert.notEqual(innerIf.alternative, null);
});

// ─────────────────────────────────────────────────────────────────────────────
// WHILE
// ─────────────────────────────────────────────────────────────────────────────

run("while_simple", () => {
  const program = parse("while (x < 10) { x += 1; }");
  const stmt = program.statements[0] as WhileStatement;
  assert.ok(stmt instanceof WhileStatement);
  assert.ok(stmt.condition instanceof InfixExpression);
  assert.equal((stmt.condition as InfixExpression).operator, "<");
  assert.equal(stmt.body.statements.length, 1);
});

run("while_con_break", () => {
  const program = parse("while (true) { break; }");
  const stmt = program.statements[0] as WhileStatement;
  assert.ok(stmt.body.statements[0] instanceof BreakStatement);
});

run("while_con_continue", () => {
  const program = parse("while (true) { continue; }");
  const stmt = program.statements[0] as WhileStatement;
  assert.ok(stmt.body.statements[0] instanceof ContinueStatement);
});

// ─────────────────────────────────────────────────────────────────────────────
// FOR
// ─────────────────────────────────────────────────────────────────────────────

run("for_completo", () => {
  const program = parse("for (let i = 0; i < 5; i += 1) { }");
  const stmt = program.statements[0] as ForStatement;
  assert.ok(stmt instanceof ForStatement);
  assert.ok(stmt.init instanceof LetStatement);
  assert.equal((stmt.init as LetStatement).name.value, "i");
  assert.ok(stmt.condition instanceof InfixExpression);
  assert.equal((stmt.condition as InfixExpression).operator, "<");
  assert.ok(stmt.update instanceof AssignExpression);
});

run("for_con_break", () => {
  const program = parse("for (let i = 0; i < 5; i += 1) { break; }");
  const stmt = program.statements[0] as ForStatement;
  assert.ok(stmt.body.statements[0] instanceof BreakStatement);
});

run("for_con_continue", () => {
  const program = parse("for (let i = 0; i < 5; i += 1) { continue; }");
  const stmt = program.statements[0] as ForStatement;
  assert.ok(stmt.body.statements[0] instanceof ContinueStatement);
});

// ─────────────────────────────────────────────────────────────────────────────
// FUNCIONES
// ─────────────────────────────────────────────────────────────────────────────

run("funcion_sin_parametros", () => {
  const program = parse("function() { }");
  const fn = (program.statements[0] as ExpressionStatement).expression as FunctionLiteral;
  assert.ok(fn instanceof FunctionLiteral);
  assert.equal(fn.parameters.length, 0);
});

run("funcion_un_parametro", () => {
  const program = parse("function(x) { return x; }");
  const fn = (program.statements[0] as ExpressionStatement).expression as FunctionLiteral;
  assert.equal(fn.parameters.length, 1);
  assert.equal(fn.parameters[0].value, "x");
});

run("funcion_varios_parametros", () => {
  const program = parse("function(a, b, c) { }");
  const fn = (program.statements[0] as ExpressionStatement).expression as FunctionLiteral;
  assert.equal(fn.parameters.length, 3);
  assert.deepEqual(fn.parameters.map(p => p.value), ["a", "b", "c"]);
});

run("llamada_sin_argumentos", () => {
  const program = parse("f()");
  const call = (program.statements[0] as ExpressionStatement).expression as CallExpression;
  assert.ok(call instanceof CallExpression);
  assert.equal(call.args.length, 0);
});

run("llamada_con_argumentos", () => {
  const program = parse("f(1, 2, 3)");
  const call = (program.statements[0] as ExpressionStatement).expression as CallExpression;
  assert.equal(call.args.length, 3);
});

run("llamada_argumentos_son_expresiones", () => {
  const program = parse("suma(x + 1, y * 2)");
  const call = (program.statements[0] as ExpressionStatement).expression as CallExpression;
  assert.ok(call.args[0] instanceof InfixExpression);
  assert.ok(call.args[1] instanceof InfixExpression);
});

// ─────────────────────────────────────────────────────────────────────────────
// ERRORES DEL PARSER
// ─────────────────────────────────────────────────────────────────────────────

run("error_const_sin_inicializar", () => {
  const result = parseWithErrors("const x;");
  assert.ok(result.length > 0, "Se esperaba al menos un error");
});

run("error_let_sin_identificador", () => {
  const errors = parseWithErrors("let 5 = x;");
  assert.ok(errors.length > 0, "Se esperaba al menos un error");
});

run("error_let_sin_asignacion", () => {
  const errors = parseWithErrors("let x;");
  assert.ok(errors.length > 0, "Se esperaba al menos un error");
});

run("error_if_sin_parentesis", () => {
  const errors = parseWithErrors("if x { }");
  assert.ok(errors.length > 0, "Se esperaba al menos un error");
});

run("error_asignacion_a_no_identificador", () => {
  const errors = parseWithErrors("5 = 10;");
  assert.ok(errors.length > 0, "Se esperaba al menos un error");
});

// ─────────────────────────────────────────────────────────────────────────────
// POTENCIAS (ASOCIATIVIDAD A LA DERECHA)
// ─────────────────────────────────────────────────────────────────────────────

run("potencia_operador_simple", () => {
  const program = parse("2 ** 3;");
  const expr = (program.statements[0] as ExpressionStatement).expression as InfixExpression;
  assert.ok(expr instanceof InfixExpression);
  assert.equal(expr.operator, "**");
  assert.equal((expr.left as IntegerLiteral).value, 2);
  assert.equal((expr.right as IntegerLiteral).value, 3);
});

run("asociatividad_derecha_potencia", () => {
  // 2 ** 3 ** 2  →  2 ** (3 ** 2)
  // El operador de la raíz debe ser el primer '**', y su rama derecha debe ser otro InfixExpression.
  const program = parse("2 ** 3 ** 2;");
  const expr = (program.statements[0] as ExpressionStatement).expression as InfixExpression;
  
  assert.equal(expr.operator, "**");
  assert.ok(expr.left instanceof IntegerLiteral);
  assert.equal((expr.left as IntegerLiteral).value, 2);
  
  // Aquí se comprueba la asociatividad a la derecha
  assert.ok(expr.right instanceof InfixExpression);
  const rightExpr = expr.right as InfixExpression;
  assert.equal(rightExpr.operator, "**");
  assert.equal((rightExpr.left as IntegerLiteral).value, 3);
  assert.equal((rightExpr.right as IntegerLiteral).value, 2);
});

run("precedencia_potencia_vs_multiplicacion", () => {
  // 2 * 3 ** 4  →  2 * (3 ** 4) porque POWER > PRODUCT
  const program = parse("2 * 3 ** 4;");
  const expr = (program.statements[0] as ExpressionStatement).expression as InfixExpression;
  
  assert.equal(expr.operator, "*");
  assert.ok(expr.right instanceof InfixExpression);
  assert.equal((expr.right as InfixExpression).operator, "**");
});

console.log("\nTodos los tests del parser pasaron correctamente.");