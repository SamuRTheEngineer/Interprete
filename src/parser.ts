// ============================================================
//  parser.ts  –  Analizador Sintáctico (Parser)
//
//  El Parser toma la secuencia de tokens del Lexer y construye el AST.
//  Usa el algoritmo de Pratt Parsing (Top-Down Operator Precedence):
//  cada tipo de token tiene asociada una función de parseo prefix y/o infix.
//
//  Flujo:
//    Tokens → [Parser] → AST → [Evaluador]
//
//  Ejemplo:
//    Entrada: "let x = 5 + 3;"
//    Resultado:
//      Program
//      └── LetStatement
//          ├── name:  Identifier("x")
//          └── value: InfixExpression
//              ├── left:     IntegerLiteral(5)
//              ├── operator: "+"
//              └── right:    IntegerLiteral(3)
// ============================================================

import { Lexer } from "./lexer";
import { Token, TokenType } from "./tokens";
import {
  Program,
  Statement,
  Expression,
  LetStatement,
  ConstStatement,
  ReturnStatement,
  ExpressionStatement,
  BlockStatement,
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
} from "./ast";

// ─────────────────────────────────────────────────────────────────────────────
// TABLA DE PRECEDENCIAS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Niveles de precedencia, de menor a mayor.
 *
 * Determinan el orden de evaluación cuando hay operadores mezclados.
 * Ejemplo: en "2 + 3 * 4", PRODUCT > SUM, así que primero se agrupa 3 * 4.
 */
export const enum Precedence {
  LOWEST      = 1,
  OR          = 2,   // ||
  AND         = 3,   // &&
  EQUALS      = 4,   // == !=
  ASSIGN      = 5,   // = += -= *= /= %=    --Hacía falta agregar los assigns compuestos a la tabla de precedencias para que se agrupen correctamente con sus operandos.
  LESSGREATER = 5,   // < <= > >=
  SUM         = 6,   // + -
  PRODUCT     = 7,   // * / %
  PREFIX      = 8,   // -x  !x
  POWER       = 9,   // **
  CALL        = 10,  // f(args)
}

/** Mapeo de TokenType → nivel de precedencia. */
const PRECEDENCES: Partial<Record<TokenType, Precedence>> = {
  [TokenType.OR]:       Precedence.OR,
  [TokenType.AND]:      Precedence.AND,
  [TokenType.EQ]:       Precedence.EQUALS,
  [TokenType.NEQ]:      Precedence.EQUALS,
  [TokenType.ASSIGN]:   Precedence.ASSIGN,
  [TokenType.PLUS_ASSIGN]: Precedence.ASSIGN,
  [TokenType.MINUS_ASSIGN]: Precedence.ASSIGN,
  [TokenType.STAR_ASSIGN]: Precedence.ASSIGN,
  [TokenType.SLASH_ASSIGN]: Precedence.ASSIGN,
  [TokenType.PERCENT_ASSIGN]: Precedence.ASSIGN,
  [TokenType.LT]:       Precedence.LESSGREATER,
  [TokenType.LTE]:      Precedence.LESSGREATER,
  [TokenType.GT]:       Precedence.LESSGREATER,
  [TokenType.GTE]:      Precedence.LESSGREATER,
  [TokenType.PLUS]:     Precedence.SUM,
  [TokenType.MINUS]:    Precedence.SUM,
  [TokenType.ASTERISK]: Precedence.PRODUCT,
  [TokenType.SLASH]:    Precedence.PRODUCT,
  [TokenType.PERCENT]:  Precedence.PRODUCT,
  [TokenType.POWER]:    Precedence.POWER,
  [TokenType.LPAREN]:   Precedence.CALL,
};

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS DE FUNCIONES DE PARSEO
// ─────────────────────────────────────────────────────────────────────────────

/** Función prefix: parsea un token cuando aparece al INICIO de una expresión.
  Ejemplo: -5, !true, un identificador, un literal
*/

type PrefixParseFn = () => Expression | null;

