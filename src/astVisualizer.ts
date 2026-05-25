// =============================================================================
//  astVisualizer.ts  –  Generador de Árbol Sintáctico Gráfico
// =============================================================================

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

// Paleta de Colores ANSI
const C_RESET  = "\x1b[0m";
const C_NODE   = "\x1b[36m";   // Cian para los tipos de Nodos AST
const C_TREE   = "\x1b[90m";   // Gris oscuro para las ramas (├──, └──, │)
const C_LIT    = "\x1b[33m";   // Amarillo para valores primitivos/literales
const C_IDENT  = "\x1b[32m";   // Verde para Identificadores (nombres de variables/funciones)
const C_OP     = "\x1b[35m";   // Magenta para operadores

export function visualize(program: Program): string {
  let out = `${C_NODE}Program${C_RESET}\n`;
  const total = program.statements.length;
  
  for (let i = 0; i < total; i++) {
    const isLast = i === total - 1;
    out += formatStatement(program.statements[i], "", isLast);
  }
  
  return out.trimEnd();
}

function formatStatement(stmt: Statement, indent: string, isLast: boolean): string {
  const marker = isLast ? `${C_TREE}└── ${C_RESET}` : `${C_TREE}├── ${C_RESET}`;
  const nextIndent = indent + (isLast ? "    " : `${C_TREE}│   ${C_RESET}`);

  if (stmt instanceof LetStatement) {
    let out = `${indent}${marker}${C_NODE}LetStatement${C_RESET} (let)\n`;
    out += `${nextIndent}${C_TREE}├──${C_RESET} name: ${C_IDENT}${stmt.name.value}${C_RESET}\n`;
    out += `${nextIndent}${C_TREE}└──${C_RESET} value:\n${formatExpression(stmt.value, nextIndent + "    ", true)}`;
    return out;
  }

  if (stmt instanceof ConstStatement) {
    let out = `${indent}${marker}${C_NODE}ConstStatement${C_RESET} (const)\n`;
    out += `${nextIndent}${C_TREE}├──${C_RESET} name: ${C_IDENT}${stmt.name.value}${C_RESET}\n`;
    out += `${nextIndent}${C_TREE}└──${C_RESET} value:\n${formatExpression(stmt.value, nextIndent + "    ", true)}`;
    return out;
  }

  if (stmt instanceof ReturnStatement) {
    let out = `${indent}${marker}${C_NODE}ReturnStatement${C_RESET}\n`;
    if (stmt.returnValue) {
      out += formatExpression(stmt.returnValue, nextIndent, true);
    } else {
      out += `${nextIndent}${C_TREE}└── ${C_LIT}null${C_RESET}\n`;
    }
    return out;
  }

  if (stmt instanceof ExpressionStatement) {
    let out = `${indent}${marker}${C_NODE}ExpressionStatement${C_RESET}\n`;
    if (stmt.expression) {
      out += formatExpression(stmt.expression, nextIndent, true);
    }
    return out;
  }

  if (stmt instanceof WhileStatement) {
    let out = `${indent}${marker}${C_NODE}WhileStatement${C_RESET}\n`;
    out += `${nextIndent}${C_TREE}├──${C_RESET} condition:\n${formatExpression(stmt.condition, nextIndent + `${C_TREE}│   ${C_RESET}`, true)}`;
    out += `${nextIndent}${C_TREE}└──${C_RESET} body:\n${formatBlock(stmt.body, nextIndent, true)}`;
    return out;
  }

  if (stmt instanceof ForStatement) {
    let out = `${indent}${marker}${C_NODE}ForStatement${C_RESET}\n`;
    out += `${nextIndent}${C_TREE}├──${C_RESET} init: ${stmt.init ? "\n" + formatStatement(stmt.init, nextIndent + `${C_TREE}│   ${C_RESET}`, true).trimEnd() : `${C_LIT}null${C_RESET}`}\n`;
    out += `${nextIndent}${C_TREE}├──${C_RESET} condition: ${stmt.condition ? "\n" + formatExpression(stmt.condition, nextIndent + `${C_TREE}│   ${C_RESET}`, true).trimEnd() : `${C_LIT}null${C_RESET}`}\n`;
    out += `${nextIndent}${C_TREE}├──${C_RESET} update: ${stmt.update ? "\n" + formatExpression(stmt.update, nextIndent + `${C_TREE}│   ${C_RESET}`, true).trimEnd() : `${C_LIT}null${C_RESET}`}\n`;
    out += `${nextIndent}${C_TREE}└──${C_RESET} body:\n${formatBlock(stmt.body, nextIndent, true)}`;
    return out;
  }

  if (stmt instanceof BreakStatement) {
    return `${indent}${marker}${C_NODE}BreakStatement${C_RESET}\n`;
  }

  if (stmt instanceof ContinueStatement) {
    return `${indent}${marker}${C_NODE}ContinueStatement${C_RESET}\n`;
  }

  return `${indent}${marker}${C_NODE}UnknownStatement${C_RESET}\n`;
}

