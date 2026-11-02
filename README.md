# ParkHub

ParkHub es una aplicación web para consultar espacios de estacionamiento y administrar reservaciones. Usa Node.js, Express, TypeScript, MongoDB, Mongoose y una interfaz en HTML, CSS y JavaScript sin framework.

Esta rama es el **starter de la Práctica Integradora 2**. Las funciones anteriores están completas; la extensión de una reservación es el trabajo de esta práctica.

## Requisitos

- Node.js y npm instalados.
- Docker Desktop o una instalación compatible de Docker con Compose, para iniciar MongoDB. También puedes usar un servidor MongoDB local existente.

Ejecuta todos los comandos desde la raíz del proyecto.

## Instalación y arranque

1. Instala las dependencias:

   ```bash
   npm install
   ```

2. Inicia MongoDB:

   ```bash
   docker compose up -d
   ```

3. Opcional: copia `.env.example` a `.env` si necesitas cambiar el puerto o la conexión a MongoDB. Sin `.env`, la aplicación usa los valores de la tabla de configuración más abajo.

4. Carga cinco espacios de ejemplo. Puedes volver a ejecutar este comando sin duplicarlos:

   ```bash
   npm run seed
   ```

5. Inicia el servidor de desarrollo:

   ```bash
   npm run dev
   ```

6. Abre <http://localhost:3000> en el navegador.

Para detener el servidor de desarrollo, usa `Ctrl+C` en su terminal. Para detener MongoDB sin borrar el volumen de datos, ejecuta `docker compose down`.

### Ejecución compilada

```bash
npm run build
npm start
```

`npm run build` genera `dist/`. El servidor sigue sirviendo la página desde `src/public`, así que ejecuta `npm start` desde la raíz del proyecto.

## Configuración

| Variable | Valor predeterminado | Uso |
| --- | --- | --- |
| `PORT` | `3000` | Puerto HTTP de ParkHub |
| `MONGODB_URI` | `mongodb://localhost:27017/parkhub` | Conexión a MongoDB |

Si usas un MongoDB existente, configúralo en `MONGODB_URI` y omite el paso de Docker.

## Comandos disponibles

| Comando | Función |
| --- | --- |
| `npm run dev` | Inicia el servidor con recarga durante el desarrollo |
| `npm run seed` | Inserta o actualiza los cinco espacios de ejemplo |
| `npm run build` | Compila TypeScript en `dist/` |
| `npm start` | Ejecuta la versión compilada |
| `npm test` | Ejecuta las pruebas Jest una vez |
| `npm run test:watch` | Repite las pruebas Jest al guardar cambios |

## API

La API usa JSON y está disponible en el mismo puerto que la página. Las horas enviadas al servidor deben ser cadenas ISO 8601 con zona horaria. La interfaz convierte las horas locales antes de enviarlas.

| Método | Ruta | Estado actual |
| --- | --- | --- |
| `GET` | `/api/spots` | Lista los espacios activos. Cada elemento incluye `id`, `number`, `zone`, `type`, `active` y `available`. `available` describe la disponibilidad en este momento. |
| `GET` | `/api/spots/:id` | Consulta un espacio. Devuelve `404` si no existe. |
| `GET` | `/api/reservations` | Lista las reservaciones, incluidas las canceladas, con el número del espacio asociado cuando existe. |
| `POST` | `/api/reservations` | Crea una reservación. Devuelve `201` al crearla, `400` por datos inválidos, `404` si el espacio no existe o `409` si no puede reservarse. |
| `PATCH` | `/api/reservations/:id/cancel` | Cancela una reservación. Devuelve la reservación actualizada o `404` si no existe. |
| `PATCH` | `/api/reservations/:id/extend` | **Pendiente en esta práctica.** La ruta está preparada y responde `501` hasta que se implemente. |

Para crear una reservación, primero consulta `GET /api/spots` y usa el `id` de uno de sus elementos:

```json
{
  "parkingSpotId": "ID_DEL_ESPACIO",
  "startTime": "FECHA_Y_HORA_ISO_DE_INICIO",
  "endTime": "FECHA_Y_HORA_ISO_DE_FIN"
}
```

Ejemplo de consulta rápida:

```bash
curl http://localhost:3000/api/spots
```

La API puede devolver `500` si ocurre un error inesperado. La disponibilidad de un espacio se calcula a partir de las reservaciones activas que abarcan el momento de la consulta. La agenda diaria de la página usa las reservaciones obtenidas de la API.

## Estructura del proyecto

```text
src/
  app.ts                         Configura Express y las rutas
  server.ts                      Conecta MongoDB e inicia HTTP
  seed.ts                        Carga espacios de ejemplo
  config/env.ts                  Lee la configuración
  features/parking-spots/        Modelo, servicio y rutas de espacios
  features/reservations/         Modelo, reglas, servicio y rutas de reservaciones
    __tests__/                   Pruebas Jest de funcionalidades anteriores
  public/                        Página, estilos y código del navegador
```

## Práctica Integradora 2

La historia de usuario se entrega por separado. Antes de programar, analízala, identifica las reglas y documenta tus casos de prueba. Después implementa la función, escribe tus propias pruebas Jest y registra los resultados de su ejecución.

Busca los comentarios `TODO PRACTICE 2` en las reglas, el servicio, la ruta y el código del navegador. Son puntos de trabajo, no respuestas. La suite completa de pruebas de extensión no está incluida en este starter.

Puedes documentar tus casos antes de escribir código con una tabla como esta, completándola con tus propios escenarios:

| ID | Comportamiento a verificar | Datos o preparación | Resultado esperado |
| --- | --- | --- | --- |
| | | | |

Al terminar, registra para cada caso el comando ejecutado, el resultado real y cualquier problema encontrado. Las pruebas existentes deben seguir pasando durante el trabajo.
