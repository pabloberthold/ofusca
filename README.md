# Ofusca — Enmascarador de contenido

**Ofusca** es una herramienta web del lado del cliente para enmascarar y transformar contenido sensible mediante reglas de reemplazo. Ideal para ofuscar IPs, dominios, tokens, usuarios y cualquier patrón en textos o archivos antes de compartirlos.

## Características

- **Dos modos de entrada**: texto libre o carga de archivos (con arrastrar y soltar)
- **Reglas de transformación**: literales o expresiones regulares, con opción _case-sensitive_
- **Toggle on/off**: activá o desactivá reglas individualmente sin borrarlas
- **Reordenamiento drag & drop**: cambiá el orden de aplicación de las reglas arrastrándolas
- **Validación de regex**: feedback visual inmediato si un patrón es inválido
- **Perfiles**: guardá, cargá, importá y exportá conjuntos de reglas reutilizables como JSON
- **Transformación inversa**: aplicá las reglas al revés para revertir el ofuscamiento
- **Estadísticas en vivo**: reemplazos realizados, reglas usadas y tiempo de ejecución
- **Modo oscuro/claro**: con persistencia en localStorage
- **Exportación**: copiado con un clic o descarga directa del archivo transformado
- **PWA**: instalable como aplicación y usable sin conexión
- **100% cliente**: no hay servidor ni envío de datos — todo corre en el navegador

## Uso

1. Abrí `index.html` en cualquier navegador moderno (o visitá [la página en GitHub Pages](https://pabloberthold.github.io/ofusca/))
2. Escribí o pegá el texto (o arrastrá un archivo)
3. Agregá reglas de transformación (literal o regex) en el panel lateral
4. Hacé clic en **▶** (`Ctrl+Enter`) para transformar
5. Usá **◀** (`Ctrl+Shift+Enter`) para revertir

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