/** Función infix: parsea un token cuando aparece ENTRE dos expresiones. 
 Recibe la expresión izquierda ya parseada como argumento
 Ejemplo: 5 + 3, función(args)
*/
type InfixParseFn = (left: Expression) => Expression | null;

// ─────────────────────────────────────────────────────────────────────────────
// CLASE PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

export class Parser {

    /* 

    Analizador sintáctico basado en Pratt Parsing.

    Convierte una secuencia de tokens (del Lexer) en un AST (Árbol Sintáctico
    Abstracto). El AST puede luego ser recorrido por un evaluador para
    ejecutar el programa.

    Atributos internos:
      lexer          → Instancia del lexer que produce tokens
      errors         → Lista de errores encontrados durante el parseo
      currentToken  → El token que se está procesando ahora
      peekToken     → El siguiente token (look-ahead de 1)
      prefixParseFns → Funciones de parseo para tokens en posición prefix
      infixParseFns  → Funciones de parseo para tokens en posición infix
      
      */
  private lexer        : Lexer;
  private errors       : string[] = [];
  private currentToken : Token;
  private peekToken    : Token;

  private prefixParseFns : Map<TokenType, PrefixParseFn>;
  private infixParseFns  : Map<TokenType, InfixParseFn>;

  constructor(lexer: Lexer) {
    this.lexer = lexer;

    // Inicializa con un token dummy; se sobreescribirá con los dos advance()
    this.currentToken = { type: TokenType.EOF, literal: "", line: 0, column: 0 };
    this.peekToken    = { type: TokenType.EOF, literal: "", line: 0, column: 0 };

    // ── Registro de funciones PREFIX ─────────────────────────────────────
    // Token al inicio de una expresión → función que lo parsea
    this.prefixParseFns = new Map<TokenType, PrefixParseFn>([
      [TokenType.IDENTIFIER, () => this.parseIdentifier()],
      [TokenType.INTEGER,    () => this.parseIntegerLiteral()],
      [TokenType.FLOAT,      () => this.parseFloatLiteral()],
      [TokenType.STRING,     () => this.parseStringLiteral()],
      [TokenType.TRUE,       () => this.parseBooleanLiteral()],
      [TokenType.FALSE,      () => this.parseBooleanLiteral()],
      [TokenType.NULL,       () => this.parseNullLiteral()],
      [TokenType.MINUS,      () => this.parsePrefixExpression()],
      [TokenType.NOT,        () => this.parsePrefixExpression()],
      [TokenType.LPAREN,     () => this.parseGroupedExpression()],
      [TokenType.IF,         () => this.parseIfExpression()],
      [TokenType.FUNCTION,   () => this.parseFunctionLiteral()],
    ]);

    // ── Registro de funciones INFIX ──────────────────────────────────────
    // Token entre dos expresiones → función que los une
    this.infixParseFns = new Map<TokenType, InfixParseFn>([
      [TokenType.PLUS,            (left) => this.parseInfixExpression(left)],
      [TokenType.MINUS,           (left) => this.parseInfixExpression(left)],
      [TokenType.ASTERISK,        (left) => this.parseInfixExpression(left)],
      [TokenType.SLASH,           (left) => this.parseInfixExpression(left)],
      [TokenType.PERCENT,         (left) => this.parseInfixExpression(left)],

      [TokenType.POWER,           (left) => this.parsePowerExpression(left)],
      
      [TokenType.EQ,              (left) => this.parseInfixExpression(left)],
      [TokenType.NEQ,             (left) => this.parseInfixExpression(left)],
      [TokenType.LT,              (left) => this.parseInfixExpression(left)],
      [TokenType.LTE,             (left) => this.parseInfixExpression(left)],
      [TokenType.GT,              (left) => this.parseInfixExpression(left)],
      [TokenType.GTE,             (left) => this.parseInfixExpression(left)],
      [TokenType.AND,             (left) => this.parseInfixExpression(left)],
      [TokenType.OR,              (left) => this.parseInfixExpression(left)],
      [TokenType.LPAREN,          (left) => this.parseCallExpression(left)],
      // Assigns compuestos como infix: x += 1, x -= 1, etc.
      [TokenType.ASSIGN,          (left) => this.parseAssignExpression(left)],
      [TokenType.PLUS_ASSIGN,     (left) => this.parseAssignExpression(left)],
      [TokenType.MINUS_ASSIGN,    (left) => this.parseAssignExpression(left)],
      [TokenType.STAR_ASSIGN,     (left) => this.parseAssignExpression(left)],
      [TokenType.SLASH_ASSIGN,    (left) => this.parseAssignExpression(left)],
      [TokenType.PERCENT_ASSIGN,  (left) => this.parseAssignExpression(left)],
    ]);

    // Avanza dos veces para inicializar currentToken y peekToken
    this.advance();
    this.advance();
  }

