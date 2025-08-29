# Outfit Builder MVP

Pequeña web estática para crear outfits con selector por partes (cabeza, torso con 2 capas, inferior, pies), guardar outfits en LocalStorage y obtener sugerencias de color basadas en la prenda base.

## Cómo usar
1. Abrir `index.html` localmente o desplegar en Vercel.
2. Usa las flechas para cambiar prendas por parte.
3. Haz clic en **Agregar prenda** para crear nuevas; marca los estilos (casual, formal, etc.).
4. Activa filtros de **Estilos** para que las sugerencias respeten esas etiquetas.
5. **Guardar outfit** crea una entrada en la lista y puedes **Cargar** luego.

## Deploy en Vercel + GitHub
- Crea un repo en GitHub y sube estos archivos.
- En Vercel, *Add New Project* → selecciona el repo → framework: **Other** (estático).
- No requiere build ni configuración extra.

## Estructura
- `index.html`: interfaz y modales.
- `style.css`: estilos.
- `app.js`: lógica (datos, sugerencias, persistencia).

## Licencia
MIT
