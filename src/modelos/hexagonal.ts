import type { DefinicionModelo } from "./tipos";

                                                                                
export const HEXAGONAL: DefinicionModelo = {
  id: "hexagonal",
  nombre: "Puertos y adaptadores",
  resumen: "El dominio queda en el centro y se comunica con el exterior mediante puertos estables.",
  elevacion: 24,
  distancia: 1.05,
  piezas: [
    { id: "usuario", nombre: "Usuario", rol: "actor", forma: "esfera", pos: [-7, 0, 0], tam: [1.4, 1.4, 1.4], resumen: "Inicia un caso de uso." },
    { id: "web", nombre: "Adaptador web", rol: "presentacion", forma: "caja", pos: [-4.2, 0, 0], tam: [2.4, 1.4, 1.8], resumen: "Traduce HTTP a una operación del dominio." },
    { id: "entrada", nombre: "Puerto de entrada", rol: "coordinacion", forma: "cilindro", pos: [-1.8, 0, 0], tam: [1.2, 1.6, 1.2], resumen: "Contrato de los casos de uso." },
    { id: "dominio", nombre: "Dominio", rol: "logica", forma: "cilindro", pos: [0.8, 0, 0], tam: [2.6, 2.1, 2.6], resumen: "Reglas de negocio sin dependencias de infraestructura." },
    { id: "salida", nombre: "Puerto de salida", rol: "coordinacion", forma: "cilindro", pos: [3.4, 0, 0], tam: [1.2, 1.6, 1.2], resumen: "Contrato requerido por el dominio." },
    { id: "persistencia", nombre: "Adaptador BD", rol: "infra", forma: "caja", pos: [6.2, 0, 0], tam: [2.5, 1.5, 1.8], resumen: "Implementa persistencia sin contaminar el dominio." },
  ],
  enlaces: [
    { de: "usuario", a: "web", etiqueta: "usa", tipo: "llamada" },
    { de: "web", a: "entrada", etiqueta: "invoca", tipo: "llamada" },
    { de: "entrada", a: "dominio", etiqueta: "ejecuta", tipo: "llamada" },
    { de: "dominio", a: "salida", etiqueta: "requiere", tipo: "llamada" },
    { de: "salida", a: "persistencia", etiqueta: "implementa", tipo: "datos" },
  ],
};
