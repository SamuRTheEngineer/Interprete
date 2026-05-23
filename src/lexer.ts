// ============================================================
//  lexer.ts  –  Analizador Léxico (Lexer)
// ============================================================

import { Token, TokenType, createToken, KEYWORDS } from "./tokens";

export class Lexer {
  private source  : string; // código fuente a analizar (codigo ingresado)
  private pos     : number = 0;  // posición actual
  private line    : number = 1;
  private column  : number = 1;

  constructor(source: string) {
    this.source = source;
  }

  // ── Utilidades de navegación ──────────────────────────────

  private current(): string {
    return this.source[this.pos] ?? "\0"; //Usamos el "\0" para indicar el fin del archivo (EOF) cuando se intenta acceder a una posición fuera de los límites de la cadena source.
  }

  private peek(): string {
    return this.source[this.pos + 1] ?? "\0";
  }

  private advance(): string {
    const ch = this.current();
    this.pos++;
    if (ch === "\n") { this.line++; this.column = 1; }
    else             { this.column++; }
    return ch;
  }

  private skipWhitespace(): void {
    while (" \t\r\n".includes(this.current()) && this.current() !== "\0") {
      this.advance();
    }
  }

  private skipLineComment(): void {
    while (this.current() !== "\n" && this.current() !== "\0") {
      this.advance();
    }
  }

  private skipBlockComment(): void {
    while (!(this.current() === "*" && this.peek() === "/") && this.current() !== "\0") {
      this.advance();
    }
    if (this.current() !== "\0") {
      this.advance(); // *
      this.advance(); // /
    }
  }

  // ── Lectura de literales ──────────────────────────────────

  private readIdentifier(): string {
    let result = "";
    while (/[a-zA-Z_0-9]/.test(this.current())) {
      result += this.advance();
    }
    return result;
  }

  private readNumber(): Token {
    const startLine = this.line;
    const startCol  = this.column;
    let result = "";
    let isFloat = false;

    while (/[0-9]/.test(this.current())) {
      result += this.advance();
    }

    if (this.current() === "." && /[0-9]/.test(this.peek())) {
      isFloat = true;
      result += this.advance(); // consume '.'
      while (/[0-9]/.test(this.current())) {
        result += this.advance();
      }
    }

    const type = isFloat ? TokenType.FLOAT : TokenType.INTEGER;
    return createToken(type, result, startLine, startCol);
  }

  private readString(quote: string): Token {
    const startLine = this.line;
    const startCol  = this.column;
    this.advance(); // consume apertura de comilla
    let result = "";

    while (this.current() !== quote && this.current() !== "\0") {
      if (this.current() === "\\") { 
        this.advance();
        const esc: Record<string, string> = { n:"\n", t:"\t", r:"\r", "\\":"\\", "'":"'", '"':'"' };
        result += esc[this.current()] ?? this.current(); //Si hay un escape (\) no valido, se ignora el backslash
        this.advance();
      } else {
        result += this.advance();
      }
    }

    if (this.current() === "\0") {
      return createToken(TokenType.ILLEGAL, result, startLine, startCol);
    }

    this.advance(); // consume cierre de comilla
    return createToken(TokenType.STRING, result, startLine, startCol);
  }

  // ── Método principal: nextToken ───────────────────────────

