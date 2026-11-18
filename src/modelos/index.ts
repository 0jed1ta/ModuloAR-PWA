import type { DefinicionModelo } from "./tipos";
import { MVC } from "./mvc";
import { CAPAS } from "./capas";
import { MICROSERVICIOS } from "./microservicios";
import { HEXAGONAL } from "./hexagonal";

export const CATALOGO: DefinicionModelo[] = [
  MVC,
  CAPAS,
  MICROSERVICIOS,
  HEXAGONAL,
];

export function modeloPorId(id: string): DefinicionModelo | undefined {
  return CATALOGO.find((m) => m.id === id);
}
