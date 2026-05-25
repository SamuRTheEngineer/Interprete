// ============================================================
//  ast.ts  –  Árbol Sintáctico Abstracto (AST)
//
//  El AST es la representación interna del programa como un árbol de nodos.
//  El Parser toma la secuencia de tokens del Lexer y construye este árbol.
//  El Evaluador luego lo recorre para ejecutar el programa.
//
//  Jerarquía:
//    Node
//    ├── Statement  (sentencias: no producen valor)
//    │   ├── Program              ← nodo raíz
//    │   ├── LetStatement         ← let x = expr;
//    │   ├── ConstStatement       ← const x = expr;
//    │   ├── ReturnStatement      ← return expr;
//    │   ├── ExpressionStatement  ← expr;
//    │   ├── BlockStatement       ← { stmt; stmt; }
//    │   ├── WhileStatement       ← while (cond) { }
//    │   ├── ForStatement         ← for (init; cond; update) { }
//    │   ├── BreakStatement       ← break;
//    │   └── ContinueStatement    ← continue;
//    │
//    └── Expression (expresiones: producen un valor)
//        ├── Identifier           ← x, miVariable
//        ├── IntegerLiteral       ← 42
//        ├── FloatLiteral         ← 3.14
//        ├── StringLiteral        ← "hola"
//        ├── BooleanLiteral       ← true / false
//        ├── NullLiteral          ← null
//        ├── PrefixExpression     ← !expr, -expr
//        ├── InfixExpression      ← expr OP expr
//        ├── AssignExpression     ← x = expr, x += expr
//        ├── IfExpression         ← if (cond) { } else { }
//        ├── FunctionLiteral      ← function(params) { body }
//        └── CallExpression       ← funcion(args)
// ============================================================

import type { Token } from "./tokens";

// ─────────────────────────────────────────────────────────────────────────────
// INTERFACES BASE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Nodo base del AST. Todo nodo debe poder:
 * - retornar el literal del token que lo originó (útil para debug)
 * - representarse como string (útil para imprimir el AST)
 */
export interface Node {
  tokenLiteral(): string;
  toString(): string;
}

/**
 * Nodo base para SENTENCIAS.
 * Las sentencias ejecutan una acción pero no producen un valor.
 * Ejemplos: let x = 5;   return x;   while (...) { }
 *
 * statementNode() es un método marcador vacío: solo existe para que
 * TypeScript pueda distinguir Statement de Expression en el sistema de tipos.
 */
export interface Statement extends Node {
  statementNode(): void;
}

/**
 * Nodo base para EXPRESIONES.
 * Las expresiones producen un valor al ser evaluadas.
 * Ejemplos: 5 + 3,   miFuncion(x),   x == y
 */
export interface Expression extends Node {
  expressionNode(): void;
}

// ─────────────────────────────────────────────────────────────────────────────
// NODO RAÍZ
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Nodo raíz del AST. Representa el programa completo.
 * Contiene la lista de todas las sentencias de alto nivel.
 * El evaluador recorre esta lista en orden.
 */
export class Program implements Node {
  statements: Statement[] = [];

  tokenLiteral(): string {
    return this.statements[0]?.tokenLiteral() ?? "";
  }

