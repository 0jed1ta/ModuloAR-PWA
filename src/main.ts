import "./style.css";

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div class="arranque">
    <h1>Atlas 3D de Arquitectura de Software</h1>
    <p>Proyecto arrancado con Vite + TypeScript. Three.js instalado, listo para usarse.</p>
  </div>
`;

if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("/sw.js")
    .then((registro) => console.log("SW registrado:", registro.scope))
    .catch((error) => console.error("Error al registrar SW:", error));
}
