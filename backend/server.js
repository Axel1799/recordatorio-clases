require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');
const https = require('https'); // Agregamos https para ignorar certificados vencidos

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

// Crear la tabla si no existe
db.run(`CREATE TABLE IF NOT EXISTS clases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    horario TEXT NOT NULL,
    enlace TEXT NOT NULL,
    fecha_inicio TEXT NOT NULL,
    fecha_fin TEXT NOT NULL,
    dias_de_clase TEXT NOT NULL
)`);

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

// Obtener todas las clases de un mes específico
app.get('/clases/:year/:month', (req, res) => {
    const { year, month } = req.params;
    const inicioMes = `${year}-${month}-01`;
    const finMes = `${year}-${month}-31`;

    db.all("SELECT * FROM clases WHERE fecha_inicio <= ? AND fecha_fin >= ?", [finMes, inicioMes], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});

// Obtener clases de un día específico
app.get('/clases/dia/:fecha', (req, res) => {
    const { fecha } = req.params;
    db.all("SELECT * FROM clases WHERE fecha_inicio <= ? AND fecha_fin >= ?", [fecha, fecha], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            const clasesDelDia = rows.filter(clase => {
                const diasClase = JSON.parse(clase.dias_de_clase);
                const diaSemana = new Date(fecha).toLocaleDateString('es-ES', { weekday: 'long' });
                return diasClase.includes(diaSemana);
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

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
