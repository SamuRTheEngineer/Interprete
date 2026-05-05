//Definición de tipos y estructura de Token

export enum TokenType {
  // Literales
  INTEGER    = "INTEGER",
  FLOAT      = "FLOAT",
  STRING     = "STRING",
  TRUE       = "TRUE",
  FALSE      = "FALSE",
  NULL       = "NULL",

  // Identificadores y palabras reservadas
  IDENTIFIER = "IDENTIFIER",
  LET        = "LET",
  CONST      = "CONST",
  FUNCTION   = "FUNCTION",
  RETURN     = "RETURN",
  IF         = "IF",
  ELSE       = "ELSE", //El else if se manejará en el parser como else + if
  WHILE      = "WHILE",
  FOR        = "FOR",
  BREAK      = "BREAK",
  CONTINUE   = "CONTINUE",

  // Operadores aritméticos
  PLUS       = "PLUS",       // +
  MINUS      = "MINUS",      // -
  ASTERISK   = "ASTERISK",   // *
  SLASH      = "SLASH",      // /
  PERCENT    = "PERCENT",    // %
  POWER      = "POWER",      // **  

  // Operadores de comparación
  EQ         = "EQ",         // ==
  NEQ        = "NEQ",        // !=
  LT         = "LT",         // <
  GT         = "GT",         // >
  LTE        = "LTE",        // <=
  GTE        = "GTE",        // >=

  // Operadores lógicos
  AND        = "AND",        // &&
  OR         = "OR",         // ||
  NOT        = "NOT",        // !

  // Asignación 
  ASSIGN     = "ASSIGN",     // =
  PLUS_ASSIGN  = "PLUS_ASSIGN",  // +=
  MINUS_ASSIGN = "MINUS_ASSIGN", // -=
  STAR_ASSIGN  = "STAR_ASSIGN",  // *=
  SLASH_ASSIGN = "SLASH_ASSIGN", // /=
  PERCENT_ASSIGN = "PERCENT_ASSIGN", // %=

  // Delimitadores
  LPAREN     = "LPAREN",     // (
  RPAREN     = "RPAREN",     // )
  LBRACE     = "LBRACE",     // {
  RBRACE     = "RBRACE",     // }
  LBRACKET   = "LBRACKET",   // [
  RBRACKET   = "RBRACKET",   // ]
  SEMICOLON  = "SEMICOLON",  // ;
  COLON      = "COLON",      // :
  COMMA      = "COMMA",      // ,
  DOT        = "DOT",        // .

  // Especiales
  EOF        = "EOF",
  ILLEGAL    = "ILLEGAL",

  // Funcion flecha
  ARROW      = "ARROW",      // =>

}

// Palabras reservadas del lenguaje
export const KEYWORDS: Record<string, TokenType> = { //El record garantiza que el objeto KEYWORDS solo pueda tener claves de tipo string y valores de tipo TokenType
  let      : TokenType.LET,
  const    : TokenType.CONST,
  function : TokenType.FUNCTION,
  return   : TokenType.RETURN,
  if       : TokenType.IF,
  else     : TokenType.ELSE,
  while    : TokenType.WHILE,
  for      : TokenType.FOR,
  true     : TokenType.TRUE,
  false    : TokenType.FALSE,
  null     : TokenType.NULL,
  break    : TokenType.BREAK,
  continue : TokenType.CONTINUE,
};

// Estructura de un Token
export interface Token {
  type    : TokenType;
  literal : string;
  line    : number;
  column  : number;
}

export function createToken(
  type: TokenType,
  literal: string,
  line: number,
  column: number
): Token {
  return { type, literal, line, column }};