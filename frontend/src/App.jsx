import { useEffect, useState } from "react";
import axios from "axios";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./App.css";

const diasSemana = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

// Lista de frases inspiradoras locales en caso de fallo de API
const frasesLocales = [
  { quote: "La educación es el arma más poderosa que puedes usar para cambiar el mundo.", author: "Nelson Mandela" },
  { quote: "El aprendizaje nunca agota la mente.", author: "Leonardo da Vinci" },
  { quote: "La educación no es preparación para la vida; la educación es la vida en sí misma.", author: "John Dewey" },
  { quote: "El conocimiento es poder.", author: "Francis Bacon" },
  { quote: "El futuro pertenece a aquellos que creen en la belleza de sus sueños.", author: "Eleanor Roosevelt" }
];

function App() {
  const [clases, setClases] = useState([]);
  const [fechaSeleccionada, setFechaSeleccionada] = useState(new Date());
  const [clasesDelDia, setClasesDelDia] = useState([]);
  const [form, setForm] = useState({
    nombre: "",
    horario: "",
    enlace: "",
    fecha_inicio: "",
    fecha_fin: "",
    dias_de_clase: []
  });

  useEffect(() => {
    cargarClasesMensuales();
  }, [fechaSeleccionada]);

  const cargarClasesMensuales = () => {
    const year = fechaSeleccionada.getFullYear();
    const month = String(fechaSeleccionada.getMonth() + 1).padStart(2, "0");

    axios.get(`http://localhost:5000/clases/${year}/${month}`)
      .then(response => {
        // console.log("📅 Clases obtenidas del mes:", response.data);
        setClases(response.data);
      })
      .catch(() => toast.error("Error al cargar las clases."));
  };

  const obtenerClasesPorFecha = (date) => {
    const fechaISO = date.toISOString().split("T")[0];
    const diaSemana = date.toLocaleDateString("es-ES", { weekday: "long" });

    // console.log(`📌 Filtrando clases para este día: ${fechaISO} (${diaSemana})`);

    const clasesFiltradas = clases.filter(c => {
      try {
        const diasClase = typeof c.dias_de_clase === "string" ? JSON.parse(c.dias_de_clase) : c.dias_de_clase;
        const diasNormalizados = diasClase.map(d => d.toLowerCase());
        const diaNormalizado = diaSemana.toLowerCase();

        return diasNormalizados.includes(diaNormalizado) && c.fecha_inicio <= fechaISO && c.fecha_fin >= fechaISO;
      } catch (error) {
        // console.error("❌ Error al parsear dias_de_clase:", c.dias_de_clase);
        return false;
      }
    });

    // console.log("✅ Clases encontradas para el día:", clasesFiltradas);
    setClasesDelDia(clasesFiltradas);
  };

  const manejarCambio = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const manejarCheckbox = (dia) => {
    setForm(prev => {
      let diasSeleccionados = Array.isArray(prev.dias_de_clase) ? [...prev.dias_de_clase] : [];

      if (diasSeleccionados.includes(dia)) {
        diasSeleccionados = diasSeleccionados.filter(d => d !== dia);
      } else {
        diasSeleccionados.push(dia);
      }

      return { ...prev, dias_de_clase: diasSeleccionados };
    });
  };

  const manejarEnvio = (e) => {
    e.preventDefault();

    if (!form.nombre || !form.horario || !form.enlace || !form.fecha_inicio || !form.fecha_fin || form.dias_de_clase.length === 0) {
      toast.error("Todos los campos son obligatorios.");
      return;
    }

    const datosEnviar = {
      nombre: form.nombre,
      horario: form.horario,
      enlace: form.enlace,
      fecha_inicio: form.fecha_inicio,
      fecha_fin: form.fecha_fin,
      dias_de_clase: Array.isArray(form.dias_de_clase) ? form.dias_de_clase : [] // Asegura que es un array
    };

    if (form.id) {
      // 🟢 Editar clase existente
      axios.put(`http://localhost:5000/clases/${form.id}`, datosEnviar, {
        headers: { "Content-Type": "application/json" }
      })
        .then(() => {
          toast.success("Clase actualizada correctamente!");
          setForm({ nombre: "", horario: "", enlace: "", fecha_inicio: "", fecha_fin: "", dias_de_clase: [], id: null });
          cargarClasesMensuales();

          // 🔥 Retrasar la actualización del día seleccionado
          setTimeout(() => {
            obtenerClasesPorFecha(fechaSeleccionada);
          }, 500);
        })
        .catch((error) => {
          // console.error("Error al actualizar la clase:", error.response?.data || error.message);
          toast.error("Error al actualizar la clase.");
        });
    } else {
      // 🔵 Agregar nueva clase
      axios.post("http://localhost:5000/clases", datosEnviar, {
        headers: { "Content-Type": "application/json" }
      })
        .then(() => {
          toast.success("Clase agregada correctamente!");
          setForm({ nombre: "", horario: "", enlace: "", fecha_inicio: "", fecha_fin: "", dias_de_clase: [] });
          cargarClasesMensuales();

          // 🔥 Retrasar la actualización del día seleccionado
          setTimeout(() => {
            obtenerClasesPorFecha(fechaSeleccionada);
          }, 500);
        })
        .catch((error) => {
          // console.error("Error al agregar la clase:", error.response?.data || error.message);
          toast.error("Error al agregar la clase.");
        });
    }
  };

  const eliminarClase = (id) => {
    if (!window.confirm("¿Estás seguro de que quieres eliminar esta clase?")) return;

    axios.delete(`http://localhost:5000/clases/${id}`)
      .then(() => {
        toast.success("Clase eliminada correctamente!");
        cargarClasesMensuales();
      })
      .catch((error) => {
        // console.error("Error al eliminar la clase:", error.response?.data || error.message);
        toast.error("Error al eliminar la clase.");
      });
  };

  const seleccionarClaseParaEditar = (clase) => {
    setForm({
      id: clase.id, // Asegurarse de que el ID se mantiene
      nombre: clase.nombre,
      horario: clase.horario,
      enlace: clase.enlace,
      fecha_inicio: clase.fecha_inicio,
      fecha_fin: clase.fecha_fin,
      dias_de_clase: JSON.parse(clase.dias_de_clase) // Convertir de string a array
    });
  };

  const obtenerFraseInspiradora = async () => {
    try {
      const response = await axios.get("http://localhost:5000/frase");
      return response.data; // Retorna la frase y el autor
    } catch (error) {
      console.error("Error al obtener la frase inspiradora:", error);
      return { quote: "La educación es la clave para desbloquear el mundo, un pasaporte a la libertad.", author: "Oprah Winfrey" };
    }
  };

  const enviarRecordatorio = async (clase) => {
    const { quote, author } = await obtenerFraseInspiradora(); // Obtiene la frase antes de enviar el mensaje

    const mensaje = `Estimados estudiantes,
Les remito el enlace para la clase de: *${clase.nombre}*
*Horario:* ${clase.horario}
*Enlace:* ${clase.enlace}

*"${quote}"*
_- ${author}_

¡Ánimos!`;

    const url = `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
    window.open(url, "_blank");
  };

  return (
    <div className="app-container">
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="content-row">
        <div className="form-container">
          <h3>➕ Agregar Clase</h3>
          <form onSubmit={manejarEnvio}>
            <input type="text" name="nombre" value={form.nombre} onChange={manejarCambio} placeholder="Nombre de la clase" required />
            <input type="text" name="horario" value={form.horario} onChange={manejarCambio} placeholder="Horario" required />
            <input type="text" name="enlace" value={form.enlace} onChange={manejarCambio} placeholder="Enlace" required />
            <input type="date" name="fecha_inicio" value={form.fecha_inicio} onChange={manejarCambio} required />
            <input type="date" name="fecha_fin" value={form.fecha_fin} onChange={manejarCambio} required />
            <div className="dias-semana">
              {diasSemana.map(dia => (
                <label key={dia} className={form.dias_de_clase.includes(dia) ? "dia-seleccionado" : "dia-no-seleccionado"}>
                  <input type="checkbox" onChange={() => manejarCheckbox(dia)} /> {dia}
                </label>
              ))}
            </div>
            <button type="submit" className="submit-button">📌 Agregar Clase</button>
          </form>
        </div>

        <div className="calendar-container">
          <h2>📅 Calendario de Clases</h2>
          <Calendar
            onChange={(date) => {
              setFechaSeleccionada(date);
              obtenerClasesPorFecha(date);
            }}
            value={fechaSeleccionada}
            className="custom-calendar"
            tileClassName={({ date }) => {
              const fechaStr = date.toISOString().split("T")[0];
              return clases.some(clase => {
                try {
                  const diasClase = typeof clase.dias_de_clase === "string" ? JSON.parse(clase.dias_de_clase) : clase.dias_de_clase;
                  const diaSemana = date.toLocaleDateString("es-ES", { weekday: "long" });
                  return diasClase.includes(diaSemana) && clase.fecha_inicio <= fechaStr && clase.fecha_fin >= fechaStr;
                } catch {
                  return false;
                }
              }) ? "highlight-class-day" : "";
            }}
          />
          <h3>📌 Clases del {fechaSeleccionada.toLocaleDateString()}</h3>
          {clasesDelDia.length === 0 ? <p>No hay clases este día.</p> : (
            <ul className="clases-list">
              {clasesDelDia.map(clase => (
                <div key={clase.id} className="clase-item">
                  <span style={{ marginRight: "20px" }}>
                    <strong>{clase.nombre}</strong> - {clase.horario}
                  </span>
                  <div className="botones-container">
                    <button
                      onClick={() => enviarRecordatorio(clase)}
                      style={{
                        backgroundColor: "#25D366",
                        color: "white",
                        padding: "5px 10px",
                        borderRadius: "5px",
                        marginRight: "10px",
                        border: "none",
                        cursor: "pointer"
                      }}
                    >
                      📲 Enviar
                    </button>
                    <button
                      onClick={() => seleccionarClaseParaEditar(clase)}
                      style={{
                        backgroundColor: "#F4A261",
                        color: "white",
                        padding: "5px 10px",
                        borderRadius: "5px",
                        marginRight: "10px",
                        border: "none",
                        cursor: "pointer"
                      }}
                    >
                      ✏️ Editar
                    </button>
                    <button
                      onClick={() => eliminarClase(clase.id)}
                      style={{
                        backgroundColor: "#E76F51",
                        color: "white",
                        padding: "5px 10px",
                        borderRadius: "5px",
                        border: "none",
                        cursor: "pointer"
                      }}
                    >
                      🗑️ Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
