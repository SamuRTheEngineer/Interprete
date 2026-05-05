# RPS Lexer — Analizador Léxico en TypeScript

Proyecto del curso **Lenguajes y Compiladores 2026**.

## 📁 Estructura del proyecto

```
RPS/
├── src/
│   ├── token.ts    # Tipos de tokens y estructura Token
│   ├── lexer.ts    # Analizador léxico
│   ├── repl.ts     # REPL interactivo
│   └── main.ts     # Punto de entrada
├── tsconfig.json
├── package.json
└── README.md
```

## 🚀 Instalación y ejecución

### 1. Instalar dependencias
```bash
npm install
```

### 2. Compilar TypeScript
```bash
npm run build
```

### 3. Ejecutar el REPL
```bash
npm start
```

### Alternativa (sin compilar, con ts-node)
```bash
npm run dev
```

## 🧪 Ejemplos de entrada en el REPL

```
RPS>> let x = 42;
RPS>> function suma(a, b) { return a + b; }
RPS>> if (x >= 10 && x != 20) { print("hola"); }
RPS>> let pi = 3.14;
RPS>> let msg = "Hola Mundo";
RPS>> x += 5;
RPS>> let flag = true;
```

## 🪙 Tokens soportados

| Categoría        | Ejemplos                             |
|------------------|--------------------------------------|
| Literales        | `42`, `3.14`, `"texto"`, `true`      |
| Palabras clave   | `let`, `const`, `function`, `if`, `while`, `return`, `print` |
| Identificadores  | `x`, `miVariable`, `_privado`        |
| Aritméticos      | `+` `-` `*` `/` `%` `**`            |
| Comparación      | `==` `!=` `<` `>` `<=` `>=`         |
| Lógicos          | `&&` `\|\|` `!`                      |
| Asignación       | `=` `+=` `-=`                        |
| Delimitadores    | `( ) { } [ ] ; : , .`               |

## 💬 Comandos del REPL

| Comando | Acción              |
|---------|---------------------|
| `:q`    | Salir               |
| `:h`    | Mostrar ayuda       |
| `:clear`| Limpiar pantalla    |