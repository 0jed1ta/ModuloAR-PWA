import type { Ficha } from "./tipos";

type ResumenFicha = Pick<
  Ficha,
  "id" | "nombre" | "resumen" | "cuando_usarlo" | "riesgo"
> & { piezas: Ficha["piezas"] };

export const RESUMENES_FICHAS: Record<string, ResumenFicha> = {
  mvc: {
    id: "mvc",
    nombre: "Patrón MVC",
    resumen: "Separa datos, presentación y coordinación.",
    cuando_usarlo:
      "Interfaces con varias vistas del mismo dato; facilita probar la lógica sin la pantalla.",
    riesgo:
      "En proyectos pequeños el controlador puede crecer hasta convertirse en un archivo que lo hace todo.",
    piezas: {},
  },
  capas: {
    id: "capas",
    nombre: "Arquitectura en capas",
    resumen: "Organiza responsabilidades en niveles con dependencias controladas.",
    cuando_usarlo:
      "Sistemas empresariales con equipos separados por especialidad.",
    riesgo:
      "Si toda petición atraviesa todas las capas sin aportar nada en las intermedias, se añade latencia y código de paso.",
    piezas: {},
  },
  microservicios: {
    id: "microservicios",
    nombre: "Microservicios",
    resumen: "Divide el sistema en servicios desplegables de forma independiente.",
    cuando_usarlo:
      "Equipos grandes que necesitan desplegar partes del sistema de forma independiente.",
    riesgo:
      "Cada llamada es una llamada de red: aparecen fallos parciales, latencia y la complejidad de operar muchos servicios.",
    piezas: {},
  },
  hexagonal: {
    id: "hexagonal",
    nombre: "Puertos y adaptadores",
    resumen: "Mantiene el dominio independiente de interfaces e infraestructura.",
    cuando_usarlo:
      "Cuando las reglas de negocio deben sobrevivir a cambios de interfaz, base de datos o integraciones.",
    riesgo:
      "Crear interfaces innecesarias para sistemas pequeños y aumentar la cantidad de código ceremonial.",
    piezas: {},
  },
};
