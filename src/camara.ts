export async function iniciarCamaraDeFondo(video: HTMLVideoElement): Promise<MediaStream> {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
    audio: false,
  });
  video.srcObject = stream;
  await video.play();
  return stream;
}

export function detenerCamaraDeFondo(video: HTMLVideoElement, stream: MediaStream | null): void {
  stream?.getTracks().forEach((pista) => pista.stop());
  video.srcObject = null;
}

export function describirErrorCamara(error: unknown): string {
  const nombre = error instanceof Error ? error.name : "";
  if (nombre === "NotAllowedError") return "Permiso de cámara denegado. Puedes cambiarlo en los ajustes del sitio.";
  if (nombre === "NotFoundError") return "No se encontró ninguna cámara en este dispositivo.";
  if (nombre === "NotReadableError") return "La cámara está en uso por otra aplicación.";
  if (nombre === "SecurityError" || nombre === "TypeError") return "La cámara requiere HTTPS o localhost.";
  return "No se pudo abrir la cámara. Revisa los permisos e inténtalo de nuevo.";
}
