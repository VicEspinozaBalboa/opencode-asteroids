---
description: Crea un git worktree en .worktree/<nombre> a partir del argumento
agent: build
---

Recibirás este texto como nombre base del worktree:

"$ARGUMENTS"

1. Normaliza ese texto a **kebab-case**: minúsculas, cada espacio o símbolo no
   alfanumérico se convierte en un único guion; recorta guiones sobrantes.
   Ejemplo: "Fix Login Bug" -> `fix-login-bug`.
2. Si el texto está vacío o no produce un nombre válido, detente y avísalo.
   No inventes un nombre.
3. Ejecuta **únicamente** este comando con el nombre obtenido:
   `git worktree add .worktree/<nombre>`
4. Si los argumentos son muy largos, simplificalos a un nombre significativo

No cambies de directorio. No ejecutes ningún otro comando. No hagas ninguna
acción adicional (no commits, no editar archivos, no `.gitignore`). No pidas
confirmación: solo ejecuta ese comando y reporta el resultado.
