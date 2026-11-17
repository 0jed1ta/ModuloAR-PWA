import { useCallback, useEffect, useState } from "react";
import type { Visor } from "../visor";
import { CATALOGO, modeloPorId } from "../modelos";
import { leerFicha } from "../descargas";
import type { Ficha } from "../modelos/tipos";

export function usePanel(visor: Visor | null) {
  const [modeloId, setModeloId] = useState(CATALOGO[0].id);
  const [piezaId, setPiezaId] = useState<string | null>(null);
  const [ficha, setFicha] = useState<{ id: string; datos: Ficha | null } | null>(null);

  const elegirModelo = useCallback(
    (id: string) => {
      const def = modeloPorId(id);
      if (!def || !visor) return;
      visor.mostrarModelo(def);
      setModeloId(id);
      setPiezaId(null);
    },
    [visor]
  );

  const elegirPieza = useCallback(
    (id: string | null) => {
      visor?.seleccionar(id);
      setPiezaId(id);
    },
    [visor]
  );

  useEffect(() => {
    if (!visor) return;
    elegirModelo(CATALOGO[0].id);
    visor.alTocarPieza((id) => setPiezaId(id));
  }, [visor, elegirModelo]);

  useEffect(() => {
    let vigente = true; // si cambias de modelo antes de que llegue, la respuesta vieja se descarta
    void leerFicha(modeloId).then((datos) => {
      if (vigente) setFicha({ id: modeloId, datos });
    });
    return () => {
      vigente = false;
    };
  }, [modeloId]);

  const def = modeloPorId(modeloId)!;
  return {
    def,
    piezaId,
    ficha: ficha?.id === modeloId ? ficha.datos : null,
    elegirModelo,
    elegirPieza,
    /** ◀ ▶ del overlay AR: ninguna → 1.ª → 2.ª … → ninguna. */
    recorrerPiezas(paso: number) {
      const ids: (string | null)[] = [null, ...def.piezas.map((p) => p.id)];
      const i = ids.indexOf(piezaId);
      elegirPieza(ids[(i + paso + ids.length) % ids.length]);
    },
  };
}
