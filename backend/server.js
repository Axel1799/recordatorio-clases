require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');
const https = require('https'); // Agregamos https para ignorar certificados vencidos
const cron = require('node-cron');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Conectar a SQLite
const db = new sqlite3.Database('./database.sqlite', (err) => {
    if (err) {
        console.error('Error al conectar con la base de datos:', err.message);
    } else {
        console.log('Conectado a SQLite.');
    }
});

// Crear la tabla si no existe y añadir índices para optimizar búsquedas
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS clases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        horario TEXT NOT NULL,
        enlace TEXT NOT NULL,
        fecha_inicio TEXT NOT NULL,
        fecha_fin TEXT NOT NULL,
        dias_de_clase TEXT NOT NULL
    )`);

    // Índices para acelerar las consultas por fecha
    db.run(`CREATE INDEX IF NOT EXISTS idx_fecha_inicio ON clases (fecha_inicio)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_fecha_fin ON clases (fecha_fin)`);
});

// 🔹 Frases inspiradoras en español (respaldo local)
const frasesLocales = [
    { quote: "La educación es el arma más poderosa que puedes usar para cambiar el mundo.", author: "Nelson Mandela" },
    { quote: "El aprendizaje es un tesoro que seguirá a su dueño en todas partes.", author: "Proverbio chino" },
    { quote: "Dime y lo olvido, enséñame y lo recuerdo, involúcrame y lo aprendo.", author: "Benjamin Franklin" },
    { quote: "Educar la mente sin educar el corazón no es educar en absoluto.", author: "Aristóteles" },
    { quote: "El propósito de la educación es reemplazar una mente vacía con una mente abierta.", author: "Malcolm Forbes" }
];

// 📌 Endpoint para obtener una frase inspiradora en español
app.get("/frase", async (req, res) => {
    try {
        const agent = new (require("https").Agent)({ rejectUnauthorized: false });

        // 📌 API con frases enfocadas en educación
        const response = await axios.get("https://api.quotable.io/random?tags=inspirational", { httpsAgent: agent });

        if (response.data) {
            const originalQuote = response.data.content;
            const author = response.data.author;

            // 📌 Traducir la frase al español usando la API de LibreTranslate
            const translateResponse = await axios.post("https://translate.googleapis.com/translate_a/single", null, {
                params: {
                    client: "gtx",
                    sl: "en",
                    tl: "es",
                    dt: "t",
                    q: originalQuote
                },
                httpsAgent: agent // Se usa el agente para evitar errores SSL
            });

            // Extraer la frase traducida desde la respuesta de Google Translate
            const translatedQuote = translateResponse.data[0][0][0];

            res.json({
                quote: translatedQuote,
                author: author
            });
        } else {
            res.status(500).json({ error: "No se obtuvo una frase válida" });
        }
    } catch (error) {
        console.error("Error al obtener la frase inspiradora:", error.message);
        res.status(500).json({ error: "Error al obtener la frase inspiradora" });
    }
});

// Obtener los días que tienen clases en un mes específico para resaltar en el calendario
app.get('/clases/:year/:month/highlight', (req, res) => {
    const { year, month } = req.params;
    const firstDayOfMonth = `${year}-${month.padStart(2, '0')}-01`;
    const lastDayOfMonth = new Date(year, month, 0).toISOString().split('T')[0];

    const query = `
        SELECT fecha_inicio, fecha_fin, dias_de_clase FROM clases
        WHERE fecha_fin >= ? AND fecha_inicio <= ?
    `;

    db.all(query, [firstDayOfMonth, lastDayOfMonth], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        const datesToHighlight = new Set();
        const dayNames = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

        rows.forEach(clase => {
            try {
                const diasClase = JSON.parse(clase.dias_de_clase).map(d => d.toLowerCase());
                const startDate = new Date(clase.fecha_inicio + 'T00:00:00Z');
                const endDate = new Date(clase.fecha_fin + 'T00:00:00Z');

                for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                    if (d.getUTCFullYear() == year && d.getUTCMonth() == month - 1) {
                        const dayOfWeekName = dayNames[d.getUTCDay()];
                        if (diasClase.includes(dayOfWeekName)) {
                            datesToHighlight.add(d.toISOString().split('T')[0]);
                        }
                    }
                }
            } catch (e) {
                // Ignorar clases con formato de `dias_de_clase` inválido
            }
        });

        res.json(Array.from(datesToHighlight));
    });
});

// Obtener clases de un día específico (optimizado y corregido)
app.get('/clases/dia/:fecha', (req, res) => {
    const { fecha } = req.params;
    // Se usa T12:00:00 para evitar problemas de zona horaria al interpretar la fecha
    const diaSemana = new Date(fecha + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long' });

    // La consulta ahora es insensible a mayúsculas/minúsculas
    const sql = `
        SELECT * FROM clases 
        WHERE fecha_inicio <= ? 
          AND fecha_fin >= ? 
          AND LOWER(dias_de_clase) LIKE ?`;
    
    const params = [fecha, fecha, `%${diaSemana.toLowerCase()}%`];

    db.all(sql, params, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            // El filtro final también debe ser insensible a mayúsculas/minúsculas
            const clasesDelDia = rows.filter(clase => {
                try {
                    const diasClase = JSON.parse(clase.dias_de_clase).map(d => d.toLowerCase());
                    return Array.isArray(diasClase) && diasClase.includes(diaSemana.toLowerCase());
                } catch (e) {
                    return false; // Ignorar si el JSON es inválido
                }
            });
            res.json(clasesDelDia);
        }
    });
});

// Agregar una nueva clase
app.post('/clases', (req, res) => {
    const { nombre, horario, enlace, fecha_inicio, fecha_fin, dias_de_clase } = req.body;

    if (!nombre || !horario || !enlace || !fecha_inicio || !fecha_fin || !dias_de_clase) {
        return res.status(400).json({ error: "Todos los campos son obligatorios." });
    }

    if (!Array.isArray(dias_de_clase)) {
        return res.status(400).json({ error: "El campo dias_de_clase debe ser un array." });
    }

    db.run(
        "INSERT INTO clases (nombre, horario, enlace, fecha_inicio, fecha_fin, dias_de_clase) VALUES (?, ?, ?, ?, ?, ?)",
        [nombre, horario, enlace, fecha_inicio, fecha_fin, JSON.stringify(dias_de_clase)],
        function (err) {
            if (err) {
                res.status(500).json({ error: err.message });
            } else {
                res.json({ id: this.lastID });
            }
        }
    );
});

// Editar una clase existente
app.put('/clases/:id', (req, res) => {
    const { id } = req.params;
    const { nombre, horario, enlace, fecha_inicio, fecha_fin, dias_de_clase } = req.body;

    if (!nombre || !horario || !enlace || !fecha_inicio || !fecha_fin || !dias_de_clase) {
        return res.status(400).json({ error: "Todos los campos son obligatorios." });
    }

    const diasClaseStr = typeof dias_de_clase === "string" ? dias_de_clase : JSON.stringify(dias_de_clase);

    db.run(
        "UPDATE clases SET nombre = ?, horario = ?, enlace = ?, fecha_inicio = ?, fecha_fin = ?, dias_de_clase = ? WHERE id = ?",
        [nombre, horario, enlace, fecha_inicio, fecha_fin, diasClaseStr, id],
        function (err) {
            if (err) {
                res.status(500).json({ error: err.message });
            } else if (this.changes === 0) {
                res.status(404).json({ error: "Clase no encontrada" });
            } else {
                res.json({ message: "Clase actualizada correctamente" });
            }
        }
    );
});

// Eliminar una clase
app.delete('/clases/:id', (req, res) => {
    const { id } = req.params;
    db.run("DELETE FROM clases WHERE id = ?", [id], function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json({ message: "Clase eliminada" });
        }
    });
});

// Tarea programada para limpieza de clases finalizadas
cron.schedule('0 9 * * *', () => {
    console.log('Ejecutando tarea de limpieza de clases finalizadas (9:00 AM Paraguay)...');
    const hoy = new Date();
    const fechaHoyStr = hoy.toISOString().split('T')[0];

    db.run("DELETE FROM clases WHERE fecha_fin < ?", [fechaHoyStr], function(err) {
        if (err) {
            console.error("Error en la limpieza automática de clases:", err.message);
        } else {
            if (this.changes > 0) {
                console.log(`Tarea de limpieza completada. Clases eliminadas: ${this.changes}`);
            }
        }
    });
}, {
    scheduled: true,
    timezone: "America/Asuncion"
});

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
