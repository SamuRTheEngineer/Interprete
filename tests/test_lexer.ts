import assert from "node:assert/strict";
import { Lexer } from "../src/lexer";
import { Token, TokenType } from "../src/tokens";

function tokenize(source: string): Token[] {
  const lexer = new Lexer(source);
  const tokens: Token[] = [];

  while (true) {
    const tok = lexer.nextToken();

    if (tok.type === TokenType.EOF) {
      break;
    }

    tokens.push(tok);
  }

  return tokens;
}

function expectTokenTypes(source: string, expected: TokenType[]): void {
  const tokens = tokenize(source);

  assert.equal(
    tokens.length,
    expected.length,
    `Se esperaban ${expected.length} tokens en "${source}", pero se obtuvieron ${tokens.length}`
  );

  const actualTypes = tokens.map((token) => token.type);

  assert.deepEqual(
    actualTypes,
    expected,
    `Tipos de token incorrectos para "${source}"`
  );
}

function expectSingleToken(
  source: string,
  expectedType: TokenType,
  expectedLiteral: string
): void {
  const tokens = tokenize(source);

  assert.equal(
    tokens.length,
    1,
    `Se esperaba exactamente 1 token en "${source}", pero se obtuvieron ${tokens.length}`
  );

  assert.equal(tokens[0].type, expectedType);
  assert.equal(tokens[0].literal, expectedLiteral);
}

function expectTokenAt(
  source: string,
  index: number,
  expectedType: TokenType,
  expectedLiteral: string,
  expectedLine: number,
  expectedColumn: number
): void {
  const tokens = tokenize(source);

  assert.ok(
    tokens[index] !== undefined,
    `No existe el token en índice ${index} para "${source}"`
  );

  const token = tokens[index];

  assert.equal(token.type, expectedType);
  assert.equal(token.literal, expectedLiteral);
  assert.equal(token.line, expectedLine);
  assert.equal(token.column, expectedColumn);
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

run("suma", () => {
  expectSingleToken("+", TokenType.PLUS, "+");
});

run("expresion_aritmetica", () => {
  expectTokenTypes("10 + 3 * 2 - 1", [
    TokenType.INTEGER,
    TokenType.PLUS,
    TokenType.INTEGER,
    TokenType.ASTERISK,
    TokenType.INTEGER,
    TokenType.MINUS,
    TokenType.INTEGER,
  ]);
});

run("operadores_de_comparacion_y_logicos", () => {
  expectTokenTypes("== != < > <= >= && || !", [
    TokenType.EQ,
    TokenType.NEQ,
    TokenType.LT,
    TokenType.GT,
    TokenType.LTE,
    TokenType.GTE,
    TokenType.AND,
    TokenType.OR,
    TokenType.NOT,
  ]);
});

run("asignacion_compuesta", () => {
  expectTokenTypes("= += -= *= /= %=", [
    TokenType.ASSIGN,
    TokenType.PLUS_ASSIGN,
    TokenType.MINUS_ASSIGN,
    TokenType.STAR_ASSIGN,
    TokenType.SLASH_ASSIGN,
    TokenType.PERCENT_ASSIGN,
  ]);
});

run("delimitadores", () => {
  expectTokenTypes("( ) { } [ ] ; : , . =>", [
    TokenType.LPAREN,
    TokenType.RPAREN,
    TokenType.LBRACE,
    TokenType.RBRACE,
    TokenType.LBRACKET,
    TokenType.RBRACKET,
    TokenType.SEMICOLON,
    TokenType.COLON,
    TokenType.COMMA,
    TokenType.DOT,
    TokenType.ARROW,
  ]);
});

run("enteros_y_flotantes", () => {
  expectTokenTypes("42 3.14 0 10.5", [
    TokenType.INTEGER,
    TokenType.FLOAT,
    TokenType.INTEGER,
    TokenType.FLOAT,
  ]);
});

run("keywords_e_identificadores", () => {
  expectTokenTypes(
    "let const function return if else while for true false null break continue miVariable _temp valor1",
    [
      TokenType.LET,
      TokenType.CONST,
      TokenType.FUNCTION,
      TokenType.RETURN,
      TokenType.IF,
      TokenType.ELSE,
      TokenType.WHILE,
      TokenType.FOR,
      TokenType.TRUE,
      TokenType.FALSE,
      TokenType.NULL,
      TokenType.BREAK,
      TokenType.CONTINUE,
      TokenType.IDENTIFIER,
      TokenType.IDENTIFIER,
      TokenType.IDENTIFIER,
    ]
  );
});

run("ignora_espacios_y_comentarios", () => {
  expectTokenTypes("  \n\t 1 // comentario\n 2 /* bloque */ 3", [
    TokenType.INTEGER,
    TokenType.INTEGER,
    TokenType.INTEGER,
  ]);
});

run("strings_y_escapes", () => {
  const tokens = tokenize('"hola" \'adios\' "linea\\nNueva" "tab\\t" "comilla\\\"" "slash\\\\\"');

  assert.equal(tokens.length, 6);
  assert.deepEqual(
    tokens.map((token) => token.type),
    [
      TokenType.STRING,
      TokenType.STRING,
      TokenType.STRING,
      TokenType.STRING,
      TokenType.STRING,
      TokenType.STRING,
    ]
  );

  assert.deepEqual(
    tokens.map((token) => token.literal),
    [
      "hola",
      "adios",
      "linea\nNueva",
      "tab\t",
      'comilla"',
      "slash\\",
    ]
  );
});

run("caracteres_invalidos", () => {
  const tokens = tokenize("@ ? & |");

  assert.deepEqual(
    tokens.map((token) => token.type),
    [TokenType.ILLEGAL, TokenType.ILLEGAL, TokenType.ILLEGAL, TokenType.ILLEGAL]
  );

  assert.deepEqual(
    tokens.map((token) => token.literal),
    ["@", "?", "&", "|"]
  );
});

run("cadena_sin_cerrar", () => {
  const tokens = tokenize('"texto sin cerrar');

  assert.equal(tokens.length, 1);
  assert.equal(tokens[0].type, TokenType.ILLEGAL);
  assert.equal(tokens[0].literal, "texto sin cerrar");
});

run("posicion_de_tokens", () => {
  expectTokenAt("let x = 1\nx += 2", 0, TokenType.LET, "let", 1, 1);
  expectTokenAt("let x = 1\nx += 2", 1, TokenType.IDENTIFIER, "x", 1, 5);
  expectTokenAt("let x = 1\nx += 2", 2, TokenType.ASSIGN, "=", 1, 7);
  expectTokenAt("let x = 1\nx += 2", 3, TokenType.INTEGER, "1", 1, 9);

  expectTokenAt("let x = 1\nx += 2", 4, TokenType.IDENTIFIER, "x", 2, 1);
  expectTokenAt("let x = 1\nx += 2", 5, TokenType.PLUS_ASSIGN, "+=", 2, 3);
  expectTokenAt("let x = 1\nx += 2", 6, TokenType.INTEGER, "2", 2, 6);
});

run("power_y_operadores_aritmeticos", () => {
  expectTokenTypes("** / % + - *", [
    TokenType.POWER,
    TokenType.SLASH,
    TokenType.PERCENT,
    TokenType.PLUS,
    TokenType.MINUS,
    TokenType.ASTERISK,
  ]);
});

console.log("Todos los tests del lexer pasaron correctamente.");