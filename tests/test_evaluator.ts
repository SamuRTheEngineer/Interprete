// =============================================================================
//  tests/test_evaluator.ts — Pruebas del Evaluador (Runtime)
// =============================================================================

import assert from "node:assert/strict";
import { Lexer } from "../src/lexer";
import { Parser } from "../src/parser";
import { evaluate } from "../src/evaluator";
import { Environment } from "../src/environment";
import {
  RuntimeObject,
  IntegerObject,
  FloatObject,
  StringObject,
  BooleanObject,
  ErrorObject,
  TRUE,
  FALSE,
  NULL
} from "../src/object_system";

// ─────────────────────────────────────────────────────────────────────────────
// FUNCIONES AUXILIARES
// ─────────────────────────────────────────────────────────────────────────────

function evaluar(source: string): RuntimeObject {
  const lexer = new Lexer(source);
  const parser = new Parser(lexer);
  const program = parser.parseProgram();
  const errors = parser.getErrors();

  assert.equal(
    errors.length,
    0,
    `El parser encontró errores antes de evaluar:\n` +
    errors.map(e => `  ${e}`).join("\n")
  );

  const env = new Environment();
  return evaluate(program, env);
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
// LITERALES PRIMITIVOS
// ─────────────────────────────────────────────────────────────────────────────

run("literal_entero", () => {
  const result = evaluar("5;");
  assert.ok(result instanceof IntegerObject);
  assert.equal((result as IntegerObject).value, 5);
});

run("literal_flotante", () => {
  const result = evaluar("3.14;");
  assert.ok(result instanceof FloatObject);
  assert.ok(Math.abs((result as FloatObject).value - 3.14) < 0.0001);
});

run("literal_string", () => {
  const result = evaluar('"hola mundo";');
  assert.ok(result instanceof StringObject);
  assert.equal((result as StringObject).value, "hola mundo");
});

run("literales_booleanos_singletons", () => {
  assert.equal(evaluar("true;"), TRUE);
  assert.equal(evaluar("false;"), FALSE);
});

run("literal_null_singleton", () => {
  assert.equal(evaluar("null;"), NULL);
});

// ─────────────────────────────────────────────────────────────────────────────
// ARITMÉTICA Y PRECEDENCIA
// ─────────────────────────────────────────────────────────────────────────────

run("operaciones_aritmeticas_enteras", () => {
  const cases: [string, number][] = [
    ["2 + 3;", 5],
    ["10 - 4;", 6],
    ["3 * 4;", 12],
    ["10 % 3;", 1],
    ["2 ** 8;", 256],
    ["-5;", -5],
    ["2 + 3 * 4;", 14],
    ["(2 + 3) * 4;", 20],
  ];

  for (const [source, expected] of cases) {
    const result = evaluar(source);
    assert.ok(result instanceof IntegerObject, `Falló tipo para: ${source}`);
    assert.equal((result as IntegerObject).value, expected, `Falló valor para: ${source}`);
  }
});

run("division_exacta_vs_flotante", () => {
  const divExacta = evaluar("10 / 2;");
  assert.ok(divExacta instanceof IntegerObject);
  assert.equal((divExacta as IntegerObject).value, 5);

  const divInexacta = evaluar("10 / 4;");
  assert.ok(divInexacta instanceof FloatObject);
  assert.ok(Math.abs((divInexacta as FloatObject).value - 2.5) < 0.0001);
});

// ─────────────────────────────────────────────────────────────────────────────
// OPERADORES LÓGICOS Y CORTOCIRCUITO REAL
// ─────────────────────────────────────────────────────────────────────────────

run("operaciones_logicas_basicas", () => {
  assert.equal(evaluar("true && true;"), TRUE);
  assert.equal(evaluar("true && false;"), FALSE);
  assert.equal(evaluar("false || true;"), TRUE);
  assert.equal(evaluar("false || false;"), FALSE);
});

run("negaciones_y_coercion_truthy_falsy", () => {
  assert.equal(evaluar("!true;"), FALSE);
  assert.equal(evaluar("!false;"), TRUE);
  assert.equal(evaluar("!null;"), TRUE);
  assert.equal(evaluar("!0;"), TRUE);
  assert.equal(evaluar("!5;"), FALSE);
});

run("cortocircuito_estricto_and", () => {
  // Si '&&' evaluara el lado derecho, lanzaría un ErrorObject por variable inexistente.
  // Al cortocircuitar de verdad, se detiene y retorna FALSE inmediatamente.
  const result = evaluar("false && variableInexistente;");
  assert.equal(result, FALSE);
});

run("cortocircuito_estricto_or", () => {
  // Al ser el lado izquierdo verdadero, ignora el error del derecho y retorna TRUE.
  const result = evaluar("true || variableInexistente;");
  assert.equal(result, TRUE);
});

// ─────────────────────────────────────────────────────────────────────────────
// VARIABLES (LET) Y CONSTANTES (CONST)
// ─────────────────────────────────────────────────────────────────────────────

run("variables_let_declaracion_y_mutacion", () => {
  assert.equal((evaluar("let x = 10; x;") as IntegerObject).value, 10);
  assert.equal((evaluar("let x = 5; x * 2;") as IntegerObject).value, 10);
  assert.equal((evaluar("let x = 1; x = 5; x;") as IntegerObject).value, 5);
});

run("asignaciones_combinadas", () => {
  assert.equal((evaluar("let x = 5; x += 3; x;") as IntegerObject).value, 8);
  assert.equal((evaluar("let x = 10; x /= 2; x;") as IntegerObject).value, 5);
});

run("error_reasignacion_a_constante", () => {
  const result = evaluar("const PI = 3.14; PI = 3.15;");
  assert.ok(result instanceof ErrorObject);
  assert.match((result as ErrorObject).message, /Intento ilegal de reasignar/);
});

// ─────────────────────────────────────────────────────────────────────────────
// ESTRUCTURAS DE CONTROL
// ─────────────────────────────────────────────────────────────────────────────

run("condicionales_if_else_y_elseif", () => {
  assert.equal((evaluar("if (true) { 42 }") as IntegerObject).value, 42);
  assert.equal(evaluar("if (false) { 42 }"), NULL);
  assert.equal((evaluar("if (false) { 1 } else { 2 }") as IntegerObject).value, 2);

  const branchElseIf = `
    let x = 5;
    if (x > 10) { 1 } else if (x > 3) { 2 } else { 3 }
  `;
  assert.equal((evaluar(branchElseIf) as IntegerObject).value, 2);
});

run("bucle_while_con_break", () => {
  const loopSuma = `
    let i = 0; let suma = 0;
    while (i < 5) { suma = suma + 1; i = i + 1; }
    suma
  `;
  assert.equal((evaluar(loopSuma) as IntegerObject).value, 5);

  const loopBreak = `
    let x = 0;
    while (true) { x = x + 1; if (x == 3) { break; } }
    x
  `;
  assert.equal((evaluar(loopBreak) as IntegerObject).value, 3);
});

run("bucle_for_con_continue", () => {
  const forSuma = `
    let s = 0;
    for (let i = 1; i <= 4; i = i + 1) { s = s + i; }
    s
  `;
  assert.equal((evaluar(forSuma) as IntegerObject).value, 10);

  const forContinue = `
    let s = 0;
    for (let i = 1; i <= 6; i = i + 1) {
      if (i % 2 == 0) { continue; }
      s = s + i;
    }
    s
  `;
  assert.equal((evaluar(forContinue) as IntegerObject).value, 9);
});

run("block_scoping_moderno_en_for", () => {
  // 'i' no debe fugarse del entorno local del bucle 'for'
  const blockScopeTest = `
    for (let i = 0; i < 3; i = i + 1) { }
    i
  `;
  const result = evaluar(blockScopeTest);
  assert.ok(result instanceof ErrorObject);
  assert.match((result as ErrorObject).message, /variable no definida: 'i'/);
});

// ─────────────────────────────────────────────────────────────────────────────
// FUNCIONES Y RECURSIÓN
// ─────────────────────────────────────────────────────────────────────────────

run("funciones_y_closures", () => {
  const funcSimple = "let suma = function(a, b) { return a + b; }; suma(3, 4);";
  assert.equal((evaluar(funcSimple) as IntegerObject).value, 7);

  const implicitReturn = "let f = function() { 42 }; f();";
  assert.equal((evaluar(implicitReturn) as IntegerObject).value, 42);

  const closureTest = "let x = 10; let f = function() { x }; f();";
  assert.equal((evaluar(closureTest) as IntegerObject).value, 10);
});

run("recursion_de_alta_densidad", () => {
  const factorial = `
    let fact = function(n) {
      if (n == 0) { return 1; }
      return n * fact(n - 1);
    };
    fact(5)
  `;
  assert.equal((evaluar(factorial) as IntegerObject).value, 120);
});

// ─────────────────────────────────────────────────────────────────────────────
// ERRORES EN RUNTIME
// ─────────────────────────────────────────────────────────────────────────────

run("captura_de_errores_en_runtime", () => {
  assert.ok(evaluar("variableInexistente;") instanceof ErrorObject);
  assert.ok(evaluar("5 / 0;") instanceof ErrorObject);
  assert.ok(evaluar("let x = 5; x();") instanceof ErrorObject);
  assert.ok(evaluar("5 + true;") instanceof ErrorObject);
});

console.log("\nTodos los tests del evaluador pasaron correctamente.");