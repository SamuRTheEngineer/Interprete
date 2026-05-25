// =============================================================================
//  src/evaluator.ts  –  Evaluador del Intérprete (Tree-Walking Interpreter)
//
// El Evaluador es el corazón del intérprete. Recorre el AST de arriba a abajo
// (tree-walking) y ejecuta cada nodo según su tipo.
//
// Flujo completo:
//   Código fuente
//     ↓  Lexer
//   Tokens
//     ↓  Parser
//   AST
//     ↓  Evaluator   ← este módulo
//   Resultado (RuntimeObject)
// =============================================================================

import * as ast from "./ast";
import {
  RuntimeObject,
  ObjectTypes,
  IntegerObject,
  FloatObject,
  StringObject,
  BooleanObject,
  NullObject,
  ReturnValueObject,
  ErrorObject,
  FunctionObject,
  BuiltinObject,
  TRUE,
  FALSE,
  NULL,
  BREAK,
  CONTINUE
} from "./object_system";
import { Environment, newEnclosedEnvironment } from "./environment";

// ─────────────────────────────────────────────────────────────────────────────
// FUNCIÓN PRINCIPAL DE EVALUACIÓN (PUNTO DE ENTRADA)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Punto de entrada del evaluador.
 * Despacha la evaluación al handler correcto según el tipo de nodo.
 * Implementa el patrón visitor mediante una función de despacho centralizada.
 */
