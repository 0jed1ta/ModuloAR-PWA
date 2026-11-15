const NOMBRE_DB = "atlas3d-progreso-db";
const VERSION_DB = 1;

export interface ProgresoModelo {
  modeloId: string;
  favorito: boolean;
  ultimaVisita: number | null;
  notaCifrada: ArrayBuffer | null;
  notaIv: Uint8Array | null;
}

export function abrirBaseDeDatos(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const peticion = indexedDB.open(NOMBRE_DB, VERSION_DB);
    peticion.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const store = db.createObjectStore("progreso", { keyPath: "modeloId" });
      store.createIndex("porFavorito", "favorito", { unique: false });
      store.createIndex("porUltimaVisita", "ultimaVisita", { unique: false });
    };
    peticion.onsuccess = (event) => resolve((event.target as IDBOpenDBRequest).result);
    peticion.onerror = (event) => reject((event.target as IDBOpenDBRequest).error);
  });
}

function registroBase(modeloId: string): ProgresoModelo {
  return { modeloId, favorito: false, ultimaVisita: null, notaCifrada: null, notaIv: null };
}

export function marcarModeloVisto(db: IDBDatabase, modeloId: string): Promise<ProgresoModelo> {
  return new Promise((resolve, reject) => {
    const store = db.transaction("progreso", "readwrite").objectStore("progreso");
    const peticion = store.get(modeloId);
    peticion.onsuccess = () => {
      const registro = (peticion.result as ProgresoModelo | undefined) ?? registroBase(modeloId);
      registro.ultimaVisita = Date.now();
      const escritura = store.put(registro);
      escritura.onsuccess = () => resolve(registro);
      escritura.onerror = () => reject(escritura.error);
    };
    peticion.onerror = () => reject(peticion.error);
  });
}

export function alternarFavorito(db: IDBDatabase, modeloId: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const store = db.transaction("progreso", "readwrite").objectStore("progreso");
    const peticion = store.get(modeloId);
    peticion.onsuccess = () => {
      const registro = (peticion.result as ProgresoModelo | undefined) ?? registroBase(modeloId);
      registro.favorito = !registro.favorito;
      const escritura = store.put(registro);
      escritura.onsuccess = () => resolve(registro.favorito);
      escritura.onerror = () => reject(escritura.error);
    };
    peticion.onerror = () => reject(peticion.error);
  });
}

export function obtenerTodoElProgreso(db: IDBDatabase): Promise<ProgresoModelo[]> {
  return new Promise((resolve, reject) => {
    const peticion = db.transaction("progreso", "readonly").objectStore("progreso").getAll();
    peticion.onsuccess = () => resolve(peticion.result as ProgresoModelo[]);
    peticion.onerror = () => reject(peticion.error);
  });
}

export function obtenerFavoritos(db: IDBDatabase): Promise<ProgresoModelo[]> {
  return new Promise((resolve) => {
    const favoritos: ProgresoModelo[] = [];
    const indice = db.transaction("progreso", "readonly").objectStore("progreso").index("porFavorito");
    const cursor = indice.openCursor(IDBKeyRange.only(true));
    cursor.onsuccess = (event) => {
      const actual = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
      if (!actual) return resolve(favoritos);
      favoritos.push(actual.value as ProgresoModelo);
      actual.continue();
    };
  });
}

export async function guardarNotaDeEstudio(
  db: IDBDatabase,
  clave: CryptoKey,
  modeloId: string,
  texto: string,
  cifrarTexto: (clave: CryptoKey, texto: string) => Promise<{ cifrado: ArrayBuffer; iv: Uint8Array }>,
): Promise<void> {
  const { cifrado, iv } = await cifrarTexto(clave, texto);
  const store = db.transaction("progreso", "readwrite").objectStore("progreso");
  const existente = await new Promise<ProgresoModelo | undefined>((resolve) => {
    store.get(modeloId).onsuccess = (event) => resolve((event.target as IDBRequest).result);
  });
  const registro = existente ?? registroBase(modeloId);
  registro.notaCifrada = cifrado;
  registro.notaIv = iv;
  await new Promise<void>((resolve, reject) => {
    const escritura = store.put(registro);
    escritura.onsuccess = () => resolve();
    escritura.onerror = () => reject(escritura.error);
  });
}
