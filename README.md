# RPS Interpreter — Intérprete Arborescente (AST) en TypeScript

Proyecto avanzado desarrollado para el curso **Lenguajes y Compiladores**. 

RPS es un lenguaje de programación de tipado dinámico, ámbito léxico puro (*lexical scoping*) y soporte de primera clase para funciones complejas, clausuras (*closures*), algoritmos recursivos avanzados y estructuras de control iterativas estrictas.

---

## 📁 Estructura del Proyecto Actualizada


```

RPS/
├── src/
│   ├── ast.ts             # Nodos de las estructuras del Árbol de Sintaxis Abstracta
│   ├── tokens.ts           # Definiciones de tipos de componentes léxicos (Tokens)
│   ├── lexer.ts           # Analizador Léxico (Escaneo de caracteres)
│   ├── parser.ts          # Analizador Sintáctico descendente de precedencia (Pratt Parser)
│   ├── object_system.ts   # Sistema de tipos en tiempo de ejecución (Runtime Objects)
│   ├── environment.ts     # Memoria dinámica del sistema, Scopes y Clústeres de Contexto
│   ├── evaluator.ts       # Evaluador (Caminante del AST / AST Walker)
│   ├── repl.ts            # Consola interactiva multiplataforma de doble modo (:ast / :eval)
|   ├── astVisualizer.ts   # Visualizador del AST.
│   └── index.ts           # Punto de entrada y cargador de scripts por archivo
├── tests/
│   ├── test_parser.ts     # Pruebas unitarias para la validación de la gramática
│   └── test_evaluator.ts  # Pruebas unitarias de ejecución de lógica del runtime
│   └── test_lexer.ts      # Pruebas unitarias de ejecución de análisis léxico e identificación de tokens
├── tsconfig.json
├── package.json
├── euclides.rps           # Script con el algoritmo de euclides como prueba
└── final.rps              # Script con la suite completa de pruebas de estrés

```

---

## 🚀 Instalación y Ejecución

### 1. Instalar dependencias
Asegúrate de contar con Node.js instalado. Luego ejecuta:
```bash
npm install

```

### 2. Ejecutar la Consola Interactiva (REPL)

Para iniciar directamente en el entorno interactivo sin compilar manualmente a JavaScript:

```bash
npm run dev

```

### 3. Ejecutar un archivo fuente (`.rps`)

Puedes pasar un archivo de código fuente como argumento para evaluar scripts independientes directamente en el runtime:

```bash
npm run dev final.rps

```

---

## 🖥️ La Consola de Comandos (REPL) Bimodo

La consola posee características avanzadas de depuración divididas en dos modos principales de entorno:

| Comando | Acción del Entorno |
| --- | --- |
| `:ast` | **Modo Visualizador:** Imprime de manera arborescente el árbol sintáctico estructurado generado por el Pratt Parser. Ideal para validar la precedencia de operadores. |
| `:eval` | **Modo Evaluador:** Activa el motor runtime. Ejecuta las expresiones guardando y mutando el estado de la memoria (`Environment`). |
| `:tokens <codigo>` | **Utilidad rápida:** Desglosa e imprime el mapeo de tokens generados instantáneamente por el Lexer. |
| `:clear` | Limpia los registros de la pantalla de la consola. |
| `:q` o `exit` | Cierra y finaliza la sesión del intérprete RPS. |

---

## 💎 Características Principales del Motor

### 1. Sistema de Tipos en Tiempo de Ejecución (`object_system.ts`)

Cada reducción en el AST produce un `RuntimeObject`. El intérprete gestiona primitivas numéricas y flujos de control integrados:

* **Primitivas:** `Integer`, `Float` (con formateo exacto de precisión a 6 dígitos), `Boolean` y `String`.
* **Clausuras:** Funciones que encapsulan los parámetros, el cuerpo sintáctico y el `Environment` donde fueron creadas de forma léxica.
* **Señales de Control:** Objetos internos transparentes para el usuario que propagan saltos (`ReturnValue`, `BreakSignal`, `ContinueSignal`).

### 2. Memoria Dinámica con Alcance Léxico Estricto (`environment.ts`)

El entorno opera bajo una cadena jerárquica de tablas de símbolos (`outer` / `inner` scopes).

* **`define(name, value)`**: Registra nuevos enlaces de variables en el scope local actual (Ej: al evaluar un `LetStatement`).
* **`set(name, value)`**: Busca recursivamente la variable a través de la cadena de entornos para mutar su valor original, protegiendo las variables globales de re-declaraciones locales accidentales.

### 3. Detección Temprana de Errores de Sintaxis en Ciclos (`parser.ts`)

El parser contiene reglas de negocio restrictivas incorporadas. Por ejemplo, en los bucles `for`, se interceptan de manera agresiva las asignaciones y expresiones para lanzar excepciones personalizadas si un desarrollador intenta inyectar declaraciones `let` en las secciones de condición o de actualización (update), retornando árboles seguros libres de fallas semánticas silenciosas.

### 4. Funciones Nativas (Built-ins)

El entorno inyecta dinámicamente utilidades core como la función global `print`, la cual consume de manera interactiva cualquier `RuntimeObject` a través de su método nativo `.inspect()`.

---

## 🧪 Pruebas de Estrés Integradas (`final.rps`, `euclides.rps`)

Se incluyen dos pruebas con archivos externos.

### Evaluación Lógica Extrema y Unaria

Soporta cadenas masivas de operadores unarios con resolución recursiva de precedencia:

```javascript
let muchos_bangs = !!!!!!!!!!!!!false; // Evalúa a: true

```

### Clausuras (*Closures*)

```javascript
let crear_multiplicador = function(factor) {
    return function(x) { return x * factor; };
};
let triple = crear_multiplicador(3);
print(triple(7)); // Imprime: 21

```

### Algoritmo de Euclides (Recursión y Residuo `%`)

```javascript
let mcd = function(a, b) {
    if (b == 0) {
        return a;
    }
    return mcd(b, a % b);
};
print(mcd(48, 18)); // Imprime: 6

```

---

## 🛠️ Tecnologías Utilizadas

* **Lenguaje base:** TypeScript 5.x
* **Motor de Ejecución:** Node.js
* **Compilación y Pruebas en Caliente:** `ts-node`

```

