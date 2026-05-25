// =============================================================================
//  src/environment.ts  –  Entorno de Variables (Memoria del Intérprete)
//
// El Environment (entorno) es la estructura que almacena los valores de las
// variables durante la ejecución del programa. Funciona como una tabla de
// símbolos dinámica.
//
// Soporte de SCOPES (alcances):
//    Cada vez que se llama a una función se crea un entorno nuevo ("inner")
//    que apunta al entorno en el que se definió la función ("outer").
//    Al buscar una variable, primero se busca en el entorno actual; si no se
//    encuentra, se busca recursivamente en el entorno externo.
//
//    Esto implementa el alcance léxico (lexical scoping / closures).
//
// Ejemplo:
//    global_env  →  { x: 10 }
//    func_env    →  { y: 5, __outer__: global_env }
//    Dentro de func_env: get('x') → 10  (encontrado en global_env)
// =============================================================================

import { RuntimeObject, BuiltinObject, NULL } from "./object_system";

export class Environment {
  // Tabla de símbolos: nombre de variable → objeto del lenguaje
  private store = new Map<string, RuntimeObject>();

  // Conjunto para realizar un seguimiento de cuáles identificadores son inmutables
  private constants = new Set<string>();

  // Referencia al entorno externo (null si es el entorno global)
  public outer: Environment | null;

  /**
   * Entorno de ejecución: almacena el binding nombre → valor.
   * * Parámetro `outer`:
   * Si se proporciona, este entorno es un entorno hijo (scope anidado).
   * Las búsquedas que fallen en este entorno se delegan al outer.
   */
  constructor(outer: Environment | null = null) {
    this.outer = outer;
  }

  // ─── Lectura ──────────────────────────────────────────────────────────────

  /**
   * Busca el valor de una variable por nombre.
   * * Primero busca en este entorno; si no lo encuentra y tiene un entorno
   * externo (outer), delega la búsqueda hacia afuera (lexical scoping).
   * * Retorna null si la variable no existe en ningún entorno de la cadena.
   */
  public get(name: string): RuntimeObject | null {
    if (this.store.has(name)) {
      return this.store.get(name)!;
    }
    if (this.outer !== null) {
      return this.outer.get(name);
    }
    return null;
  }

  // ─── Escritura ────────────────────────────────────────────────────────────
  
    /**
     * DECLARACIÓN: Registra una nueva variable estrictamente en el entorno actual.
     * Debe ser usado por 'LetStatement'.
     */
  public define(name: string, value: RuntimeObject): RuntimeObject {
      this.store.set(name, value);
      return value;
    }

  /**
   * MUTACIÓN: Actualiza una variable existente en el scope donde fue declarada originalmente.
   * Si no existe en ningún nivel, devuelve false o maneja el error (la asignación pura fallará).
   */
  public set(name: string, value: RuntimeObject): boolean {
    // 1. Si la variable pertenece a este scope, la actualizamos
    if (this.store.has(name)) {
      this.store.set(name, value);
      return true;
    }

    // 2. Si no, escalamos recursivamente al scope superior
    if (this.outer !== null) {
      return this.outer.set(name, value);
    }

    // 3. No se encontró la variable en ningún scope para ser mutada
    return false;
  }
  /**
   * Define una constante inmutable en el entorno actual.
   * Si se intenta reasignar en etapas posteriores, el evaluador arrojará un error.
   */
  public setConstant(name: string, value: RuntimeObject): RuntimeObject {
    this.constants.add(name);
    this.store.set(name, value);
    return value;
  }

  /**
   * Verifica si un nombre específico fue registrado como constante en este scope.
   */
  public isConstant(name: string): boolean {
    if (this.constants.has(name)) {
      return true;
    }
    if (this.outer !== null) {
      return this.outer.isConstant(name);
    }
    return false;
  }

  // ─── Representación (debug) ───────────────────────────────────────────────

  public inspect(): string {
    const items: string[] = [];
    this.store.forEach((value, key) => {
      items.push(`${key}=${value.inspect()}`);
    });
    return `Environment({${items.join(", ")}})`;
  }

  // ─── Métodos de Fábrica Estáticos ─────────────────────────────────────────

  /**
   * Genera el Entorno Global base inyectando las funciones Built-in nativas.
   */
  public static createGlobalEnvironment(): Environment {
    const env = new Environment();

    // REGISTRO DE PRINT()
    env.define("print", new BuiltinObject((...args: RuntimeObject[]): RuntimeObject => {
      const output = args.map(arg => arg.inspect()).join(" ");
      console.log(output);
      return NULL;
    }));

    return env;
  }
}

/**
 * Crea un nuevo entorno hijo que hereda del entorno dado.
 * * Usar al entrar a la ejecución de una función para crear un scope
 * aislado que aun tiene acceso al entorno léxico exterior.
 */
export function newEnclosedEnvironment(outer: Environment): Environment {
  return new Environment(outer);
}