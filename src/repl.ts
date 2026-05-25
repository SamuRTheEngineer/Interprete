// =============================================================================
//  repl.ts  –  Read-Eval-Print Loop
// =============================================================================

import * as readline from "readline";
import { Lexer } from "./lexer";
import type { Token } from "./tokens";
import { TokenType } from "./tokens";
import { visualize } from "./astVisualizer";
import { Parser } from "./parser";

// Paletas del REPL
const C_RESET   = "\x1b[0m";
const C_BOLD    = "\x1b[1m";
const C_RED     = "\x1b[31m";
const C_GREEN   = "\x1b[32m";
const C_YELLOW  = "\x1b[33m";
const C_CYAN    = "\x1b[36m";
const C_DIM     = "\x1b[90m";

const EEGG1 = `
  _____                     ___________
 |  __ \\                    |  |  __  |
 | |__) |___  _ __ _ __     |  | |  | |
 |  ___/ _ \\| '__| '_ \\    _|  |_|  |_|
 | |  | (_) | |  | | | |  |            |
 |_|   \\___/|_|  |_| |_|  |____HUB_____|
`;

const BANNER = `
${C_CYAN}${C_BOLD}╔══════════════════════════════════════════════════════╗
║          RPS Lexer & Parser – Consola Interactiva    ║
║  Escribe código para ver el AST por defecto.         ║
║  Comandos especiales:                                ║
║    :tokens <codigo> → Mostrar tokens generados       ║
║    :q  o  exit    → Salir                            ║
║    :h  o  help    → Mostrar ayuda                    ║
║    :clear         → Limpiar pantalla                 ║
╚══════════════════════════════════════════════════════╝${C_RESET}
`;

const OLA = `
Ola como estas
`;

const HELP = `
${C_YELLOW}${C_BOLD}Ejemplos de entrada:${C_RESET}
  ${C_DIM}let x = 42;${C_RESET}
  ${C_DIM}let suma = function(a, b) { return a + b; };${C_RESET}
  ${C_DIM}if (x >= 10 && x != 20) { print("ok"); }${C_RESET}
  ${C_DIM}2 ** 3 ** 2;${C_RESET}
`;

function padEnd(str: string, len: number): string {
  return str.length >= len ? str : str + " ".repeat(len - str.length);
}

function printTokens(tokens: Token[]): void {
  const header = `  ${ padEnd("TIPO", 16) } ${ padEnd("LITERAL", 20) } LÍNEA:COL`;
  const sep    = "  " + "─".repeat(50);

  console.log(`${C_DIM}${sep}${C_RESET}`);
  console.log(`${C_BOLD}${header}${C_RESET}`);
  console.log(`${C_DIM}${sep}${C_RESET}`);

  for (const tok of tokens) {
    if (tok.type === TokenType.EOF) break;
    
    let typeColor = C_GREEN;
    if (tok.type === TokenType.ILLEGAL) typeColor = C_RED;
    
    console.log(
      `  ${typeColor}${padEnd(tok.type, 16)}${C_RESET} ${C_YELLOW}${padEnd(`"${tok.literal}"`, 22)}${C_RESET} ${C_DIM}${tok.line}:${tok.column}${C_RESET}`
    );
  }

  console.log(`${C_DIM}${sep}${C_RESET}`);
  const count = tokens.filter(t => t.type !== TokenType.EOF).length;
  console.log(`  Total: ${C_CYAN}${count}${C_RESET} token(s)\n`);
}

export function startRepl(): void {
  console.log(BANNER);

  const rl = readline.createInterface({
    input : process.stdin,
    output: process.stdout,
    prompt: `${C_GREEN}${C_BOLD}RPS>> ${C_RESET}`,
  });

  rl.prompt();

  rl.on("line", (line: string) => {
    const input = line.trim();

    if (!input) { rl.prompt(); return; }

    // Comandos Globales de Salida
    if (input === ":q" || input === "exit" || input === "quit" || input === ":Q") {
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

    // Easter Eggs
    if (input === ":ph") {
      console.log(C_RED + EEGG1 + C_RESET);
      rl.prompt();
      return;
    }

    if (input === ":ola") {
      console.log(C_GREEN + OLA + C_RESET);
      rl.prompt();
      return;
    }

    // ─── CONTROL DE BIFURCACIÓN (LEXER vs PARSER) ────────────────────────────
    try {
      if (input.startsWith(":tokens")) {
        const targetInput = input.substring(7).trim();
        
        if (!targetInput) {
          console.log(`${C_YELLOW}⚠️  Por favor escribe una expresión después del prefijo :tokens${C_RESET}\n`);
          rl.prompt();
          return;
        }

        // Camino B: Análisis Léxico puro (Tokens)
        const lexer = new Lexer(targetInput);
        const tokens = lexer.tokenize();
        printTokens(tokens);
        
      } else {
        // Camino A: Análisis Sintáctico (AST) - Por Defecto
        const lexer = new Lexer(input);
        const parser = new Parser(lexer);
        const program = parser.parseProgram();
        const errors = parser.getErrors();

        if (errors.length > 0) {
          console.log(`${C_RED}${C_BOLD}Errores de sintaxis encontrados:${C_RESET}`);
          errors.forEach(err => console.log(`  ${C_RED}- ${err}${C_RESET}`));
          console.log();
        } else {
          const astOutput = visualize(program);
          console.log(astOutput + "\n");
        }
      }
    } catch (err) {
      console.error(`${C_RED}Error crítico interno procesando la entrada:${C_RESET}`, err);
    }

    rl.prompt();
  });

  rl.on("close", () => {
    console.log(`\n${C_YELLOW}RPS finalizado.${C_RESET}`);
    process.exit(0);
  });
}