  nextToken(): Token {
    this.skipWhitespace();

    // Comentarios
    if (this.current() === "/" && this.peek() === "/") {
      this.skipLineComment();
      return this.nextToken();
    }
    if (this.current() === "/" && this.peek() === "*") {
      this.advance(); this.advance();
      this.skipBlockComment();
      return this.nextToken();
    }

    const line = this.line;
    const col  = this.column;
    const ch   = this.current();

    // EOF
    if (ch === "\0") return createToken(TokenType.EOF, "EOF", line, col);

    // Números
    if (/[0-9]/.test(ch)) return this.readNumber();

    // Strings
    if (ch === '"' || ch === "'") return this.readString(ch);

    // Identificadores y palabras clave
    if (/[a-zA-Z_]/.test(ch)) {
      const ident = this.readIdentifier();
      const type  = KEYWORDS[ident] ?? TokenType.IDENTIFIER;
      return createToken(type, ident, line, col);
    }

    // Operadores y símbolos
    this.advance(); //Con esto, ch es actual, y this.current() es el siguiente.

    switch (ch) {
      case "+":
        if (this.current() === "=") { this.advance(); return createToken(TokenType.PLUS_ASSIGN,  "+=", line, col); }
        return createToken(TokenType.PLUS,      "+",  line, col);
      case "-":
        if (this.current() === "=") { this.advance(); return createToken(TokenType.MINUS_ASSIGN, "-=", line, col); }
        return createToken(TokenType.MINUS,     "-",  line, col);
      case "*":
        if (this.current() === "*") { this.advance(); return createToken(TokenType.POWER,        "**", line, col); }
        if (this.current() === "=") { this.advance(); return createToken(TokenType.STAR_ASSIGN,  "*=", line, col); }
        return createToken(TokenType.ASTERISK,  "*",  line, col);
      case "/":
        if (this.current() === "=") { this.advance(); return createToken(TokenType.SLASH_ASSIGN,  "/=", line, col); }
        return createToken(TokenType.SLASH,     "/",  line, col);
      case "%":
        if (this.current() === "=") { this.advance(); return createToken(TokenType.PERCENT_ASSIGN, "%=", line, col); }
        return createToken(TokenType.PERCENT,   "%",  line, col);
      case "=":
        if (this.current() === "=") { this.advance(); return createToken(TokenType.EQ,   "==", line, col); }
        if (this.current() === ">") { this.advance(); return createToken(TokenType.ARROW, "=>", line, col); }
        return createToken(TokenType.ASSIGN,    "=",  line, col);
      case "!":
        if (this.current() === "=") { this.advance(); return createToken(TokenType.NEQ,  "!=", line, col); }
        return createToken(TokenType.NOT,       "!",  line, col);
      case "<":
        if (this.current() === "=") { this.advance(); return createToken(TokenType.LTE,  "<=", line, col); }
        return createToken(TokenType.LT,        "<",  line, col);
      case ">":
        if (this.current() === "=") { this.advance(); return createToken(TokenType.GTE,  ">=", line, col); }
        return createToken(TokenType.GT,        ">",  line, col);
      case "&":
        if (this.current() === "&") { this.advance(); return createToken(TokenType.AND,  "&&", line, col); }
        return createToken(TokenType.ILLEGAL,   "&",  line, col);
      case "|":
        if (this.current() === "|") { this.advance(); return createToken(TokenType.OR,   "||", line, col); }
        return createToken(TokenType.ILLEGAL,   "|",  line, col);
      case "(":  return createToken(TokenType.LPAREN,    "(", line, col);
      case ")":  return createToken(TokenType.RPAREN,    ")", line, col);
      case "{":  return createToken(TokenType.LBRACE,    "{", line, col);
      case "}":  return createToken(TokenType.RBRACE,    "}", line, col);
      case "[":  return createToken(TokenType.LBRACKET,  "[", line, col);
      case "]":  return createToken(TokenType.RBRACKET,  "]", line, col);
      case ";":  return createToken(TokenType.SEMICOLON, ";", line, col);
      case ":":  return createToken(TokenType.COLON,     ":", line, col);
      case ",":  return createToken(TokenType.COMMA,     ",", line, col);
      case ".":  return createToken(TokenType.DOT,       ".", line, col);
      default:   return createToken(TokenType.ILLEGAL,   ch,  line, col);
    }
  }

  // ── Tokenizar todo el input ───────────────────────────────

  tokenize(): Token[] {
    const tokens: Token[] = [];
    let tok: Token;
    do {
      tok = this.nextToken();
      tokens.push(tok);
    } while (tok.type !== TokenType.EOF);
    return tokens;
  }
}