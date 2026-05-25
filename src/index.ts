// =============================================================================
//  src/index.ts  –  Punto de Entrada Principal (CLI Handler)
// =============================================================================

import * as fs from "node:fs";
import * as path from "node:path";
import { startRepl } from "./repl";
import { Lexer } from "./lexer";
import { Parser } from "./parser";
import { evaluate } from "./evaluator";
import { Environment } from "./environment";
import { ObjectTypes, NULL } from "./object_system";

const C_RED    = "\x1b[31m";
const C_BOLD   = "\x1b[1m";
const C_RESET  = "\x1b[0m";

function runFile(filepath: string): void {
  const resolvedPath = path.resolve(filepath);

  if (!fs.existsSync(resolvedPath)) {
    console.error(`${C_RED}Error: El archivo '${filepath}' no existe.${C_RESET}`);
    process.exit(1);
  }

  const source = fs.readFileSync(resolvedPath, "utf-8");

  const lexer = new Lexer(source);
  const parser = new Parser(lexer);
  const program = parser.parseProgram();
  const errors = parser.getErrors();

  if (errors.length > 0) {
    console.error(`${C_RED}${C_BOLD}Errores de parseo:${C_RESET}`);
    errors.forEach(err => console.error(`  ✗ ${err}`));
    process.exit(1);
  }

  const globalEnv = Environment.createGlobalEnvironment();
  const result = evaluate(program, globalEnv);

  if (result !== null && result.type() === ObjectTypes.ERROR) {
    console.error(`${C_RED}${C_BOLD}Error en ejecución:${C_RESET} ${result.inspect()}`);
    process.exit(1);
  }

  if (result !== null && result !== NULL && result.type() !== ObjectTypes.NULL) {
    console.log(result.inspect());
  }
}

function main(): void {
  const args = process.argv.slice(2);

  if (args.length > 0) {
    // Si se pasa un argumento, se evalúa el archivo fuente directamente
    runFile(args[0]);
  } else {
    // Si no hay argumentos, se inicia el REPL interactivo
    startRepl();
  }
}

main();