//  repl.ts  –  Read-Eval-Print Loop

import * as readline from "readline";
import { Lexer } from "./lexer";
import type { Token } from "./tokens";
import { TokenType } from "./tokens";

const BANNER = `
╔══════════════════════════════════════════════════════╗
║          RPS Lexer  –  Analizador Léxico             ║
║  Escribe código y verás los tokens generados.        ║
║  Comandos especiales:                                ║
║    :q  o  exit  → salir                              ║
║    :h           → mostrar ayuda                      ║
║    :clear        → limpiar pantalla                  ║
╚══════════════════════════════════════════════════════╝
`;

const HELP = `
Ejemplos de entrada:
  let x = 42;
  function suma(a, b) { return a + b; }
  if (x >= 10 && x != 20) { print("ok"); }
  let pi = 3.14;
`;

function padEnd(str: string, len: number): string {
  return str.length >= len ? str : str + " ".repeat(len - str.length);
}

function printTokens(tokens: Token[]): void {
  const header = `  ${ padEnd("TIPO", 16) } ${ padEnd("LITERAL", 20) } LÍNEA:COL`;
  const sep    = "  " + "─".repeat(50);

  console.log(sep);
  console.log(header);
  console.log(sep);

  for (const tok of tokens) {
    if (tok.type === TokenType.EOF) break;
    const hasError = tok.type === TokenType.ILLEGAL;
    console.log(
      `${padEnd(tok.type, 16)} ${padEnd(`"${tok.literal}"`, 22)} ${tok.line}:${tok.column}`
    );
  }

  console.log(sep);
  const count = tokens.filter(t => t.type !== TokenType.EOF).length;
  console.log(`  Total: ${count} token(s)\n`);
}

export function startRepl(): void {
  console.log(BANNER);

  const rl = readline.createInterface({
    input : process.stdin,
    output: process.stdout,
    prompt: "RPS>> ",
  });

  rl.prompt();

  rl.on("line", (line: string) => {
    const input = line.trim();

    if (!input) { rl.prompt(); return; }

    if (input === ":q" || input === "exit" || input === "quit") {
      rl.close();
        return;
    }

    if (input === ":h" || input === "help") {
      console.log(HELP);
      rl.prompt();
      return;
    }

    if (input === ":clear") {
      console.clear();
      console.log(BANNER);
      rl.prompt();
      return;
    }

    try {
      const lexer  = new Lexer(input);
      const tokens = lexer.tokenize();
      printTokens(tokens);
    } catch (err) {
      console.error("  Error interno del lexer:", err);
    }

    rl.prompt();
  });

  rl.on("close", () => {
    console.log("\nRPS finalizado.");
    process.exit(0);
  });
}