export function evaluate(node: ast.Node, env: Environment): RuntimeObject {
  // ── Nodo Raíz ──────────────────────────────────────────────────────────────
  if (node instanceof ast.Program) {
    return evalProgram(node, env);
  }

  // ── Sentencias ────────────────────────────────────────────────────────────
  if (node instanceof ast.ExpressionStatement) {
    if (!node.expression) return NULL;
    return evaluate(node.expression, env);
  }

  if (node instanceof ast.BlockStatement) {
    return evalBlockStatement(node, env);
  }

  if (node instanceof ast.LetStatement) {
    return evalLetStatement(node, env);
  }

  if (node instanceof ast.ConstStatement) {
    return evalConstStatement(node, env);
  }

  if (node instanceof ast.ReturnStatement) {
    return evalReturnStatement(node, env);
  }

  if (node instanceof ast.WhileStatement) {
    return evalWhileStatement(node, env);
  }

  if (node instanceof ast.ForStatement) {
    return evalForStatement(node, env);
  }

  if (node instanceof ast.BreakStatement) {
    return BREAK;
  }

  if (node instanceof ast.ContinueStatement) {
    return CONTINUE;
  }

  // ── Literales Primitivos ───────────────────────────────────────────────────
  if (node instanceof ast.IntegerLiteral) {
    return new IntegerObject(node.value);
  }

  if (node instanceof ast.FloatLiteral) {
    return new FloatObject(node.value);
  }

  if (node instanceof ast.StringLiteral) {
    return new StringObject(node.value);
  }

  if (node instanceof ast.BooleanLiteral) {
    return node.value ? TRUE : FALSE;
  }

  if (node instanceof ast.NullLiteral) {
    return NULL;
  }

  // ── Expresiones Compuestas ────────────────────────────────────────────────
  if (node instanceof ast.PrefixExpression) {
    if (node.right === null) {
        return newError(`Expresión prefija incompleta: operador '${node.operator}' sin operando derecho.`);
    }
    const right = evaluate(node.right, env);
    if (isError(right)) return right;
    return evalPrefixExpression(node.operator, right);
  }

  // Despacho exclusivo y aislado para mutaciones de variables
  if (node instanceof ast.AssignExpression) {
    return evalAssignmentExpression(node, env);
  }

  // Operaciones puramente infijas (Aritmética, Comparaciones y Lógica)
  if (node instanceof ast.InfixExpression) {
    // 1. Evaluar SIEMPRE el lado izquierdo primero
    const left = evaluate(node.left, env);
    if (isError(left)) return left;
    
    // 2. INTERCEPCIÓN DE CORTOCIRCUITO (&& y ||)
    if (node.operator === "&&") {
      if (!isTruthy(left)) return left;
      if (node.right === null) {
        return newError("Expresión lógica incompleta: operador '&&' sin operando derecho.");
      }
      return evaluate(node.right, env);
    }

    if (node.operator === "||") {
      if (isTruthy(left)) return left;
      if (node.right === null) {
        return newError("Expresión lógica incompleta: operador '||' sin operando derecho.");
      }
      return evaluate(node.right, env);
    }
    
    // 3. Operaciones tradicionales
    if (node.right === null) {
        return newError(`Expresión infija incompleta: operador '${node.operator}' sin operando derecho.`);
    }
    const right = evaluate(node.right, env);
    if (isError(right)) return right;
    
    return evalInfixExpression(node.operator, left, right);
  }

  if (node instanceof ast.IfExpression) {
    return evalIfExpression(node, env);
  }

  // ── Identificadores ───────────────────────────────────────────────────────
  if (node instanceof ast.Identifier) {
    return evalIdentifier(node, env);
  }

  // ── Funciones ─────────────────────────────────────────────────────────────
  if (node instanceof ast.FunctionLiteral) {
    return new FunctionObject(node.parameters, node.body, env, node.name || "");
  }

  if (node instanceof ast.CallExpression) {
    return evalCallExpression(node, env);
  }

  // Nodo no reconocido por el sistema
  return newError(`nodo no soportado: ${node.constructor.name}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// HANDLERS DE SENTENCIAS
// ─────────────────────────────────────────────────────────────────────────────

function evalProgram(program: ast.Program, env: Environment): RuntimeObject {
  let result: RuntimeObject = NULL;

  for (const statement of program.statements) {
    result = evaluate(statement, env);

    // Propagar return (desenvolver el valor real de alto nivel)
    if (result instanceof ReturnValueObject) {
      return result.value;
    }

    // Propagar errores en runtime inmediatamente
    if (result instanceof ErrorObject) {
      return result;
    }
  }

  return result;
}

function evalBlockStatement(block: ast.BlockStatement, env: Environment): RuntimeObject {
  let result: RuntimeObject = NULL;

  for (const statement of block.statements) {
    result = evaluate(statement, env);

    if (result !== null) {
      const type = result.type();
      // Detener el bloque secuencial ante señales de control o errores de ejecución
      if (
        type === ObjectTypes.RETURN_VALUE ||
        type === ObjectTypes.ERROR ||
        type === ObjectTypes.BREAK ||
        type === ObjectTypes.CONTINUE
      ) {
        return result;
      }
    }
  }

  return result;
}

function evalLetStatement(node: ast.LetStatement, env: Environment): RuntimeObject {
  if (!node.value) {
    env.define(node.name.value, NULL);
    return NULL;
  }
  const value = evaluate(node.value, env);
  if (isError(value)) return value;

  env.define(node.name.value, value);
  return NULL;
}

function evalConstStatement(node: ast.ConstStatement, env: Environment): RuntimeObject {
  if (!node.value) {
    return newError("Las declaraciones 'const' deben inicializarse obligatoriamente.");
  }
  const value = evaluate(node.value, env);
  if (isError(value)) return value;

  env.setConstant(node.name.value, value);
  return NULL;
}

function evalReturnStatement(node: ast.ReturnStatement, env: Environment): RuntimeObject {
  if (!node.returnValue) return new ReturnValueObject(NULL);
  const value = evaluate(node.returnValue, env);
  if (isError(value)) return value;
  return new ReturnValueObject(value);
}

function evalWhileStatement(node: ast.WhileStatement, env: Environment): RuntimeObject {
  let result: RuntimeObject = NULL;

  while (true) {
    const condition = evaluate(node.condition, env);
    if (isError(condition)) return condition;

    if (!isTruthy(condition)) {
      break;
    }

    result = evaluate(node.body, env);

    if (result instanceof ReturnValueObject || result instanceof ErrorObject) {
      return result;
    }
    if (result.type() === ObjectTypes.BREAK) {
      return NULL;
    }
    if (result.type() === ObjectTypes.CONTINUE) {
      continue;
    }
  }

  return NULL;
}

function evalForStatement(node: ast.ForStatement, env: Environment): RuntimeObject {
  // CREACIÓN DEL ÁMBITO MODERNO (Block Scoping):
  // Creamos un entorno hijo exclusivo para el ciclo 'for'. Toda variable declarada
  // en la inicialización (init) nacerá y morirá dentro de este scope contenedor.
  const forEnv = newEnclosedEnvironment(env);

  // Inicialización (evaluada una sola vez en el nuevo entorno encapsulado)
  if (node.init !== null) {
    const initResult = evaluate(node.init, forEnv);
    if (isError(initResult)) return initResult;
  }

  while (true) {
    // Evaluar condición de parada usando el entorno del for
    if (node.condition !== null) {
      const condition = evaluate(node.condition, forEnv);
      if (isError(condition)) return condition;
      if (!isTruthy(condition)) break;
    }

    // Ejecutar el cuerpo principal del bucle usando el entorno del for
    const result = evaluate(node.body, forEnv);

    if (result instanceof ReturnValueObject || result instanceof ErrorObject) {
      return result;
    }
    if (result.type() === ObjectTypes.BREAK) {
      return NULL;
    }
    
    // Si el flujo es normal o es un CONTINUE, se ejecuta obligatoriamente 
    // la expresión de actualización (update) antes de re-evaluar la condición.
    if (node.update !== null) {
      const updateResult = evaluate(node.update, forEnv);
      if (isError(updateResult)) return updateResult;
    }
  }

  return NULL;
}

// ─────────────────────────────────────────────────────────────────────────────
// HANDLERS DE ASIGNACIONES Y MUTACIONES
// ─────────────────────────────────────────────────────────────────────────────

function evalAssignmentExpression(node: ast.AssignExpression, env: Environment): RuntimeObject {
  // 1. Validar que el lado izquierdo sea un identificador mutable
  if (!(node.name instanceof ast.Identifier)) {
    return newError("El lado izquierdo de una asignación debe ser un identificador válido.");
  }

  const varName = node.name.value;

  // 2. Bloqueo estricto contra mutaciones a constantes
  if (env.isConstant(varName)) {
    return newError(`Error de ejecución: Intento ilegal de reasignar valor a la constante '${varName}'.`);
  }

  // 3. Obtener el valor actual si es una asignación combinada (ej: +=, -=)
  const currentValue = env.get(varName);
  if (currentValue === null && node.operator !== "=") {
    return newError(`variable no definida: '${varName}'`);
  }

  // 4. Evaluar la parte derecha del nodo (node.value)
  if (node.value === null) {
    return newError(`Expresión de asignación incompleta: operador '${node.operator}' sin operando derecho.`);
  }
  const rightValue = evaluate(node.value, env);
  if (isError(rightValue)) return rightValue;

  let finalValue: RuntimeObject;

  // 5. Resolver el valor final según el operador
  if (node.operator === "=") {
    finalValue = rightValue;
  } else {
    // Mapear operadores combinados (ej: += pasa a ser +) delegando al evaluador infijo puro
    const baseOperator = node.operator.replace("=", "");
    finalValue = evalInfixExpression(baseOperator, currentValue!, rightValue);
    if (isError(finalValue)) return finalValue;
  }

  // 6. Mutar el entorno y retornar el valor calculado
    const success = env.set(varName, finalValue);
    if (!success) {
        return newError(`variable no definida: '${varName}'`);
    }
    return finalValue; 
}

// ─────────────────────────────────────────────────────────────────────────────
// HANDLERS DE EXPRESIONES
// ─────────────────────────────────────────────────────────────────────────────

function evalIdentifier(node: ast.Identifier, env: Environment): RuntimeObject {
  const value = env.get(node.value);
  if (value === null) {
    return newError(`variable no definida: '${node.value}'`);
  }
  return value;
}

function evalIfExpression(node: ast.IfExpression, env: Environment): RuntimeObject {
  const condition = evaluate(node.condition, env);
  if (isError(condition)) return condition;

  if (isTruthy(condition)) {
    return evaluate(node.consequence, env);
  }

  // En tu gramática, las cláusulas 'else if' se resuelven de forma recursiva como
  // un nodo alternativo anidado (dentro de else_block), manteniendo el motor simple.
  if (node.alternative !== null) {
    return evaluate(node.alternative, env);
  }

  return NULL;
}

function evalCallExpression(node: ast.CallExpression, env: Environment): RuntimeObject {
  const func = evaluate(node.func, env);
  if (isError(func)) return func;

  // Evaluar expresiones consecutivas de argumentos
  const args = evalExpressions(node.args, env);
  if (args.length === 1 && isError(args[0])) {
    return args[0];
  }

  return applyFunction(func, args, node);
}

function evalExpressions(expressions: ast.Expression[], env: Environment): RuntimeObject[] {
  const result: RuntimeObject[] = [];
  for (const expr of expressions) {
    const evaluated = evaluate(expr, env);
    if (isError(evaluated)) return [evaluated];
    result.push(evaluated);
  }
  return result;
}

function applyFunction(fn: RuntimeObject, args: RuntimeObject[], node: ast.CallExpression): RuntimeObject {
  if (fn instanceof BuiltinObject) {
    return fn.fn(...args);
  }

  if (fn instanceof FunctionObject) {
    if (args.length !== fn.parameters.length) {
      return newError(`número de argumentos incorrecto: esperados ${fn.parameters.length}, recibidos ${args.length}`);
    }

    // Crear el entorno encapsulado (Lexical Clousure / Scope anidado)
    const funcEnv = newEnclosedEnvironment(fn.env);
    for (let i = 0; i < fn.parameters.length; i++) {
      funcEnv.define(fn.parameters[i].value, args[i]);
    }

    const evaluated = evaluate(fn.body, funcEnv);
    return unwrapReturnValue(evaluated);
  }

  return newError(`'${node.func.constructor.name}' no es una función, es de tipo ${fn.type()}`);
}

function unwrapReturnValue(obj: RuntimeObject): RuntimeObject {
  if (obj instanceof ReturnValueObject) {
    return obj.value;
  }
  return obj;
}

// ─────────────────────────────────────────────────────────────────────────────
// OPERADORES PREFIJOS
// ─────────────────────────────────────────────────────────────────────────────

function evalPrefixExpression(operator: string, right: RuntimeObject): RuntimeObject {
  if (operator === "!") {
    return isTruthy(right) ? FALSE : TRUE;
  }
  if (operator === "-") {
    if (right instanceof IntegerObject) return new IntegerObject(-right.value);
    if (right instanceof FloatObject) return new FloatObject(-right.value);
    return newError(`operador '-' no soportado para ${right.type()}`);
  }
  return newError(`operador prefijo desconocido: '${operator}'`);
}

// ─────────────────────────────────────────────────────────────────────────────
// OPERADORES INFIJOS
// ─────────────────────────────────────────────────────────────────────────────

function evalInfixExpression(operator: string, left: RuntimeObject, right: RuntimeObject): RuntimeObject {
  // ── Ambos Nodos Enteros ───────────────────────────────────────────────────
  if (left instanceof IntegerObject && right instanceof IntegerObject) {
    return evalIntegerInfixExpression(operator, left, right);
  }

  // ── Aritmética de Punto Flotante (Soporta mezcla implícita de Int + Float) ──
  if (
    (left instanceof IntegerObject || left instanceof FloatObject) &&
    (right instanceof IntegerObject || right instanceof FloatObject)
  ) {
    return evalFloatInfixExpression(operator, left.value, right.value);
  }

  // ── Operadores Lógicos Cortocircuitados (&&, ||) ───────────────────────────
/*  if (operator === "&&") {
    return nativeBoolToBooleanObject(isTruthy(left) && isTruthy(right));
  }
  if (operator === "||") {
    return nativeBoolToBooleanObject(isTruthy(left) || isTruthy(right));
  }
    Este código se ha movido al handler de infix expressions para permitir el cortocircuito real, evitando la evaluación innecesaria del operando derecho.
*/ 
  // ── Operadores de Igualdad Universal ───────────────────────────────────────
  if (operator === "==") {
    return nativeBoolToBooleanObject(objectsAreEqual(left, right));
  }
  if (operator === "!=") {
    return nativeBoolToBooleanObject(!objectsAreEqual(left, right));
  }

  // ── Cadenas de Texto ───────────────────────────────────────────────────────
  if (left instanceof StringObject && right instanceof StringObject) {
    if (operator === "+") return new StringObject(left.value + right.value);
    if (operator === "==") return nativeBoolToBooleanObject(left.value === right.value);
    if (operator === "!=") return nativeBoolToBooleanObject(left.value !== right.value);
  }

  if (left.type() !== right.type()) {
    return newError(`tipos incompatibles: ${left.type()} ${operator} ${right.type()}`);
  }

  return newError(`operador '${operator}' no soportado entre ${left.type()} y ${right.type()}`);
}

function evalIntegerInfixExpression(operator: string, left: IntegerObject, right: IntegerObject): RuntimeObject {
  const lv = left.value;
  const rv = right.value;

  switch (operator) {
    case "+":  return new IntegerObject(lv + rv);
    case "-":  return new IntegerObject(lv - rv);
    case "*":  return new IntegerObject(lv * rv);
    case "/":
      if (rv === 0) return newError("división por cero");
      const divResult = lv / rv;
      // Convertir a entero si el residuo es exacto, de lo contrario mutar a flotante
      return divResult === Math.floor(divResult) ? new IntegerObject(divResult) : new FloatObject(divResult);
    case "%":
      if (rv === 0) return newError("módulo por cero");
      return new IntegerObject(lv % rv);
    case "**":
      if (rv < 0) return new FloatObject(Math.pow(lv, rv));
      return new IntegerObject(Math.pow(lv, rv));
    
    // Comparaciones
    case "==": return nativeBoolToBooleanObject(lv === rv);
    case "!=": return nativeBoolToBooleanObject(lv !== rv);
    case "<":  return nativeBoolToBooleanObject(lv < rv);
    case "<=": return nativeBoolToBooleanObject(lv <= rv);
    case ">":  return nativeBoolToBooleanObject(lv > rv);
    case ">=": return nativeBoolToBooleanObject(lv >= rv);
    default:
      return newError(`operador '${operator}' no soportado entre enteros`);
  }
}

function evalFloatInfixExpression(operator: string, lv: number, rv: number): RuntimeObject {
  switch (operator) {
    case "+":  return new FloatObject(lv + rv);
    case "-":  return new FloatObject(lv - rv);
    case "*":  return new FloatObject(lv * rv);
    case "/":
      if (rv === 0.0) return newError("división por cero");
      return new FloatObject(lv / rv);
    case "%":
      if (rv === 0.0) return newError("módulo por cero");
      return new FloatObject(lv % rv);
    case "**":  return new FloatObject(Math.pow(lv, rv));
    
    // Comparaciones
    case "==": return nativeBoolToBooleanObject(lv === rv);
    case "!=": return nativeBoolToBooleanObject(lv !== rv);
    case "<":  return nativeBoolToBooleanObject(lv < rv);
    case "<=": return nativeBoolToBooleanObject(lv <= rv);
    case ">":  return nativeBoolToBooleanObject(lv > rv);
    case ">=": return nativeBoolToBooleanObject(lv >= rv);
    default:
      return newError(`operador '${operator}' no soportado entre flotantes`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILIDADES INTERNAS DE CONTROL
// ─────────────────────────────────────────────────────────────────────────────

function isTruthy(obj: RuntimeObject): boolean {
  if (obj === NULL) return false;
  if (obj === FALSE) return false;
  if (obj === TRUE) return true;
  
  if (obj instanceof IntegerObject || obj instanceof FloatObject) {
    return obj.value !== 0;
  }
  if (obj instanceof StringObject) {
    return obj.value.length > 0;
  }
  return true;
}

function objectsAreEqual(left: RuntimeObject, right: RuntimeObject): boolean {
  if (left.type() !== right.type()) {
    // Caso especial: Permitir comparaciones directas entre int y float
    if (
      (left instanceof IntegerObject || left instanceof FloatObject) &&
      (right instanceof IntegerObject || right instanceof FloatObject)
    ) {
      return left.value === right.value;
    }
    return false;
  }

  if (left instanceof BooleanObject) 
    return left === right;
  if ((left instanceof IntegerObject || left instanceof FloatObject) && (right instanceof IntegerObject || right instanceof FloatObject)) 
    return left.value === right.value;
  if (left instanceof StringObject && right instanceof StringObject) 
    return left.value === right.value; 
  if (left instanceof NullObject) 
    return true;

  return left === right;
}

function nativeBoolToBooleanObject(value: boolean): BooleanObject {
  return value ? TRUE : FALSE;
}

function isError(obj: RuntimeObject): boolean {
  return obj instanceof ErrorObject;
}

function newError(message: string): ErrorObject {
  return new ErrorObject(message);
}