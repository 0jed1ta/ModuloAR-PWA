export async function derivarClaveDesdeContrasena(contrasena: string, sal: Uint8Array): Promise<CryptoKey> {
  const materialBase = await crypto.subtle.importKey("raw", new TextEncoder().encode(contrasena), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: sal as BufferSource, iterations: 100000, hash: "SHA-256" },
    materialBase,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function cifrarTexto(clave: CryptoKey, texto: string): Promise<{ cifrado: ArrayBuffer; iv: Uint8Array }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cifrado = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv as BufferSource }, clave, new TextEncoder().encode(texto));
  return { cifrado, iv };
}

export async function descifrarTexto(clave: CryptoKey, datos: { cifrado: ArrayBuffer; iv: Uint8Array }): Promise<string> {
  const plano = await crypto.subtle.decrypt({ name: "AES-GCM", iv: datos.iv as BufferSource }, clave, datos.cifrado);
  return new TextDecoder().decode(plano);
}

const CLAVE_SAL = "atlas3d-sal";

export function obtenerOCrearSal(): Uint8Array {
  const guardada = localStorage.getItem(CLAVE_SAL);
  if (guardada) return Uint8Array.from(atob(guardada), (caracter) => caracter.charCodeAt(0));
  const sal = crypto.getRandomValues(new Uint8Array(16));
  localStorage.setItem(CLAVE_SAL, btoa(String.fromCharCode(...sal)));
  return sal;
}
