// =============================================================================
//  src/repl.ts  –  Read-Eval-Print Loop (Consola Interactiva)
// =============================================================================

import * as readline from "readline";
import { Lexer } from "./lexer";
import { Parser } from "./parser";
import { evaluate } from "./evaluator";
import { Environment } from "./environment";
import { TokenType, type Token } from "./tokens";
import { visualize } from "./astVisualizer";
import { ObjectTypes, NULL } from "./object_system";

// Paletas del REPL
const C_RESET   = "\x1b[0m";
const C_BOLD    = "\x1b[1m";
const C_RED     = "\x1b[31m";
const C_GREEN   = "\x1b[32m";
const C_YELLOW  = "\x1b[33m";
const C_CYAN    = "\x1b[36m";
const C_DIM     = "\x1b[90m";

type ReplMode = "AST" | "EVALUATE";

const EEGG1 = `
  _____                     ___________
 |  __ \\                    |  |  __  |
 | |__) |___  _ __ _ __     |  | |  | |
 |  ___/ _ \\| '__| '_ \\    _|  |_|  |_|
 | |  | (_) | |  | | | |  |            |
 |_|   \\___/|_|  |_| |_|  |____HUB_____|
`;

function getBanner(mode: ReplMode): string {
  return `
${C_CYAN}${C_BOLD}╔══════════════════════════════════════════════════════╗
║             RPS Console                              ║
║  Comandos de Modo:                                   ║
║    :eval → Cambia al modo Evaluador de código    ║
║    :ast      → Cambia al modo Visualizador de AST    ║
║  Comandos de Utilidad:                               ║
║    :tokens <codigo> → Muestra los tokens al instante ║
║    :clear           → Limpiar pantalla               ║
║    :q o exit        → Salir del intérprete           ║
╚══════════════════════════════════════════════════════╝${C_RESET}`;
}

const HELP = `
${C_YELLOW}${C_BOLD}Ejemplos de código para RPS:${C_RESET}
  ${C_DIM}let x = 10;${C_RESET}
  ${C_DIM}for (let i = 0; i < 3; i += 1) { print(i); }${C_RESET}
  ${C_DIM}const f = function(a, b) { return a ** b; }; f(2, 3);${C_RESET}
`;

function padEnd(str: string, len: number): string {
  const cleanStr = str.replace(/\x1b\[[0-9;]*m/g, "");
  const diff = str.length - cleanStr.length;
  return str.length >= len + diff ? str : str + " ".repeat((len + diff) - str.length);
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
}

export function startRepl(): void {
  let currentMode: ReplMode = "AST";
  console.log(getBanner(currentMode));

  // Ámbito de variables en memoria persistente para el Evaluador
  let evalEnv = Environment.createGlobalEnvironment();

  const rl = readline.createInterface({
    input : process.stdin,
    output: process.stdout,
  });

  const setPrompt = () => {
    const promptLabel = currentMode === "AST" ? "RPS(ast)>> " : "RPS(eval)>> ";
    const color = currentMode === "AST" ? C_YELLOW : C_GREEN;
    rl.setPrompt(`${color}${C_BOLD}${promptLabel}${C_RESET}`);
    rl.prompt();
  };

  setPrompt();

  rl.on("line", (line: string) => {
    const input = line.trim();

    if (!input) { setPrompt(); return; }

    if (input === ":q" || input === "exit" || input === "quit" || input === ":Q") {
      rl.close();
      return;
    }

    if (input === ":h" || input === "help" || input === ":help") {
      console.log(HELP);
      setPrompt();
      return;
    }

    if (input === ":clear") {
      console.clear();
      console.log(getBanner(currentMode));
      setPrompt();
      return;
    }

    if (input === ":eval") {
      currentMode = "EVALUATE";
      evalEnv = Environment.createGlobalEnvironment(); // Reset limpio al entrar
      console.log(`${C_GREEN} Mode: EVALUATE activado. Entorno de memoria listo.${C_RESET}\n`);
      setPrompt();
      return;
    }

    if (input === ":ast") {
      currentMode = "AST";
      console.log(`${C_CYAN} Mode: AST activado. Visualizador sintáctico listo.${C_RESET}\n`);
      setPrompt();
      return;
    }

    if (input === ":ph") {
      console.log(C_RED + EEGG1 + C_RESET);
      setPrompt();
      return;
    }

    if (input.startsWith(":tokens")) {
      const targetInput = input.substring(7).trim();
      if (!targetInput) {
        console.log(`${C_YELLOW}Escribe código después de :tokens${C_RESET}\n`);
      } else {
        printTokens(new Lexer(targetInput).tokenize());
      }
      setPrompt();
      return;
    }

    try {
      const lexer = new Lexer(input);
      const parser = new Parser(lexer);
      const program = parser.parseProgram();
      const errors = parser.getErrors();

      if (errors.length > 0) {
        console.log(`${C_RED}${C_BOLD}Errores de sintaxis encontrados:${C_RESET}`);
        errors.forEach(err => console.log(`  ✗ ${err}${C_RESET}`));
        console.log();
      } else {
        if (currentMode === "AST") {
          const astOutput = visualize(program);
          console.log(astOutput + "\n");
        } else {
          const result = evaluate(program, evalEnv);
          if (result !== null) {
            if (result.type() === ObjectTypes.ERROR) {
              console.log(`${C_RED}${C_BOLD}Error en ejecución:${C_RESET} ${result.inspect()}\n`);
            } else if (result !== NULL && result.type() !== ObjectTypes.NULL) {
              console.log(`${C_YELLOW}${result.inspect()}${C_RESET}\n`);
            }
          }
        }
      }
    } catch (err) {
      console.error(`${C_RED}Error crítico interno:${C_RESET}`, err);
    }

    setPrompt();
  });

  rl.on("close", () => {
    console.log(`\n${C_YELLOW}RPS finalizado.${C_RESET}`);
    process.exit(0);
  });
}