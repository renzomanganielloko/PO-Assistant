# PO Assistant - Known Online Edition

PO Assistant es una plataforma integral diseñada para optimizar el flujo de trabajo de los Product Owners de Known Online. Facilita la sincronización inteligente entre Trello y Jira, la gestión de alertas en tiempo real y la automatización mediante IA, todo bajo una arquitectura multi-usuario segura.

## 🚀 Funcionalidades Principales

### 1. Sistema Multi-Usuario & Roles
- **Autenticación Segura:** Sistema de login con JWT y contraseñas encriptadas con bcrypt.
- **Roles Diferenciados:**
  - **Admin:** Control total del sistema, gestión de usuarios (crear, pausar, eliminar) y configuración de credenciales globales.
  - **PO (User):** Acceso a herramientas de trabajo y sincronización sin necesidad de configurar APIs técnicas.
- **Aislamiento de Datos:** Cada usuario gestiona sus propios tableros favoritos y configuraciones personales.

### 2. Trello-Jira Sync (Inteligente)
- **Sincronización Automática:** Convierte tarjetas de Trello en Issues de Jira con un solo clic.
- **Refinamiento con IA:** Integración con Google Gemini para mejorar descripciones, detectar criterios de aceptación y limpiar el lenguaje técnico antes de enviar a Jira.
- **Detección de Duplicados:** Evita crear tareas repetidas vinculando automáticamente las existentes.
- **Soporte de Adjuntos:** Sube imágenes y archivos directamente de Trello a Jira durante la sincronización.

### 3. Centro de Alertas Trello
- **Feed en Tiempo Real:** Monitoriza comentarios, movimientos de listas y creación de tarjetas en tableros favoritos.
- **Respuestas con Menciones:** Botón "Responder" que incluye automáticamente el `@arroba` del autor original para agilizar la comunicación.
- **Filtros Dinámicos:** Filtra alertas por tablero específico.

### 4. POsito - Asistente de Estado (IA)
- **Chatbot Integrado:** Asistente inteligente entrenado para responder consultas sobre el estado de los proyectos, tableros y flujos de trabajo de Known Online.

### 5. Gmail Insight (Beta)
- **Lectura de Correos:** Conexión con Gmail para listar y resumir hilos de correos relevantes para el PO usando IA.

---

## 🛠️ Stack Tecnológico

### Frontend (Client)
- **React 18** (Vite)
- **Lucide React** (Iconografía)
- **CSS3 Moderno** (Diseño basado en el manual de identidad de Known Online)
- **Contexto de Usuario:** Gestión de sesiones persistentes.

### Backend (Server)
- **Node.js & Express**
- **MongoDB Atlas** (Persistencia de datos)
- **Mongoose** (Modelado de datos)
- **JWT (JSON Web Tokens)** (Seguridad de API)
- **Integraciones:** Trello API, Jira API, Google Gemini API, Google OAuth 2.0.

---

## ⚙️ Configuración del Entorno

### Variables de Entorno (Backend `.env`)
```env
PORT=4000
MONGODB_URI=tu_url_de_atlas
JWT_SECRET=tu_frase_secreta_para_tokens
CREDENTIAL_SECRET=tu_contraseña_maestra_de_encriptacion
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
REDIRECT_URI=...
```

### Variables de Entorno (Frontend `.env`)
```env
VITE_API_BASE=https://tu-api-en-render.com/api
```

---

## 📦 Instalación y Despliegue

### Local
1. Instalar dependencias: `npm install` (en raíz, client y server).
2. Levantar ambos servicios: `npm run dev` desde la raíz.

### Producción
- **Frontend:** Recomendado desplegar en Netlify o Vercel apuntando a la carpeta `client`.
- **Backend:** Recomendado desplegar en Render.com apuntando a la carpeta `server`.

---

© 2026 Known Online. Todos los derechos reservados.
