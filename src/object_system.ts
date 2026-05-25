/* =============================================================================
# object_system.py — Sistema de Objetos en Tiempo de Ejecución
#
# Cuando el Evaluador recorre el AST, cada expresión produce un "Object".
# Este módulo define todos los tipos de valores que el lenguaje puede manejar
# en tiempo de ejecución (runtime):
#
#   Integer     → 42, -7, 0
#   Float       → 3.14, -0.5
#   Boolean     → true, false
#   String      → "hola mundo"
#   Null        → ausencia de valor
#   ReturnValue → envuelve un valor para propagar un 'return'
#   Error       → encapsula un mensaje de error de ejecución
#   Function    → una función con parámetros, cuerpo y entorno de cierre
#
# Todos los objetos del lenguaje heredan de la clase abstracta `Object`.
 ============================================================================= */

import { Identifier, BlockStatement } from "./ast";
import { Environment } from "./environment";


export type ObjectType = string;

export const ObjectTypes = {
  INTEGER: "INTEGER",
  FLOAT: "FLOAT",
  BOOLEAN: "BOOLEAN",
  STRING: "STRING",
  NULL: "NULL",
  RETURN_VALUE: "RETURN_VALUE",
  ERROR: "ERROR",
  FUNCTION: "FUNCTION",
  BUILTIN: "BUILTIN",
  BREAK: "BREAK",
  CONTINUE: "CONTINUE",
};

// Interfaz base para todos los objetos en tiempo de ejecución
export interface RuntimeObject {
  type(): ObjectType; //Retorna el tipo del objeto (ej. "INTEGER", "FUNCTION", etc.)
  inspect(): string; //Retorna una representación legible del valor (ej. "42", "function(x) { ... }")
}

// Tipo para funciones nativas (built-in) que pueden ser llamadas desde el lenguaje
export type BuiltinFunction = (...args: RuntimeObject[]) => RuntimeObject;


// ─── TIPOS PRIMITIVOS Y LITERALES ────────────────────────────────────────────
export class IntegerObject implements RuntimeObject {
  constructor(public value: number) {}
  type(): ObjectType { return ObjectTypes.INTEGER; }
  inspect(): string { return this.value.toString(); }
}

export class FloatObject implements RuntimeObject {
  constructor(public value: number) {}
  type(): ObjectType { return ObjectTypes.FLOAT; }
  
  inspect(): string {
    let formatted = Number(this.value.toPrecision(6)).toString();
    
    // Si no tiene punto decimal ni exponente, forzamos el '.0' para distinguirlo de un entero
    if (!formatted.includes(".") && !formatted.includes("e")) {
      formatted += ".0";
    }
    return formatted;
  }
}

export class StringObject implements RuntimeObject {
  constructor(public value: string) {}
  type(): ObjectType { return ObjectTypes.STRING; }
  inspect(): string { return this.value; }
}

export class BooleanObject implements RuntimeObject {
  constructor(public value: boolean) {}
  type(): ObjectType { return ObjectTypes.BOOLEAN; }
  inspect(): string { return this.value ? "true" : "false"; }
}

/*
    Representa la ausencia de valor (null).

    El evaluador retorna este objeto cuando una expresión no produce valor,
    por ejemplo un if sin else cuya condición es falsa.
*/
export class NullObject implements RuntimeObject {
  type(): ObjectType { return ObjectTypes.NULL; }
  inspect(): string { return "null"; }
}

// ─── SEÑALES DE CONTROL Y ERRORES ───────────────────────────────────────────

/*Señal de control para propagar un `return` a través del call stack.
Envuelve el valor real que se retorna. El evaluador lo desenvuelve
al salir de la función.
 */
export class ReturnValueObject implements RuntimeObject {
  constructor(public value: RuntimeObject) {}
  type(): ObjectType { return ObjectTypes.RETURN_VALUE; }
  inspect(): string { return this.value.inspect(); }
}

/*
    Representa un error en tiempo de ejecución.

    El evaluador propaga el error hacia arriba del call stack hasta que
    alguien lo maneje, de forma similar a como ReturnValue propaga return.*/
export class ErrorObject implements RuntimeObject {
  constructor(public message: string) {}
  type(): ObjectType { return ObjectTypes.ERROR; }
  inspect(): string { return `ERROR: ${this.message}`; }
}

/* 
Señal de control interna para propagar un `break` desde el cuerpo
de un bucle hasta el manejador de while/for.

No es un valor visible para el usuario.
    */
export class BreakSignalObject implements RuntimeObject {
  type(): ObjectType { return ObjectTypes.BREAK; }
  inspect(): string { return "break"; }
}


/*
Señal de control interna para propagar un `continue` desde el cuerpo
de un bucle hasta el manejador de while/for.

No es un valor visible para el usuario.
*/
export class ContinueSignalObject implements RuntimeObject {
  type(): ObjectType { return ObjectTypes.CONTINUE; }
  inspect(): string { return "continue"; }
}

// ─── FUNCIONES Y CLAUSURAS ───────────────────────────────────────────────────

/*
    Objeto función (closure) del lenguaje.

    Guarda los parámetros, el cuerpo y el entorno léxico en el que
    fue definida. Esto permite funciones de primera clase y closures.
*/
export class FunctionObject implements RuntimeObject {
  constructor(
    public parameters: Identifier[], //Lista de parámetros (identificadores)
    public body: BlockStatement, // El bloque de código que se ejecuta al llamar la función
    public env: Environment, // El entorno léxico donde se definió la función (para closures)
    public name: string = "" // Nombre opcional para funciones nombradas (útil para debugging)
  ) {}
  type(): ObjectType { return ObjectTypes.FUNCTION; }
  inspect(): string {
    const params = this.parameters.map(p => p.value).join(", ");
    const nameStr = this.name ? ` ${this.name}` : "";
    return `function${nameStr}(${params}) { ... }`;
  }
}

export class BuiltinObject implements RuntimeObject {
  constructor(public fn: BuiltinFunction) {}
  type(): ObjectType { return ObjectTypes.BUILTIN; }
  inspect(): string { return "builtin function"; }
}

// ─── INSTANCIAS SINGLETON GLOBALES (Ahorro de Memoria) ───────────────────────

export const TRUE = new BooleanObject(true);
export const FALSE = new BooleanObject(false);
export const NULL = new NullObject();
export const BREAK = new BreakSignalObject();
export const CONTINUE = new ContinueSignalObject();