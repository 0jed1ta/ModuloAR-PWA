const NOMBRE_DB = "atlas3d-progreso-db";

const VERSION_DB = 4;

export const RENOMBRES_V3: Record<string, string> = {
  "modelo-demo-1": "mvc",
  "modelo-demo-2": "capas",
  "modelo-demo-3": "microservicios",
};

export interface ProgresoModelo {
  modeloId: string;
  favorito: boolean;
  ultimaVisita: number | null;
  notaCifrada: ArrayBuffer | null;
  notaIv: Uint8Array | null;
  visitas: number;
}

function migrarIdentificadores(
  store: IDBObjectStore,
  reiniciarDescarga: boolean,
) {
  for (const [viejo, nuevo] of Object.entries(RENOMBRES_V3)) {
    const lectura = store.get(viejo);
    lectura.onsuccess = () => {
      const registro = lectura.result;
      if (!registro) return;
      store.delete(viejo);
      store.put({
        ...registro,
        modeloId: nuevo,
        ...(reiniciarDescarga ? { estado: "pendiente" } : {}),
      });
    };
  }
}

export function abrirBaseDeDatos(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const peticion = indexedDB.open(NOMBRE_DB, VERSION_DB);

    peticion.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (event.oldVersion < 1) {
        const store = db.createObjectStore("progreso", { keyPath: "modeloId" });
        store.createIndex("porFavorito", "favorito", { unique: false });
        store.createIndex("porUltimaVisita", "ultimaVisita", { unique: false });
      }
      if (event.oldVersion < 2) {
        db.createObjectStore("descargas", { keyPath: "modeloId" });
      }
      if (event.oldVersion >= 1 && event.oldVersion < 3) {
        const tx = (event.target as IDBOpenDBRequest).transaction!;
        migrarIdentificadores(tx.objectStore("progreso"), false);
        migrarIdentificadores(tx.objectStore("descargas"), true);
      }
      if (event.oldVersion >= 1 && event.oldVersion < 4) {
        const tx = (event.target as IDBOpenDBRequest).transaction!;
        const store = tx.objectStore("progreso");
        const cursor = store.openCursor();
        cursor.onsuccess = () => {
          const actual = cursor.result;
          if (!actual) return;
          const registro = actual.value as ProgresoModelo;
          if (typeof registro.visitas !== "number")
            actual.update({
              ...registro,
              visitas: registro.ultimaVisita ? 1 : 0,
            });
          actual.continue();
        };
      }
    };

    peticion.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      db.onversionchange = () => db.close();
      resolve(db);
    };
    peticion.onerror = (event) =>
      reject((event.target as IDBOpenDBRequest).error);
  });
}

export function marcarModeloVisto(
  db: IDBDatabase,
  modeloId: string,
): Promise<ProgresoModelo> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("progreso", "readwrite");
    const store = tx.objectStore("progreso");
    const peticion = store.get(modeloId);

    peticion.onsuccess = () => {
      const registro: ProgresoModelo = peticion.result || {
        modeloId,
        favorito: false,
        ultimaVisita: null,
        notaCifrada: null,
        notaIv: null,
        visitas: 0,
      };
      registro.ultimaVisita = Date.now();
      registro.visitas = (registro.visitas || 0) + 1;
      const escritura = store.put(registro);
      escritura.onsuccess = () => resolve(registro);
      escritura.onerror = () => reject(escritura.error);
    };
    peticion.onerror = () => reject(peticion.error);
  });
}

export function alternarFavorito(
  db: IDBDatabase,
  modeloId: string,
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("progreso", "readwrite");
    const store = tx.objectStore("progreso");
    const peticion = store.get(modeloId);

    peticion.onsuccess = () => {
      const registro: ProgresoModelo = peticion.result || {
        modeloId,
        favorito: false,
        ultimaVisita: null,
        notaCifrada: null,
        notaIv: null,
        visitas: 0,
      };
      registro.favorito = !registro.favorito;
      const escritura = store.put(registro);
      escritura.onsuccess = () => resolve(registro.favorito);
      escritura.onerror = () => reject(escritura.error);
    };
    peticion.onerror = () => reject(peticion.error);
  });
}

export function obtenerTodoElProgreso(
  db: IDBDatabase,
): Promise<ProgresoModelo[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("progreso", "readonly");
    const peticion = tx.objectStore("progreso").getAll();
    peticion.onsuccess = () => resolve(peticion.result as ProgresoModelo[]);
    peticion.onerror = () => reject(peticion.error);
  });
}

export function obtenerFavoritos(db: IDBDatabase): Promise<ProgresoModelo[]> {
  return new Promise((resolve) => {
    const resultado: ProgresoModelo[] = [];
    const indice = db
      .transaction("progreso", "readonly")
      .objectStore("progreso")
      .index("porFavorito");
    const cursor = indice.openCursor(IDBKeyRange.only(true as any));

    cursor.onsuccess = (event) => {
      const c = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
      if (c) {
        resultado.push(c.value as ProgresoModelo);
        c.continue();
      } else {
        resolve(resultado);
      }
    };
  });
}

export async function guardarNotaDeEstudio(
  db: IDBDatabase,
  clave: CryptoKey,
  modeloId: string,
  texto: string,
  cifrarTexto: (
    clave: CryptoKey,
    texto: string,
  ) => Promise<{ cifrado: ArrayBuffer; iv: Uint8Array }>,
): Promise<void> {
  const { cifrado, iv } = await cifrarTexto(clave, texto);
  const tx = db.transaction("progreso", "readwrite");
  const store = tx.objectStore("progreso");
  const existente = await new Promise<ProgresoModelo | undefined>((resolve) => {
    store.get(modeloId).onsuccess = (e) =>
      resolve((e.target as IDBRequest).result);
  });
  const registro: ProgresoModelo = existente || {
    modeloId,
    favorito: false,
    ultimaVisita: null,
    notaCifrada: null,
    notaIv: null,
    visitas: 0,
  };
  registro.notaCifrada = cifrado;
  registro.notaIv = iv;
  return new Promise((resolve, reject) => {
    const escritura = store.put(registro);
    escritura.onsuccess = () => resolve();
    escritura.onerror = () => reject(escritura.error);
  });
}

export interface Descarga {
  modeloId: string;
  estado: "pendiente" | "listo";
}

export function encolarDescargas(
  db: IDBDatabase,
  ids: string[],
): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("descargas", "readwrite");
    const store = tx.objectStore("descargas");
    ids.forEach((modeloId) =>
      store.put({ modeloId, estado: "pendiente" } satisfies Descarga),
    );
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export function obtenerDescargas(db: IDBDatabase): Promise<Descarga[]> {
  return new Promise((resolve, reject) => {
    const peticion = db
      .transaction("descargas", "readonly")
      .objectStore("descargas")
      .getAll();
    peticion.onsuccess = () => resolve(peticion.result as Descarga[]);
    peticion.onerror = () => reject(peticion.error);
  });
}

export function marcarDescargaLista(
  db: IDBDatabase,
  modeloId: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("descargas", "readwrite");
    tx.objectStore("descargas").put({
      modeloId,
      estado: "listo",
    } satisfies Descarga);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
