# Ofusca — Enmascarador de contenido

**Ofusca** es una herramienta web del lado del cliente para enmascarar y transformar contenido sensible mediante reglas de reemplazo. Ideal para ofuscar IPs, dominios, tokens, usuarios y cualquier patrón en textos o archivos antes de compartirlos.

## Características

- **Dos modos de entrada**: texto libre o carga de archivos (individual o batch)
- **Reglas de transformación**: literales o expresiones regulares, con opción _case-sensitive_
- **Toggle on/off**: activá o desactivá reglas individualmente sin borrarlas
- **Reordenamiento drag & drop**: cambiá el orden de aplicación de las reglas arrastrándolas
- **Búsqueda en reglas**: filtrá reglas por texto mientras escribís
- **Undo / Redo**: deshacé y rehacé cambios en las reglas (`Ctrl+Z` / `Ctrl+Shift+Z`)
- **Validación de regex**: feedback visual inmediato si un patrón es inválido
- **Perfiles**: guardá, cargá, importá y exportá conjuntos de reglas reutilizables como JSON
- **Transformación inversa**: aplicá las reglas al revés para revertir el ofuscamiento
- **Diff visual**: compará entrada y salida línea por línea con colores y numeración independiente
- **Flash highlight**: al transformar, las palabras cambiadas se resaltan temporalmente en amarillo (dark) o verde (light)
- **Compartí reglas por URL**: las reglas se codifican en el hash de la URL — copiá el enlace y compartilo
- **Exportar reglas como texto**: copiá las reglas al portapapeles en formato legible
- **Procesamiento batch**: seleccioná múltiples archivos y transformalos todos de una
- **Estadísticas en vivo**: reemplazos realizados, reglas usadas y tiempo de ejecución
- **Modo oscuro/claro**: detecta automáticamente la preferencia del sistema, con persistencia manual
- **Exportación**: copiado con un clic, descarga individual o batch
- **PWA**: instalable como aplicación y usable sin conexión
- **100% cliente**: no hay servidor ni envío de datos — todo corre en el navegador

## Uso

1. Abrí `index.html` en cualquier navegador moderno (o visitá [la página en GitHub Pages](https://pabloberthold.github.io/ofusca/))
2. Escribí o pegá el texto (o arrastrá uno o más archivos)
3. Agregá reglas de transformación (literal o regex) en el panel lateral
4. Hacé clic en **▶** (`Ctrl+Enter`) para transformar
5. Usá **◀** (`Ctrl+Shift+Enter`) para revertir
6. Cambiá entre vista **Diff** y **Resultado** para ver qué cambió

### Atajos de teclado

| Atajo | Acción |
|-------|--------|
| `Ctrl+Enter` | Transformar texto |
| `Ctrl+Shift+Enter` | Transformación inversa |
| `Ctrl+Z` | Deshacer cambios en reglas |
| `Ctrl+Shift+Z` | Rehacer cambios en reglas |

## Reglas por defecto

Al iniciar, se cargan dos reglas de ejemplo:

| Tipo    | De               | A                  |
|---------|------------------|--------------------|
| literal | `dominio.com`    | `localhost.local`  |
| regex   | `10\\.1\\.`      | `192.168.`         |

Podés modificarlas, eliminarlas o agregar las tuyas.

## Tecnologías

- HTML / CSS / JavaScript vanilla
- Sin dependencias externas
- Diseño responsive
- PWA con service worker

## Licencia

MIT
