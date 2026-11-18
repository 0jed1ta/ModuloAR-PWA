const CLAVE = "atlas3d-rastro-ar";
export const PASO_FINAL = "fin-ok";

export function anotar(paso: string): void {
  try {
    localStorage.setItem(CLAVE, `${paso}|${Date.now()}`);
  } catch {}
}

export function leerRastro(): { paso: string; hace: number } | null {
  try {
    const crudo = localStorage.getItem(CLAVE);
    if (!crudo) return null;
    const [paso, t] = crudo.split("|");
    return { paso, hace: Math.round((Date.now() - Number(t)) / 1000) };
  } catch {
    return null;
  }
}

export function describirRastro(): string {
  const r = leerRastro();
  if (!r) return "Última sesión de AR: sin registro.";
  if (r.paso === PASO_FINAL)
    return `Última sesión de AR: terminó completa (hace ${r.hace} s).`;
  return `Última sesión de AR: se interrumpió en el paso «${r.paso}» (hace ${r.hace} s).`;
}