function formatExpression(expr: Expression | null, indent: string, isLast: boolean): string {
  if (!expr) return "";
  const marker = isLast ? `${C_TREE}└── ${C_RESET}` : `${C_TREE}├── ${C_RESET}`;
  const nextIndent = indent + (isLast ? "    " : `${C_TREE}│   ${C_RESET}`);

  if (expr instanceof Identifier) {
    return `${indent}${marker}${C_NODE}Identifier${C_RESET} ("${C_IDENT}${expr.value}${C_RESET}")\n`;
  }
  if (expr instanceof IntegerLiteral) {
    return `${indent}${marker}IntegerLiteral (${C_LIT}${expr.value}${C_RESET})\n`;
  }
  if (expr instanceof FloatLiteral) {
    return `${indent}${marker}FloatLiteral (${C_LIT}${expr.value}${C_RESET})\n`;
  }
  if (expr instanceof StringLiteral) {
    return `${indent}${marker}StringLiteral (${C_LIT}"${expr.value}"${C_RESET})\n`;
  }
  if (expr instanceof BooleanLiteral) {
    return `${indent}${marker}BooleanLiteral (${C_LIT}${expr.value}${C_RESET})\n`;
  }
  if (expr instanceof NullLiteral) {
    return `${indent}${marker}NullLiteral (${C_LIT}null${C_RESET})\n`;
  }

  if (expr instanceof PrefixExpression) {
    let out = `${indent}${marker}${C_NODE}PrefixExpression${C_RESET} ('${C_OP}${expr.operator}${C_RESET}')\n`;
    out += formatExpression(expr.right, nextIndent, true);
    return out;
  }

  if (expr instanceof InfixExpression) {
    let out = `${indent}${marker}${C_NODE}InfixExpression${C_RESET} ('${C_OP}${expr.operator}${C_RESET}')\n`;
    out += formatExpression(expr.left, nextIndent, false);
    out += formatExpression(expr.right, nextIndent, true);
    return out;
  }

  if (expr instanceof AssignExpression) {
    let out = `${indent}${marker}${C_NODE}AssignExpression${C_RESET} ('${C_OP}${expr.operator}${C_RESET}')\n`;
    out += `${nextIndent}${C_TREE}├──${C_RESET} target: ${C_IDENT}${expr.name.value}${C_RESET}\n`;
    out += `${nextIndent}${C_TREE}└──${C_RESET} value:\n${formatExpression(expr.value, nextIndent + "    ", true)}`;
    return out;
  }

  if (expr instanceof IfExpression) {
    let out = `${indent}${marker}${C_NODE}IfExpression${C_RESET}\n`;
    out += `${nextIndent}${C_TREE}├──${C_RESET} condition:\n${formatExpression(expr.condition, nextIndent + `${C_TREE}│   ${C_RESET}`, true)}`;
    out += `${nextIndent}${C_TREE}├──${C_RESET} consequence:\n${formatBlock(expr.consequence, nextIndent, expr.alternative === null)}`;
    if (expr.alternative) {
      out += `${nextIndent}${C_TREE}└──${C_RESET} alternative:\n${formatBlock(expr.alternative, nextIndent, true)}`;
    }
    return out;
  }

  if (expr instanceof FunctionLiteral) {
    const nameStr = expr.name ? ` [name: ${C_IDENT}${expr.name}${C_RESET}]` : "";
    let out = `${indent}${marker}${C_NODE}FunctionLiteral${C_RESET}${nameStr}\n`;
    const paramsStr = expr.parameters.map(p => `${C_IDENT}${p.value}${C_RESET}`).join(", ");
    out += `${nextIndent}${C_TREE}├──${C_RESET} params: (${paramsStr})\n`;
    out += `${nextIndent}${C_TREE}└──${C_RESET} body:\n${formatBlock(expr.body, nextIndent, true)}`;
    return out;
  }

  if (expr instanceof CallExpression) {
    let out = `${indent}${marker}${C_NODE}CallExpression${C_RESET}\n`;
    out += `${nextIndent}${C_TREE}├──${C_RESET} function:\n${formatExpression(expr.func, nextIndent + `${C_TREE}│   ${C_RESET}`, false)}`;
    out += `${nextIndent}${C_TREE}└──${C_RESET} arguments:\n`;
    const totalArgs = expr.args.length;
    if (totalArgs === 0) {
      out += `${nextIndent}    ${C_TREE}└──${C_RESET} (vacíos)\n`;
    } else {
      for (let i = 0; i < totalArgs; i++) {
        out += formatExpression(expr.args[i], nextIndent + "    ", i === totalArgs - 1);
      }
    }
    return out;
  }

  return `${indent}${marker}${C_NODE}UnknownExpression${C_RESET}\n`;
}

function formatBlock(block: BlockStatement, indent: string, isLast: boolean): string {
  const marker = isLast ? `${C_TREE}└── ${C_RESET}` : `${C_TREE}├── ${C_RESET}`;
  const nextIndent = indent + (isLast ? "    " : `${C_TREE}│   ${C_RESET}`);
  let out = `${indent}${marker}${C_NODE}BlockStatement${C_RESET}\n`;
  
  const total = block.statements.length;
  if (total === 0) {
    out += `${nextIndent}${C_TREE}└──${C_RESET} (vacía)\n`;
  } else {
    for (let i = 0; i < total; i++) {
      out += formatStatement(block.statements[i], nextIndent, i === total - 1);
    }
  }
  return out;
}