# PO Assistant

Un MVP orientado a producción para Product Owners que utilizan Trello con clientes y Jira internamente. Esta herramienta cierra la brecha entre los tableros orientados al cliente y los flujos de trabajo de desarrollo internos.

## Funcionalidades Clave

### 📊 Dashboard
- Obtenga una visión general de alto nivel del estado de su espacio de trabajo.
- Monitoree la salud de las integraciones de Trello y Jira de un vistazo.

### 📋 Gestión de Tableros
- Liste todos sus tableros de Trello.
- Marque tableros de uso frecuente como **Favoritos** para un acceso rápido.
- Configure reglas de automatización específicas para cada tablero.

### 🔄 Sincronización Trello a Jira
- Seleccione un tablero y una lista de Trello para sincronizar.
- **Vista Previa de Sincronización**: Vea las tarjetas elegibles para sincronización antes de ejecutar el proceso.
- **Filtrado Inteligente**: Identifica automáticamente las tarjetas que ya están sincronizadas o aquellas que pertenecen a flujos de trabajo específicos (como Sprints).
- **Creación Automatizada de Incidencias**: Cree incidencias en Jira (Stories, Tasks, etc.) directamente desde las tarjetas de Trello.

### 🔔 Alertas Inteligentes y Notificaciones
- **Feed en Vivo**: Manténgase actualizado con menciones y actividad de Trello y Jira.
- **Interacción Directa**: Responda comentarios de Trello directamente desde la aplicación.
- **Adjuntos**: Soporte para enviar respuestas con texto e imágenes adjuntas.
- **Actividad de Jira**: Feed dedicado para alertas y actualizaciones específicas de Jira.

### ⚙️ Configuración Segura
- **Encriptación Local**: Todas las credenciales de API de Trello y Jira se almacenan localmente utilizando encriptación AES-256.
- **Estado de Configuración**: Verifique fácilmente si sus integraciones están configuradas correctamente.

### 🎨 Experiencia de Usuario
- **Multi-idioma**: Soporte completo para inglés y español.
- **Modo Oscuro/Claro**: Interfaz optimizada para cualquier condición de iluminación.
- **Logs de Acciones**: Historial detallado de las operaciones realizadas dentro de la aplicación.

## Lo que funciona ahora

- Almacenamiento seguro de credenciales.
- Obtención de tableros, listas y tarjetas de Trello.
- Selección de objetivos de automatización (proyecto de Jira y tipo de incidencia) por tablero de Trello.
- Ejecución manual de automatizaciones de tablero.
- Feed de alertas en tiempo real con capacidad de respuesta.
- Cambio de idioma y tema.

## Configuración

1. Instale las dependencias:

   ```bash
   npm install
   npm --prefix server install
   npm --prefix client install
   ```

2. Configure el entorno:

   ```bash
   copy server\.env.example server\.env
   ```

   Actualice `CREDENTIAL_SECRET` con un valor aleatorio largo antes de almacenar credenciales reales.

3. Ejecute localmente:

   ```bash
   npm run dev
   ```

   Frontend: http://localhost:5173  
   Backend: http://localhost:4000

## Dónde ingresar las llaves de API

Abra la aplicación, vaya a **Configuración** (Settings) e ingrese:

- Trello API Key
- Trello Token
- Jira Base URL
- Jira Email
- Jira API Token

## Próximos Pasos

- Polling programado para sincronización en segundo plano.
- Mapeo de campos de Jira más rico (asignados, etiquetas, campos personalizados).
- Informes de rendimiento e historial de sincronización.