  toString(): string {
    return this.statements.map(s => s.toString()).join("\n");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SENTENCIAS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Declaración de variable mutable: let <nombre> = <valor>;
 *
 * Ejemplo: let resultado = 10 + 5;
 *   token → Token LET
 *   name  → Identifier("resultado")
 *   value → InfixExpression(10 + 5)
 */
export class LetStatement implements Statement {
  constructor(
    public token : Token,           // el token LET
    public name  : Identifier,      // el nombre de la variable
    public value : Expression | null // la expresión asignada
  ) {}

  statementNode() {}

  tokenLiteral(): string { return this.token.literal; }

  toString(): string {
    return `let ${this.name} = ${this.value ?? ""};`;
  }
}

/**
 * Declaración de variable inmutable: const <nombre> = <valor>;
 *
 * Igual que LetStatement pero el evaluador deberá rechazar reasignaciones.
 */
export class ConstStatement implements Statement {
  constructor(
    public token : Token,
    public name  : Identifier,
    public value : Expression | null
  ) {}

  statementNode() {}

  tokenLiteral(): string { return this.token.literal; }

  toString(): string {
    return `const ${this.name} = ${this.value ?? ""};`;
  }
}

/**
 * Sentencia de retorno: return <valor>;
 *
 * Ejemplo: return x + 1;
 */
export class ReturnStatement implements Statement {
  constructor(
    public token       : Token,
    public returnValue : Expression | null  // la expresión a retornar
  ) {}

  statementNode() {}

  tokenLiteral(): string { return this.token.literal; }

  toString(): string {
    return `return ${this.returnValue ?? ""};`;
  }
}

/**
 * Una expresión usada como sentencia completa.
 *
 * Cuando una expresión aparece sola en una línea (por ejemplo una llamada
 * a función cuyo resultado no se asigna), se envuelve en este nodo.
 *
 * Ejemplo: miFuncion(x);
 */
export class ExpressionStatement implements Statement {
  constructor(
    public token      : Token,
    public expression : Expression | null = null
  ) {}

  statementNode() {}

  tokenLiteral(): string { return this.token.literal; }

  toString(): string {
    return this.expression?.toString() ?? "";
  }
}

/**
 * Bloque de sentencias entre llaves: { stmt; stmt; }
 *
 * Se usa como cuerpo de if, while, for y funciones.
 */
export class BlockStatement implements Statement {
  statements: Statement[] = [];

  constructor(public token: Token) {} // el token '{'

  statementNode() {}

  tokenLiteral(): string { return this.token.literal; }

  toString(): string {
    const body = this.statements.map(s => `  ${s.toString()}`).join("\n");
    return `{\n${body}\n}`;
  }
}

/**
 * Bucle while: while (<condición>) { <cuerpo> }
 *
 * Ejemplo:
 *   while (x < 10) {
 *     x += 1;
 *   }
 */
export class WhileStatement implements Statement {
  constructor(
    public token     : Token,
    public condition : Expression,
    public body      : BlockStatement
  ) {}

  statementNode() {}

  tokenLiteral(): string { return this.token.literal; }

  toString(): string {
    return `while (${this.condition}) ${this.body}`;
  }
}

/**
 * Bucle for: for (<init>; <condición>; <actualización>) { <cuerpo> }
 *
 * Ejemplo:
 *   for (let i = 0; i < 10; i += 1) {
 *     print(i);
 *   }
 *
 * Los tres componentes del encabezado son opcionales:
 *   init      → sentencia de inicialización  (puede ser null)
 *   condition → condición de continuación    (null = bucle infinito)
 *   update    → expresión de actualización   (puede ser null)
 */
export class ForStatement implements Statement {
  constructor(
    public token     : Token,
    public init      : Statement   | null,
    public condition : Expression  | null,
    public update    : Expression  | null,
    public body      : BlockStatement
  ) {}

  statementNode() {}

  tokenLiteral(): string { return this.token.literal; }

  toString(): string {
    return `for (${this.init ?? ""}; ${this.condition ?? ""}; ${this.update ?? ""}) ${this.body}`;
  }
}

/**
 * Sentencia break: interrumpe el bucle más cercano.
 */
export class BreakStatement implements Statement {
  constructor(public token: Token) {}

  statementNode() {}

  tokenLiteral(): string { return this.token.literal; }

  toString(): string { return "break;"; }
}

/**
 * Sentencia continue: salta al siguiente ciclo del bucle más cercano.
 */
export class ContinueStatement implements Statement {
  constructor(public token: Token) {}

  statementNode() {}

  tokenLiteral(): string { return this.token.literal; }

  toString(): string { return "continue;"; }
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPRESIONES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Nombre de variable o función: x,  resultado,  miFuncion
 */
export class Identifier implements Expression {
  constructor(
    public token : Token,   // token IDENTIFIER
    public value : string   // el nombre como string
  ) {}

  expressionNode() {}

  tokenLiteral(): string { return this.token.literal; }

  toString(): string { return this.value; }
}

/**
 * Literal entero: 42, 0, 100
 * El signo negativo (-5) se maneja como PrefixExpression.
 */
export class IntegerLiteral implements Expression {
  constructor(
    public token : Token,
    public value : number   // ya convertido a número
  ) {}

  expressionNode() {}

  tokenLiteral(): string { return this.token.literal; }

  toString(): string { return String(this.value); }
}

/**
 * Literal decimal: 3.14, 2.0, 0.5
 */
export class FloatLiteral implements Expression {
  constructor(
    public token : Token,
    public value : number
  ) {}

  expressionNode() {}

  tokenLiteral(): string { return this.token.literal; }

  toString(): string { return String(this.value); }
}

/**
 * Literal de texto: "hola mundo"
 * El valor ya viene sin las comillas (el lexer las consumió).
 */
export class StringLiteral implements Expression {
  constructor(
    public token : Token,
    public value : string
  ) {}

  expressionNode() {}

  tokenLiteral(): string { return this.token.literal; }

  toString(): string { return `"${this.value}"`; }
}

/**
 * Literal booleano: true / false
 */
export class BooleanLiteral implements Expression {
  constructor(
    public token : Token,
    public value : boolean
  ) {}

  expressionNode() {}

  tokenLiteral(): string { return this.token.literal; }

  toString(): string { return this.value ? "true" : "false"; }
}

/**
 * Literal nulo: null
 */
export class NullLiteral implements Expression {
  constructor(public token: Token) {}

  expressionNode() {}

  tokenLiteral(): string { return this.token.literal; }

  toString(): string { return "null"; }
}

/**
 * Expresión con operador PREFIJO: <operador><expresión>
 *
 * Ejemplos:
 *   !true   →  PrefixExpression(operator="!", right=BooleanLiteral(true))
 *   -5      →  PrefixExpression(operator="-", right=IntegerLiteral(5))
 */
export class PrefixExpression implements Expression {
  constructor(
    public token    : Token,
    public operator : string,             // "!" o "-"
    public right    : Expression | null = null
  ) {}

  expressionNode() {}

  tokenLiteral(): string { return this.token.literal; }

  toString(): string { return `(${this.operator}${this.right})`; }
}

/**
 * Expresión con operador INFIJO: <izquierda> <operador> <derecha>
 *
 * Ejemplos:
 *   5 + 3     →  InfixExpression(left=5,  operator="+",  right=3)
 *   x == y    →  InfixExpression(left=x,  operator="==", right=y)
 *   a && b    →  InfixExpression(left=a,  operator="&&", right=b)
 */
export class InfixExpression implements Expression {
  constructor(
    public token    : Token,
    public left     : Expression,
    public operator : string,
    public right    : Expression | null = null
  ) {}

  expressionNode() {}

  tokenLiteral(): string { return this.token.literal; }

  toString(): string { return `(${this.left} ${this.operator} ${this.right})`; }
}

/**
 * Expresión de asignación: x = expr   x += expr   x -= expr  etc.
 *
 * Es una expresión (no sentencia) porque puede aparecer dentro de otra
 * expresión, aunque en la práctica casi siempre se usa como sentencia.
 *
 * Ejemplos:
 *   x = 10
 *   contador += 1
 */
export class AssignExpression implements Expression {
  constructor(
    public token    : Token,       // el token del operador (=, +=, etc.)
    public name     : Identifier,  // la variable que recibe el valor
    public operator : string,      // "=", "+=", "-=", "*=", "/=", "%="
    public value    : Expression
  ) {}

  expressionNode() {}

  tokenLiteral(): string { return this.token.literal; }

  toString(): string { return `${this.name} ${this.operator} ${this.value}`; }
}

/**
 * Expresión condicional: if (<condición>) { } else { }
 *
 * Es una Expression (no Statement) porque en algunos lenguajes el if
 * puede producir un valor. El else if se modela como un IfExpression
 * anidado dentro del bloque else:
 *
 *   if (a) { } else { if (b) { } else { } }
 *
 * alternative es null si no hay rama else.
 */
export class IfExpression implements Expression {
  constructor(
    public token       : Token,
    public condition   : Expression,
    public consequence : BlockStatement,
    public alternative : BlockStatement | null = null  // rama else (opcional)
  ) {}

  expressionNode() {}

  tokenLiteral(): string { return this.token.literal; }

  toString(): string {
    let out = `if (${this.condition}) ${this.consequence}`;
    if (this.alternative) out += ` else ${this.alternative}`;
    return out;
  }
}

/**
 * Definición de función: function(<parámetros>) { <cuerpo> }
 *
 * Las funciones son valores de primera clase: se pueden asignar a variables,
 * pasar como argumentos y retornar desde otras funciones.
 *
 * name se rellena opcionalmente cuando la función se asigna con let/const,
 * para poder mostrar un nombre útil en mensajes de error.
 *
 * Ejemplo:
 *   let suma = function(a, b) { return a + b; }
 *     → FunctionLiteral(params=[a,b], body=..., name="suma")
 */
export class FunctionLiteral implements Expression {
  constructor(
    public token      : Token,
    public parameters : Identifier[],
    public body       : BlockStatement,
    public name       : string = ""     // nombre opcional (para debug)
  ) {}

  expressionNode() {}

  tokenLiteral(): string { return this.token.literal; }

  toString(): string {
    const params = this.parameters.map(p => p.toString()).join(", ");
    const nameStr = this.name ? ` ${this.name}` : "";
    return `function${nameStr}(${params}) ${this.body}`;
  }
}

/**
 * Llamada a función: <función>(<argumentos>)
 *
 * La función puede ser un Identifier (nombre) o cualquier expresión
 * que produzca una función.
 *
 * Ejemplos:
 *   factorial(5)
 *   suma(x, y + 1)
 *   getCallback()(args)   ← función que retorna función
 */
export class CallExpression implements Expression {
  constructor(
    public token     : Token,         // el token '('
    public func      : Expression,    // la función a llamar
    public args      : Expression[]   // lista de argumentos
  ) {}

  expressionNode() {}

  tokenLiteral(): string { return this.token.literal; }

  toString(): string {
    const args = this.args.map(a => a.toString()).join(", ");
    return `${this.func}(${args})`;
  }
}