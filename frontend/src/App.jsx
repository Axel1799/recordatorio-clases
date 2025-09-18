import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./App.css";

const diasSemana = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

function App() {
  const [highlightedDays, setHighlightedDays] = useState([]);
  const [fechaSeleccionada, setFechaSeleccionada] = useState(new Date());
  const [clasesDelDia, setClasesDelDia] = useState([]);
  const [enviados, setEnviados] = useState(new Set());
  const [form, setForm] = useState({
    nombre: "",
    horario: "",
    enlace: "",
    fecha_inicio: "",
    fecha_fin: "",
    dias_de_clase: []
  });

  const cargarDiasResaltados = useCallback(() => {
    const year = fechaSeleccionada.getFullYear();
    const month = String(fechaSeleccionada.getMonth() + 1).padStart(2, "0");

    axios.get(`http://localhost:5000/clases/${year}/${month}/highlight`)
      .then(response => {
        setHighlightedDays(response.data);
      })
      .catch(() => toast.error("Error al cargar los días con clases."));
  }, [fechaSeleccionada]);

  const obtenerClasesPorFecha = useCallback((date) => {
    const fechaISO = date.toISOString().split("T")[0];
    axios.get(`http://localhost:5000/clases/dia/${fechaISO}`)
      .then(response => {
        setClasesDelDia(response.data);
      })
      .catch(() => {
        toast.error("Error al obtener las clases del día.");
        setClasesDelDia([]);
      });
  }, []);

  useEffect(() => {
    cargarDiasResaltados();
    obtenerClasesPorFecha(fechaSeleccionada);
  }, [cargarDiasResaltados, obtenerClasesPorFecha, fechaSeleccionada]);

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

    const datosEnviar = { ...form, dias_de_clase: Array.isArray(form.dias_de_clase) ? form.dias_de_clase : [] };

    const promise = form.id
      ? axios.put(`http://localhost:5000/clases/${form.id}`, datosEnviar)
      : axios.post("http://localhost:5000/clases", datosEnviar);

    promise.then(() => {
      toast.success(form.id ? "Clase actualizada correctamente!" : "Clase agregada correctamente!");
      setForm({ nombre: "", horario: "", enlace: "", fecha_inicio: "", fecha_fin: "", dias_de_clase: [], id: null });
      cargarDiasResaltados();
      obtenerClasesPorFecha(fechaSeleccionada);
    }).catch(() => {
      toast.error(form.id ? "Error al actualizar la clase." : "Error al agregar la clase.");
    });
  };

  const eliminarClase = (id) => {
    if (!window.confirm("¿Estás seguro de que quieres eliminar esta clase?")) return;

    axios.delete(`http://localhost:5000/clases/${id}`)
      .then(() => {
        toast.success("Clase eliminada correctamente!");
        cargarDiasResaltados();
        obtenerClasesPorFecha(fechaSeleccionada);
      })
      .catch(() => {
        toast.error("Error al eliminar la clase.");
      });
  };

  const seleccionarClaseParaEditar = (clase) => {
    setForm({
      ...clase,
      dias_de_clase: typeof clase.dias_de_clase === 'string' ? JSON.parse(clase.dias_de_clase) : clase.dias_de_clase
    });
  };

  const obtenerFraseInspiradora = async () => {
    try {
      const response = await axios.get("http://localhost:5000/frase");
      return response.data;
    } catch (error) {
      console.error("Error al obtener la frase inspiradora:", error);
      return { quote: "La educación es la clave para desbloquear el mundo, un pasaporte a la libertad.", author: "Oprah Winfrey" };
    }
  };

  const enviarRecordatorio = async (clase) => {
    const { quote, author } = await obtenerFraseInspiradora();
    const mensaje = `Estimados estudiantes,\n\nLes remito el enlace para la clase de: *${clase.nombre}*\n*Horario:* ${clase.horario}\n*Enlace:* ${clase.enlace}\n\n¡Ánimos!`;
    const url = `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
    window.open(url, "_blank");
    setEnviados(prevEnviados => new Set(prevEnviados).add(clase.id));
  };

  return (
    <div className="app-container">
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="content-row">
        <div className="form-container">
          <h3>{form.id ? "✏️ Editar Clase" : "➕ Agregar Clase"}</h3>
          <form onSubmit={manejarEnvio}>
            <input type="text" name="nombre" value={form.nombre} onChange={manejarCambio} placeholder="Nombre de la clase" required />
            <input type="text" name="horario" value={form.horario} onChange={manejarCambio} placeholder="Horario" required />
            <input type="text" name="enlace" value={form.enlace} onChange={manejarCambio} placeholder="Enlace" required />

            <label htmlFor="fecha_inicio" className="form-label">Fecha de Inicio</label>
            <input id="fecha_inicio" type="date" name="fecha_inicio" value={form.fecha_inicio} onChange={manejarCambio} required />

            <label htmlFor="fecha_fin" className="form-label">Fecha de Finalización</label>
            <input id="fecha_fin" type="date" name="fecha_fin" value={form.fecha_fin} onChange={manejarCambio} required />

            <div className="dias-semana">
              {diasSemana.map(dia => (
                <label key={dia} className={form.dias_de_clase.includes(dia) ? "dia-seleccionado" : "dia-no-seleccionado"}>
                  <input type="checkbox" checked={form.dias_de_clase.includes(dia)} onChange={() => manejarCheckbox(dia)} /> {dia}
                </label>
              ))}
            </div>
            <button type="submit" className="submit-button">{form.id ? "💾 Guardar Cambios" : "📌 Agregar Clase"}</button>
            {form.id && <button type="button" onClick={() => setForm({ nombre: "", horario: "", enlace: "", fecha_inicio: "", fecha_fin: "", dias_de_clase: [] })} className="cancel-button">Cancelar</button>}
          </form>
        </div>

        <div className="calendar-container">
          <h2>📅 Calendario de Clases</h2>
          <Calendar
            onChange={setFechaSeleccionada}
            value={fechaSeleccionada}
            className="custom-calendar"
            tileClassName={({ date, view }) => {
              const classes = [];
              if (view === 'month') {
                const fechaStr = date.toISOString().split("T")[0];
                if (highlightedDays.includes(fechaStr)) {
                  classes.push("highlight-class-day");
                }
                if (date.getDay() === 0) { // Sunday
                  classes.push("sunday");
                }
              }
              return classes.length > 0 ? classes.join(' ') : null;
            }}
            onActiveStartDateChange={({ activeStartDate }) => setFechaSeleccionada(activeStartDate)}
          />
          <h3>📌 Clases del {fechaSeleccionada.toLocaleDateString()}</h3>
          {clasesDelDia.length === 0 ? (
            <p>No hay clases este día.</p>
          ) : (
            <div className="clases-del-dia-container">
              {clasesDelDia.map((clase) => (
                <div key={clase.id} className="clase-item">
                  <span>
                    <strong>{clase.nombre}</strong> - {clase.horario}
                  </span>
                  <div className="botones-container">
                    <button
                      onClick={() => enviarRecordatorio(clase)}
                      className={enviados.has(clase.id) ? "boton-reenviar" : "boton-enviar"}
                    >
                      {enviados.has(clase.id) ? "📲 Volver a enviar" : "📲 Enviar"}
                    </button>
                    <button onClick={() => seleccionarClaseParaEditar(clase)} className="boton-editar">✏️ Editar</button>
                    <button onClick={() => eliminarClase(clase.id)} className="boton-eliminar">🗑️ Eliminar</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
