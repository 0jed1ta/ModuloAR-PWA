                                                                     
                                                                           
                                                                            
                                                                          
                

                                                                          
export type Rol = "actor" | "presentacion" | "coordinacion" | "logica" | "datos" | "infra";

export type Forma = "caja" | "cilindro" | "esfera";

export interface Pieza {
  id: string;
  nombre: string;
  rol: Rol;
  forma: Forma;
                                                                         
  pos: [number, number, number];
                             
  tam: [number, number, number];
                                                                              
  resumen: string;
                                                                                                              
  rotulo?: "arriba" | "abajo" | "frente";
}

                                                                                         
export type TipoEnlace = "llamada" | "evento" | "datos";

export interface Enlace {
  de: string;
  a: string;
  etiqueta?: string;
  tipo: TipoEnlace;
                                                                                               
  desvio?: [number, number, number];
}

export interface DefinicionModelo {
  id: string;
  nombre: string;
                                            
  resumen: string;
  piezas: Pieza[];
  enlaces: Enlace[];
                                                                                                                                  
  elevacion?: number;
                                                                                
  distancia?: number;
}

                                                                         
export interface Ficha {
  id: string;
  nombre: string;
  resumen: string;
  cuando_usarlo: string;
  riesgo: string;
  piezas: Record<string, { responsabilidad: string; habla_con: string[] }>;
}

export const ROLES: Record<Rol, { nombre: string; color: number; css: string }> = {
  actor: { nombre: "Usuario o sistema externo", color: 0xc9d1e3, css: "#c9d1e3" },
  presentacion: { nombre: "Presentación", color: 0x4aa3ff, css: "#4aa3ff" },
  coordinacion: { nombre: "Coordinación", color: 0xff7a59, css: "#ff7a59" },
  logica: { nombre: "Lógica de negocio", color: 0xffc53d, css: "#ffc53d" },
  datos: { nombre: "Datos", color: 0x4cd1a0, css: "#4cd1a0" },
  infra: { nombre: "Infraestructura", color: 0xb48cff, css: "#b48cff" },
};

export const COLOR_ENLACE: Record<TipoEnlace, number> = {
  llamada: 0xe8eefc,
  evento: 0xff9ff3,
  datos: 0x8fe3c0,
};
