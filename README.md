# 📅 Recordatorio de Clases

Este proyecto es una aplicación web para gestionar y recordar clases. Permite agregar, editar y eliminar clases, enviar recordatorios a WhatsApp con enlaces de acceso y frases inspiradoras sobre educación.

---

## 🛠️ Requisitos Previos

Antes de ejecutar este proyecto, asegúrate de tener instalado lo siguiente:

- [Node.js](https://nodejs.org/) (versión recomendada: 18+)
- [SQLite3](https://www.sqlite.org/download.html) (ya incluido en el proyecto, pero puedes instalar herramientas adicionales como SQLite Browser)
- [Git](https://git-scm.com/)
- Un editor de código como [VS Code](https://code.visualstudio.com/)

---

## 🚀 Instalación y Configuración

### 1️⃣ Clonar el repositorio

Abre la terminal y ejecuta:

```sh
git clone https://github.com/tu-usuario/recordatorio-clases.git
cd recordatorio-clases
```

---

## 🛠️ Configuración del Backend

1. **Acceder al directorio del backend**:
   ```sh
   cd backend
   ```

2. **Instalar dependencias**:
   ```sh
   npm install
   ```

3. **Configurar las variables de entorno**:

   Crea un archivo `.env` en la carpeta `backend` con el siguiente contenido:

   ```
   PORT=5000
   ```

4. **Ejecutar el backend**:
   ```sh
   node server.js
   ```
   Si prefieres que el servidor se reinicie automáticamente al hacer cambios, usa:
   ```sh
   npm install -g nodemon
   nodemon server.js
   ```

5. **Verifica que el servidor está funcionando**:
   Abre en tu navegador:
   ```
   http://localhost:5000
   ```
   Si todo está bien, verás el mensaje: `Servidor corriendo en http://localhost:5000`

---

## 🎨 Configuración del Frontend

1. **Acceder al directorio del frontend**:
   ```sh
   cd ../frontend
   ```

2. **Instalar dependencias**:
   ```sh
   npm install
   ```

3. **Configurar la conexión con el backend**:

   Abre el archivo `src/config.js` y asegúrate de que la URL del backend es correcta:

   ```js
   export const API_URL = "http://localhost:5000";
   ```

4. **Ejecutar el frontend**:
   ```sh
   npm run dev
   ```

5. **Abrir la aplicación en el navegador**:

   Normalmente, Vite ejecutará el frontend en:
   ```
   http://localhost:5173
   ```

---

## 🔗 API Endpoints

El backend expone los siguientes endpoints:

### 📉 Clases

- `GET /clases/:year/:month` → Obtiene todas las clases de un mes.
- `GET /clases/dia/:fecha` → Obtiene las clases de un día específico.
- `POST /clases` → Agrega una nueva clase.
- `PUT /clases/:id` → Edita una clase existente.
- `DELETE /clases/:id` → Elimina una clase.

### ✨ Frases Inspiradoras

- `GET /frase` → Obtiene una frase inspiradora en español sobre educación.

---

## 🛠️ Solución de Errores Comunes

1️⃣ **Error "MODULE_NOT_FOUND" al ejecutar el backend**  
   📝 Solución:
   ```sh
   npm install
   ```

2️⃣ **Error CORS en el navegador al hacer solicitudes al backend**  
   📝 Solución:  
   Asegúrate de que el backend tiene habilitado `cors` en `server.js`:
   ```js
   const cors = require("cors");
   app.use(cors());
   ```

3️⃣ **El frontend no conecta con el backend**  
   📝 Solución:
   - Verifica que `API_URL` en `src/config.js` apunta a `http://localhost:5000`.
   - Asegúrate de que el backend está corriendo (`node server.js`).

4️⃣ **Problema con frases en inglés en lugar de español**  
   📝 Solución:  
   - Revisa el endpoint de frases y asegúrate de que usa una API con frases en español.
   - Si necesitas cambiar el tema de las frases (por ejemplo, a frases de éxito), revisa la API usada en `server.js`.

---

## 🐝 Licencia

Puedes usarlo y modificarlo libremente.

---

Puto el que lo lea.

