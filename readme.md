# ZmarterBoard

Zmartboard es un scrapper para sincronizar de tareas de Zmartboard a Notion.

Fue creado para trabajar con la información de Zmartboard de una mejor manera,
dado que Zmartboard no tiene buen UI/UX y no tiene formas de filtrar
u obtener estadísticas personalizadas.

Al scrappear la información (guardándola en SQLite) y usar Notion se aprovecha de:

- Tener maneras de filtrar y obtener estadísticas personalizadas con SQL
- Crear vistas personalizadas con Notion
- Poder usar un UI/UX decente para trabajar con la información

Luego de la primera carga, **actualizar los datos toma menos de 1 segundo** ⚡

## Instalación

### Obtención de datos

Se necesitan crear 3 variables de entorno para poder obtener los datos:

- `zmartboard_token`: token en la request
- `zmartboard_email`: tu mail
- `zmartboard_client`: id del cliente

Esas variables se pueden obtener al inspeccionar la consulta que se hace
a Zmartboard, en el panel de Network del navegador.

### Notion

Para Notion, se necesita crear una base de datos y una integración.

La [sección de _getting started_ de la documentación de Notion](https://developers.notion.com/docs/getting-started)
cubre como obtener `notion_key` y `notion_database_id` para poder usar la API.

La creación de columnas es automática, pero las vistas deberán ser creadas manualmente.

## Uso

> **Nota**: funcionamiento bien preliminar

Una vez clonado el repositorio, se puede instalar esta librería con:

```bash
pnpm install -g ./zmartboard
```

Puede ser que sea necesario instalar `ts-node` globalmente:

```bash
pnpm install -g ts-node
```

Una vez hecho eso, se puede correr el script con:

```bash
zmarterboard all
```

Usa `zmarterboard --help` para ver los comandos disponibles.

## Por hacer

- Guardar más datos, como tags y registro de horas trabajadas
- Guías para hacer las vistas