  // ── Propiedad pública ─────────────────────────────────────────────────────

  getErrors(): string[] { return this.errors; }

  // ─────────────────────────────────────────────────────────────────────────
  // MÉTODO PRINCIPAL
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Parsea el programa completo y retorna el nodo raíz del AST.
   * Itera sobre todos los tokens parseando sentencia por sentencia hasta encontrar el token EOF.
   */
  parseProgram(): Program {
    const program = new Program();

    while (this.currentToken.type !== TokenType.EOF) {
      const stmt = this.parseStatement();
      if (stmt !== null) program.statements.push(stmt);
      this.advance();
    }

    return program;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PARSEO DE SENTENCIAS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Despacha al método de parseo correcto según el token actual.
   */
  private parseStatement(): Statement | null {
    switch (this.currentToken.type) {
      case TokenType.LET:      return this.parseLetStatement();
      case TokenType.CONST:    return this.parseConstStatement();
      case TokenType.RETURN:   return this.parseReturnStatement();
      case TokenType.WHILE:    return this.parseWhileStatement();
      case TokenType.FOR:      return this.parseForStatement();
      case TokenType.BREAK:    return this.parseBreakStatement();
      case TokenType.CONTINUE: return this.parseContinueStatement();
      default:                 return this.parseExpressionStatement();
    }
  }

  /**
   * let <nombre> = <expresión>;
   *
   * Ejemplo: let resultado = 10 + 5;
   */
  private parseLetStatement(): LetStatement | null {
    
    // token LET
    const token = this.currentToken; 

    // Crea el nodo Identifier con el nombre de la variable
    if (!this.expectPeek(TokenType.IDENTIFIER)) return null;
    const name = new Identifier(this.currentToken, this.currentToken.literal);

    //Espera el signo =
    if (!this.expectPeek(TokenType.ASSIGN)) return null;
    
    // avanza al inicio de la expresión
    this.advance(); 

    //Parsea la expresión del valor de la variable
    const value = this.parseExpression(Precedence.LOWEST);

    // Si es función, le asignamos el nombre para recursión y debug
    if (value instanceof FunctionLiteral) value.name = name.value;

    //consume punto y coma
    if (this.peekTokenIs(TokenType.SEMICOLON)) this.advance();

    return new LetStatement(token, name, value);
  }

  /**
   * const <nombre> = <expresión>;
   *
   * Igual que let pero el evaluador rechazará reasignaciones.
   */
  private parseConstStatement(): ConstStatement | null {
    const token = this.currentToken; // token CONST

    if (!this.expectPeek(TokenType.IDENTIFIER)) return null;
    const name = new Identifier(this.currentToken, this.currentToken.literal);

    if (!this.expectPeek(TokenType.ASSIGN)) return null;
    this.advance();

    const value = this.parseExpression(Precedence.LOWEST);

    if (value instanceof FunctionLiteral) value.name = name.value;

    if (this.peekTokenIs(TokenType.SEMICOLON)) this.advance();

    return new ConstStatement(token, name, value);
  }

  /**
   * return <expresión>;
   */
  private parseReturnStatement(): ReturnStatement | null {
    
    // token RETURN
    const token = this.currentToken;
    this.advance();

    //Parsea la expresión a retornar. El valor de retorno es opcional: "return;" es válido y retorna null.
    const returnValue = this.parseExpression(Precedence.LOWEST);

    //Consume el punto y coma
    if (this.peekTokenIs(TokenType.SEMICOLON)) this.advance();

    return new ReturnStatement(token, returnValue);
  }

  /**
   * while (<condición>) { <cuerpo> }
   
      Estructura esperada:
        WHILE  LPAREN  <expresión>  RPAREN  LBRACE  <sentencias>  RBRACE

   */
  private parseWhileStatement(): WhileStatement | null {
    // token WHILE
    const token = this.currentToken;

    //Esperamos el token '(' después de 'while'
    if (!this.expectPeek(TokenType.LPAREN)) return null;

    //Avanzamos al inicio de la expresión de condición
    this.advance();

    //Parseamos la expresión de condición
    const condition = this.parseExpression(Precedence.LOWEST);
    if (condition === null) return null;

    //Esperamos el token ')' después de la condición
    if (!this.expectPeek(TokenType.RPAREN)) return null;

    //Esperamos el token '{' al inicio del cuerpo del while
    if (!this.expectPeek(TokenType.LBRACE)) return null;

    //Parseamos el bloque de sentencias dentro del while
    const body = this.parseBlockStatement();

    return new WhileStatement(token, condition, body);
  }

  /**
   * for (<init>; <condición>; <update>) { <cuerpo> }
   *
    Estructura esperada:
        FOR  LPAREN  <init_stmt>  SEMICOLON  <cond_expr>  SEMICOLON
        <update_stmt>  RPAREN  LBRACE  <sentencias>  RBRACE
   * 
   * Los tres componentes del encabezado son opcionales.
   * Ejemplo: for (let i = 0; i < 10; i += 1) { ... }
   */
  private parseForStatement(): ForStatement | null {
    // token FOR
    const token = this.currentToken;

    // Esperamos el token '(' después de 'for'
    if (!this.expectPeek(TokenType.LPAREN)) return null;
    this.advance();

    // ── Init ─────────────────────────────────────────────────────────────
    let init: Statement | null = null;
    if (!this.currentTokenIs(TokenType.SEMICOLON)) {
      init = this.parseStatement();
      // parseStatement deja currentToken en el último token consumido;
      // si no terminó en ';', lo esperamos
      if (!this.currentTokenIs(TokenType.SEMICOLON)) {
        if (!this.expectPeek(TokenType.SEMICOLON)) return null;
      }
    }
    this.advance(); // avanza más allá del ';' de init

    // ── Condición ─────────────────────────────────────────────────────────
    let condition: Expression | null = null;
    if (!this.currentTokenIs(TokenType.SEMICOLON)) {
      condition = this.parseExpression(Precedence.LOWEST);
      if (!this.expectPeek(TokenType.SEMICOLON)) return null;
    }
    this.advance(); // avanza más allá del ';' de condición

    // ── Update ────────────────────────────────────────────────────────────
    let update: Expression | null = null;
    if (!this.currentTokenIs(TokenType.RPAREN)) {
      update = this.parseExpression(Precedence.LOWEST);
      if (!this.expectPeek(TokenType.RPAREN)) return null;
    }

    // Esperamos el token '{' al inicio del cuerpo del for
    if (!this.expectPeek(TokenType.LBRACE)) return null;

    // Parseamos el bloque de sentencias dentro del for
    const body = this.parseBlockStatement();

    return new ForStatement(token, init, condition, update, body);
  }

  /**
   * break;
   */
  private parseBreakStatement(): BreakStatement {
    // Consume el token BREAK
    const token = this.currentToken;
    if (this.peekTokenIs(TokenType.SEMICOLON)) this.advance();
    return new BreakStatement(token);
  }

  /**
   * continue;
   */
  private parseContinueStatement(): ContinueStatement {
    // Consume el token CONTINUE
    const token = this.currentToken;
    if (this.peekTokenIs(TokenType.SEMICOLON)) this.advance();
    return new ContinueStatement(token);
  }

  /**
   * Una expresión usada como sentencia: expr;

  Cuando una expresión aparece sola en una línea (e.g. una llamada
    a función sin asignar su resultado), se envuelve en ExpressionStatement.

   * Ejemplo: miFuncion(x);
   */
  private parseExpressionStatement(): ExpressionStatement | null {
    //
    const token = this.currentToken;

    // Parseamos la expresión completa respetando precedencia
    const expression = this.parseExpression(Precedence.LOWEST);

    //Consume el punto y coma
    if (this.peekTokenIs(TokenType.SEMICOLON)) this.advance();
    return new ExpressionStatement(token, expression);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PARSEO DE BLOQUES
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * { stmt; stmt; ... }
   *
   * Se asume que currentToken apunta al '{'.
   * Parsea sentencias hasta encontrar '}' o EOF.
   * El bloque se representa como un nodo BlockStatement que contiene una lista de sentencias.
   */
  private parseBlockStatement(): BlockStatement {
    const block = new BlockStatement(this.currentToken);
    this.advance(); // avanza más allá del '{'

    //Parsea sentencias dentro del bloque hasta encontrar '}' o EOF
    while (
      !this.currentTokenIs(TokenType.RBRACE) &&
      !this.currentTokenIs(TokenType.EOF)
    ) {
      const stmt = this.parseStatement();
      if (stmt !== null) block.statements.push(stmt);
      this.advance();
    }

    return block;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PRATT PARSING — corazón del parser
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Parsea una expresión respetando la precedencia.
   *
   * Algoritmo:
   *   1. Busca función prefix para el token actual → expresión izquierda.
   *   2. Mientras el siguiente token tenga mayor precedencia:
   *      a. Busca función infix para ese token.
   *      b. Avanza y llama a la función infix con la expresión izquierda.
   *      c. El resultado se convierte en la nueva expresión izquierda.
   *   3. Retorna la expresión acumulada.
   *           
   * Parámetros:
   *   precedence → Nivel mínimo de precedencia. Solo los operadores con
   *                 precedencia MAYOR se "pegan" a esta expresión.
   */
  private parseExpression(precedence: Precedence): Expression | null {
    //Paso 1: función prefix para el token actual
    const prefixFn = this.prefixParseFns.get(this.currentToken.type);

    if (!prefixFn) {
      this.errors.push(
        `[${this.currentToken.line}:${this.currentToken.column}] ` +
        `No se encontró función de parseo para "${this.currentToken.literal}" ` +
        `(${this.currentToken.type})`
      );
      return null;
    }
    //Ejecuta la función prefix para obtener la expresión izquierda
    let left = prefixFn();

    //Paso 2: mientras el siguiente token tenga mayor precedencia, aplica función infix
    while (
      !this.peekTokenIs(TokenType.SEMICOLON) &&
      precedence < this.peekPrecedence()
    ) {
      const infixFn = this.infixParseFns.get(this.peekToken.type);
      if (!infixFn) return left;

      //Avanza al siguiente token (el operador infix) y ejecuta la función infix con la expresión izquierda
      this.advance();
      if (left === null) return null;
      left = infixFn(left);
    }

    return left;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // FUNCIONES PREFIX
  // ─────────────────────────────────────────────────────────────────────────

  /*
        Parsea un identificador (nombre de variable o función).

        Simplemente crea un nodo Identifier con el token actual.
        Ejemplo: 'x', 'resultado', 'miFuncion'
*/
  private parseIdentifier(): Identifier {
    return new Identifier(this.currentToken, this.currentToken.literal);
  }

  /**
   * Parsea un literal entero. Si falla, registra un error y retorna null.
   *
   * Simplemente crea un nodo IntegerLiteral con el token actual.
   * Ejemplo: '5', '42', '-10'
   */
  private parseIntegerLiteral(): IntegerLiteral | null {
    const value = parseInt(this.currentToken.literal, 10);
    if (isNaN(value)) {
      this.errors.push(`No se pudo parsear "${this.currentToken.literal}" como entero`);
      return null;
    }
    return new IntegerLiteral(this.currentToken, value);
  }

  /**
   * Parsea un literal flotante. Si falla, registra un error y retorna null.
   *
   * Simplemente crea un nodo FloatLiteral con el token actual.
   * Ejemplo: '3.14', '-0.001'
   */
  private parseFloatLiteral(): FloatLiteral | null {
    const value = parseFloat(this.currentToken.literal);
    if (isNaN(value)) {
      this.errors.push(`No se pudo parsear "${this.currentToken.literal}" como flotante`);
      return null;
    }
    return new FloatLiteral(this.currentToken, value);
  }

  /**
   * Parsea un literal de cadena.
   *
   * Simplemente crea un nodo StringLiteral con el token actual.
   * Ejemplo: '"Hola, mundo!"', '"123"'
   */
  private parseStringLiteral(): StringLiteral {
    return new StringLiteral(this.currentToken, this.currentToken.literal);
  }

  /**
   * Parsea un literal booleano.
   *
   * Simplemente crea un nodo BooleanLiteral con el token actual.
   * Ejemplo: 'true', 'false'
   */
  private parseBooleanLiteral(): BooleanLiteral {
    return new BooleanLiteral(
      this.currentToken,
      this.currentToken.type === TokenType.TRUE
    );
  }

  /**
   * Parsea un literal nulo.
   *
   * Simplemente crea un nodo NullLiteral con el token actual.
   * Ejemplo: 'null'
   */
  private parseNullLiteral(): NullLiteral {
    return new NullLiteral(this.currentToken);
  }

  /**
   * Operador prefijo: -expr  !expr
   
   Parsea una expresión con operador prefijo: <operador><expresión>

    Operadores soportados: '-' (negación numérica), '!' (negación lógica)

    Ejemplo:
        -5     → PrefixExpression(operator='-', right=IntegerLiteral(5))
        !true  → PrefixExpression(operator='!', right=BooleanLiteral(true))
   */
  private parsePrefixExpression(): PrefixExpression | null {
    const token    = this.currentToken;
    const operator = this.currentToken.literal;

    this.advance(); // avanza al operando

    // Parsea la expresión a la derecha del operador prefijo, con precedencia PREFIX para que se agrupe correctamente.
    const right = this.parseExpression(Precedence.PREFIX);
    return new PrefixExpression(token, operator, right);
  }

  /**
   * Expresión agrupada entre paréntesis: ( expr )
   * Los paréntesis cambian precedencia pero no crean nodo propio.
   */
  private parseGroupedExpression(): Expression | null {
    this.advance(); // avanza más allá del '('

    // Parsea la expresión interna con la menor precedencia para que se agrupe todo lo que haya dentro de los paréntesis. 
    const expression = this.parseExpression(Precedence.LOWEST);

    //Espera el token ')' al final de la expresión agrupada.
    if (!this.expectPeek(TokenType.RPAREN)) return null;

    return expression;
  }

  /**
   * if (<condición>) { <consecuencia> } else { <alternativa> }
   *
   * El else if se modela como un IfExpression anidado dentro del bloque else:
   *   if (a) { } else if (b) { } else { }
   */
  private parseIfExpression(): IfExpression | null {
    const token = this.currentToken; // token IF

    if (!this.expectPeek(TokenType.LPAREN)) return null;
    this.advance();

    const condition = this.parseExpression(Precedence.LOWEST);
    if (condition === null) return null;

    if (!this.expectPeek(TokenType.RPAREN)) return null;
    if (!this.expectPeek(TokenType.LBRACE)) return null;

    const consequence = this.parseBlockStatement();

    // Rama else (opcional)
    let alternative: BlockStatement | null = null;
    if (this.peekTokenIs(TokenType.ELSE)) {
        this.advance(); // consume 'else'

        if (this.peekTokenIs(TokenType.IF)) {
        // else if → avanzamos al IF y lo parseamos como IfExpression anidado
        this.advance(); // consume 'if'
        const nestedIf = this.parseIfExpression();
        if (nestedIf === null) return null;

        // Lo envolvemos en un BlockStatement para que quepa en alternative
        alternative = new BlockStatement(this.currentToken);
        alternative.statements.push(new ExpressionStatement(this.currentToken, nestedIf));
        } else {
        // else normal → parsea el bloque { }
        if (!this.expectPeek(TokenType.LBRACE)) return null;
        alternative = this.parseBlockStatement();
        }
    }

    return new IfExpression(token, condition, consequence, alternative);
    }

  /**
   * Parsea la definición de una función: function(<parámetros>) { <cuerpo> }
   Las funciones son valores de primera clase: se pueden asignar a
   variables, pasar como argumentos, retornar desde otras funciones.
   */
  private parseFunctionLiteral(): FunctionLiteral | null {
    const token = this.currentToken; // token FUNCTION

    //Esperamos el token '(' después de 'function' para iniciar la lista de parámetros
    if (!this.expectPeek(TokenType.LPAREN)) return null;

    //Parsea la lista de parámetros dentro de los paréntesis. Retorna un array de nodos Identifier.
    const parameters = this.parseFunctionParameters();
    if (parameters === null) return null;

    //Esperamos el token '{' para iniciar el cuerpo de la función
    if (!this.expectPeek(TokenType.LBRACE)) return null;

    //Parsea el bloque de sentencias dentro de la función. Retorna un nodo BlockStatement.
    const body = this.parseBlockStatement();

    return new FunctionLiteral(token, parameters, body);
  }

  /**
   * Parsea la lista de parámetros: (a, b, c)
   * Se asume que currentToken apunta al '(' de apertura.
   * Retorna lista de Identifier. Puede estar vacía si no hay parámetros.

   */
  private parseFunctionParameters(): Identifier[] | null {
    const parameters: Identifier[] = [];

    // Sin parámetros: function()
    if (this.peekTokenIs(TokenType.RPAREN)) {
      this.advance();
      return parameters;
    }

    this.advance(); // avanza al primer parámetro
    parameters.push(new Identifier(this.currentToken, this.currentToken.literal));

    while (this.peekTokenIs(TokenType.COMMA)) {
      this.advance(); // consume ','
      this.advance(); // avanza al siguiente parámetro
      parameters.push(new Identifier(this.currentToken, this.currentToken.literal));
    }

    //Esperamos el token ')' al final de la lista de parámetros
    if (!this.expectPeek(TokenType.RPAREN)) return null;

    return parameters;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // FUNCIONES INFIX
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Operador infijo: left OP right
   * Recibe la expresión izquierda (ya parseada) como parámetro.
     El _current_token apunta al operador.
   * Ejemplo: 5 + 3,  x == y,  a && b

    
    Para "5 + 3":
        left = IntegerLiteral(5)
        _current_token = Token(PLUS, '+')
        → parsea 3 como right
        → InfixExpression(left=5, op='+', right=3)
*/
  private parseInfixExpression(left: Expression): InfixExpression | null {
    // El token actual es el operador infix
    const token    = this.currentToken;
    // El literal del token es el operador como string, e.g. "+", "==", etc.
    const operator = this.currentToken.literal;
    // La precedencia del operador actual determina qué operadores se agrupan a la derecha
    const prec     = this.currentPrecedence();

    // avanza al operando derecho
    this.advance(); 

    //Parsea la expresión derecha con la misma precedencia (esto hace que los operadores del mismo nivel sean left-associative)
    const right = this.parseExpression(prec);
    return new InfixExpression(token, left, operator, right);
  }

  /*
  Parsea la expresión de potencia: left ** right
Recibe la expresión izquierda ya parseada como parámetro.
El _current_token apunta al operador '**'.
  */
  private parsePowerExpression(left: Expression): InfixExpression | null {
  const token = this.currentToken;
  const operator = this.currentToken.literal;
  const prec = this.currentPrecedence();

  this.advance(); // Consume '**'

  // Al restar 1 a la precedencia, permitimos que el Pratt Parser
  // siga agrupando hacia la derecha si encuentra otra potencia consecutiva.
  const right = this.parseExpression(prec - 1); 

  return new InfixExpression(token, left, operator, right);
}


  /**
   * Asignación: x = expr   x += expr   x -= expr  etc.
   *
   * Solo se permite asignar a un Identifier, no a expresiones arbitrarias.
   * Ejemplo inválido: 5 + 3 = 10  → error
   */
  private parseAssignExpression(left: Expression): AssignExpression | null {
    if (!(left instanceof Identifier)) {
      this.errors.push(
        `[${this.currentToken.line}:${this.currentToken.column}] ` +
        `El lado izquierdo de una asignación debe ser una variable`
      );
      return null;
    }

    const token    = this.currentToken; // token del operador (=, +=, etc.)
    const operator = this.currentToken.literal; // El literal del token es el operador de asignación como string, e.g. "=", "+=", etc.

    this.advance(); // avanza al valor

    //Parsea la expresión del valor a asignar, con la menor precedencia para que se agrupe todo lo que haya a la derecha.
    const value = this.parseExpression(Precedence.LOWEST);
    if (value === null) return null;

    if (this.currentTokenIs(TokenType.SEMICOLON)) this.advance();

    return new AssignExpression(token, left, operator, value);
  }

  /**
   * Llamada a función: func(arg1, arg2)
   * Recibe la expresión de la función ya parseada como parámetro.
   * El _current_token apunta al '(' de la llamada.

   */
  private parseCallExpression(func: Expression): CallExpression | null {
    const token = this.currentToken; // token '('
    //Parsea la lista de argumentos dentro de los paréntesis. Retorna un array de nodos Expression.
    const args  = this.parseCallArguments();
    if (args === null) return null;
    return new CallExpression(token, func, args);
  }

  /**
   * Parsea la lista de argumentos: (expr1, expr2, expr3)
   * Se asume que currentToken apunta al '(' de apertura.
    Retorna lista de Expression. Puede estar vacía si hay llamada sin args.

   */
  private parseCallArguments(): Expression[] | null {
    const args: Expression[] = [];

    // Sin argumentos: f()
    if (this.peekTokenIs(TokenType.RPAREN)) {
      this.advance(); // consume ')'
      return args;
    }

    this.advance(); // avanza al primer argumento

    //Parsea el primer argumento como expresión completa (no solo un literal) para permitir llamadas anidadas, e.g. f(g(x), 5)
    const first = this.parseExpression(Precedence.LOWEST);
    if (first !== null) args.push(first);

    // Si hay más argumentos, estarán separados por comas
    while (this.peekTokenIs(TokenType.COMMA)) {
      this.advance(); // consume ','
      this.advance(); // avanza al siguiente argumento
      const arg = this.parseExpression(Precedence.LOWEST);
      if (arg !== null) args.push(arg);
    }

    //Espera el token ')' al final de la lista de argumentos
    if (!this.expectPeek(TokenType.RPAREN)) return null;

    return args;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // UTILIDADES DE TOKENS
  // ─────────────────────────────────────────────────────────────────────────

  /** Avanza al siguiente token. */
  private advance(): void {
    this.currentToken = this.peekToken;
    this.peekToken    = this.lexer.nextToken();
  }

  // Verifica si el token actual es del tipo esperado
  private currentTokenIs(type: TokenType): boolean {
    return this.currentToken.type === type;
  }

  // Verifica si el peek token es del tipo esperado
  private peekTokenIs(type: TokenType): boolean {
    return this.peekToken.type === type;
  }

  /**
   * Si el peek token es del tipo esperado, avanza y retorna true.
   * Si no, registra un error y retorna false.
   * Se usa para tokens obligatorios en la gramática.
   */
  private expectPeek(type: TokenType): boolean {
    if (this.peekTokenIs(type)) {
      this.advance(); // avanza al token esperado
      return true;
    }
    this.errors.push(
      `[${this.peekToken.line}:${this.peekToken.column}] ` +
      `Se esperaba "${type}", pero se obtuvo "${this.peekToken.type}" ` +
      `("${this.peekToken.literal}")`
    );
    return false;
  }

  // Retorna la precedencia del token actual, o LOWEST si no está definido.
  private currentPrecedence(): Precedence {
    return PRECEDENCES[this.currentToken.type] ?? Precedence.LOWEST;
  }

  // Retorna la precedencia del peek token, o LOWEST si no está definido.
  private peekPrecedence(): Precedence {
    return PRECEDENCES[this.peekToken.type] ?? Precedence.LOWEST;
  }
}