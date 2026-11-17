                                                               
                                                                             
                                                                            
                                                               
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { capacidadesDe, type CapacidadesAR } from "./xr";
import { crearGestos } from "./gestos";
import { construirModelo, type ModeloConstruido } from "./modelos/constructor";
import type { DefinicionModelo } from "./modelos/tipos";
import { anotar, PASO_FINAL } from "./rastro";

export interface Visor {
                                                                                         
  rotarHacia(rotX: number, rotY: number): void;
                                                                                     
  controlPorSensores(activo: boolean): void;
                                                                            
  rotacionActualGrados(): { x: number; y: number };
                                                                                    
  fondoTransparente(activo: boolean): void;
     
                                                       
                                                                           
                                                                                  
                                                      
     
  entrarEnAR(sesion: XRSession, opciones: OpcionesAR): Promise<EstadoAR>;
                                                                                      
  quitarEnAR(): void;
                                                 
  enAR(): boolean;
                                                                                              
  mostrarModelo(def: DefinicionModelo): void;
                                                                        
  seleccionar(piezaId: string | null): void;
                                                                                       
  alTocarPieza(avisar: (piezaId: string | null) => void): void;
  destruir(): void;
}

                                                  
export type FaseAR = "buscando" | "listo" | "colocado";

export interface EstadoAR extends CapacidadesAR {
  fase: FaseAR;
                                                                                  
  anclado: boolean;
  escala: number;                                                     
  giroGrados: number;
                                                                                            
  posicion: { x: number; y: number; z: number };
                                                                                                   
  consultas: number;
  resultados: number;                                             
  impactos: number;                                     
                                                                                                 
  sinSuperficie: boolean;
}

export interface OpcionesAR {
  overlay: HTMLElement;
  alCambiar: (estado: EstadoAR) => void;
  alTerminar: () => void;
}

const ESCALA_INICIAL = 0.25;                                          
const ESCALA_VISTA = 3;
const DISTANCIA_VISTA = 6;                                                                                                                 
const ESCALA_MIN = 0.1;
const ESCALA_MAX = 1;
const CADA_CUANTOS_FOTOGRAMAS = 2;                                                                                    
const MS_HASTA_PLAN_B = 6000;                                                                                
const CONSULTAS_SIN_IMPACTO = 8;                                                                                    
const MITAD = 0.8;                                                                        

export function crearVisor(contenedor: HTMLElement): Visor {
  const escena = new THREE.Scene();
  const COLOR_FONDO = new THREE.Color(0x0b1220);
  escena.background = COLOR_FONDO;

  const camara = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camara.position.set(0, 3, 5);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  contenedor.append(renderer.domElement);

  escena.add(new THREE.AmbientLight(0xffffff, 0.6));
  const luz = new THREE.DirectionalLight(0xffffff, 1.2);
  luz.position.set(3, 4, 5);
  escena.add(luz);

                                                                                
                                                                               
  const raiz = new THREE.Group();
  const grupo = new THREE.Group();
  grupo.scale.setScalar(ESCALA_VISTA);
  let modelo: ModeloConstruido | null = null;
  let piezaElegida: string | null = null;
  let centroY = 0;                                                                    
  raiz.add(grupo);
  escena.add(raiz);

  const controles = new OrbitControls(camara, renderer.domElement);
  controles.enableDamping = true;

  let objetivoX = 0;
  let objetivoY = 0;
  let porSensores = false;

                                                                                                       
                                                                                                
  let sucio = true;

  function ajustarTamano() {
    const ancho = contenedor.clientWidth || 320;
    const alto = Math.min(Math.round(ancho * 0.75), 560);
    renderer.setSize(ancho, alto);
    camara.aspect = ancho / alto;
    camara.updateProjectionMatrix();
    sucio = true;
  }
  ajustarTamano();
  window.addEventListener("resize", ajustarTamano);

  let animacion = 0;
  function bucle() {
    animacion = requestAnimationFrame(bucle);
    if (porSensores) {
                                                                                       
      grupo.rotation.x += (objetivoX - grupo.rotation.x) * 0.15;
      grupo.rotation.y += (objetivoY - grupo.rotation.y) * 0.15;
      sucio = true;                                        
    }
    const camaraSeMovio = controles.update();                                                           
    if (sucio || camaraSeMovio) {
      sucio = false;
      renderer.render(escena, camara);
    }
  }
  bucle();

                                                                             
  let sesionAR: XRSession | null = null;
  let quitarObjetoAR: () => void = () => {};

  async function entrarEnAR(sesion: XRSession, opciones: OpcionesAR): Promise<EstadoAR> {
    anotar("entrada");
    cancelAnimationFrame(animacion);                                                                     
    renderer.xr.enabled = true;
    renderer.xr.setReferenceSpaceType("local");
    await renderer.xr.setSession(sesion);
    sesionAR = sesion;

    const caps = capacidadesDe(sesion);
    const fondoPrevio = escena.background;
    escena.background = null;                                                       
    controles.enabled = false;
    if (modelo) modelo.raiz.position.y = 0;                                                  

                                    
    let fase: FaseAR = caps.hitTest ? "buscando" : "colocado";
    let ancla: XRAnchor | null = null;
    let escala = ESCALA_INICIAL;
    let consultas = 0;
    let resultados = 0;
    let impactosVistos = 0;
    let sinSuperficie = false;
    let ultimaPose = performance.now();                                                          
    let ultimoImpacto: XRRigidTransform | null = null;                                                       
    let impactoHorizontal = false;

    const estado = (): EstadoAR => {
      raiz.updateMatrixWorld(true);
      const p = grupo.getWorldPosition(new THREE.Vector3());
      return {
        ...caps,
        fase,
        anclado: ancla !== null,
        escala,
        giroGrados: ((aGrados(grupo.rotation.y) % 360) + 360) % 360,
        posicion: { x: p.x, y: p.y, z: p.z },
        consultas,
        resultados,
        impactos: impactosVistos,
        sinSuperficie,
      };
    };
    const avisar = () => opciones.alCambiar(estado());

                                                                                                   
    raiz.matrixAutoUpdate = false;
    grupo.position.set(0, MITAD * escala, 0);                                  
    grupo.scale.setScalar(escala);
    grupo.rotation.set(0, 0, 0);

                                                                                       
    const reticula = new THREE.Mesh(
      new THREE.RingGeometry(0.1, 0.13, 40).rotateX(-Math.PI / 2),                                       
      new THREE.MeshBasicMaterial({ color: 0x4ade80 })
    );
    reticula.matrixAutoUpdate = false;                                       
    reticula.visible = false;
    escena.add(reticula);

    quitarObjetoAR = () => {
      turno++;
      try { ancla?.delete(); } catch {                                        }
      ancla = null;
      raiz.visible = false;
      fase = caps.hitTest ? "buscando" : "colocado";
      if (!caps.hitTest) raiz.matrix.makeTranslation(0, -0.5, -1.5);
      avisar();
    };

                                                                                                  
    if (fase === "colocado") {
      raiz.matrix.makeTranslation(0, -0.5, -1.5);
    } else {
      raiz.visible = false;                                                      
    }

                                                                        
    let fuente: XRHitTestSource | null = null;
    if (caps.hitTest) {
      try {
        const espacioViewer = await sesion.requestReferenceSpace("viewer");
        try {
                                                                                                        
                                                                                                       
          fuente = (await sesion.requestHitTestSource?.({ space: espacioViewer, entityTypes: ["plane", "point"] })) ?? null;
        } catch {
          fuente = (await sesion.requestHitTestSource?.({ space: espacioViewer })) ?? null;                                  
        }
      } catch {
        fuente = null;
      }
      if (!fuente) {
        caps.hitTest = false;                                        
        fase = "colocado";
        raiz.visible = true;
        raiz.matrix.makeTranslation(0, -0.5, -1.5);
      }
    }

                             
    let turno = 0;                                                                  
    async function colocar(frame: XRFrame) {
      const referencia = renderer.xr.getReferenceSpace();
      if (!referencia) return;
      const mio = ++turno;
      let impacto: XRRigidTransform | null = null;
      const hayImpacto = fuente !== null && reticula.visible && ultimoImpacto !== null && impactoHorizontal;
      if (fuente && !hayImpacto && !sinSuperficie) return;                                                        
      if (hayImpacto) {
        impacto = ultimoImpacto;
        raiz.matrix.copy(reticula.matrix);                                          
      } else {
                                                                                                              
        const posicion = new THREE.Vector3().setFromMatrixPosition(camara.matrixWorld);
        const delante = camara.getWorldDirection(new THREE.Vector3()).setY(0).normalize();
        posicion.addScaledVector(delante, 1.5);
        posicion.y -= 0.5;
        raiz.matrix.makeTranslation(posicion.x, posicion.y, posicion.z);
      }
      grupo.position.set(0, MITAD * escala, 0);                                         
      raiz.visible = true;
      fase = "colocado";
                                                                                         
      ancla?.delete();                                                      
      ancla = null;
      avisar();
      if (impacto && caps.anclas) {
        try {
          const nueva = await frame.createAnchor!(impacto, referencia);
          if (mio !== turno || !sesionAR) nueva.delete();                                                  
          else ancla = nueva;
        } catch {
          ancla = null;                                                                           
        }
        avisar();
      }
    }

                                                                 
    const rayo = new THREE.Raycaster();
    const plano = new THREE.Plane();
    const desfase = new THREE.Vector2();
    const tmp = new THREE.Vector3();
    function mover(clientX: number, clientY: number, primero: boolean) {
      if (fase !== "colocado") return;
                                                                                
      rayo.setFromCamera(new THREE.Vector2((clientX / window.innerWidth) * 2 - 1, -(clientY / window.innerHeight) * 2 + 1), camara);
      raiz.updateMatrixWorld(true);
      const normal = new THREE.Vector3(0, 1, 0).transformDirection(raiz.matrixWorld);
      plano.setFromNormalAndCoplanarPoint(normal, tmp.setFromMatrixPosition(raiz.matrixWorld));
      const punto = rayo.ray.intersectPlane(plano, new THREE.Vector3());
      if (!punto) return;                                                   
      const local = raiz.worldToLocal(punto);
                                                                                                            
      if (primero) desfase.set(grupo.position.x - local.x, grupo.position.z - local.z);
      grupo.position.x = local.x + desfase.x;
      grupo.position.z = local.z + desfase.y;
      avisar();
    }
    const gestos = crearGestos(opciones.overlay, {
      alMover: mover,
      alGirar(rad) {
        if (fase !== "colocado") return;
        grupo.rotation.y += rad;
        avisar();
      },
      alEscalar(factor) {
        if (fase !== "colocado") return;
        escala = Math.min(ESCALA_MAX, Math.max(ESCALA_MIN, escala * factor));
        grupo.scale.setScalar(escala);
        grupo.position.y = MITAD * escala;                         
        avisar();
      },
    });

    sesion.addEventListener("select", (ev) => {
      if (gestos.huboGesto()) return;                                                   
      void colocar((ev as XRInputSourceEvent).frame);
    });

                                     
    let cuadro = 0;                                                                     
    let sinImpacto = 0;                                     
    renderer.setAnimationLoop((_t, frame) => {
      const referencia = renderer.xr.getReferenceSpace();
      if (frame && referencia) {
        if (fuente && cuadro++ % CADA_CUANTOS_FOTOGRAMAS === 0) {
          const impactos = frame.getHitTestResults(fuente);
          const pose = impactos.length ? impactos[0].getPose(referencia) : null;
          consultas++;
          if (impactos.length) resultados++;
          if (pose) impactosVistos++;
          if (consultas % 30 === 0) avisar();                                                                        
          if (pose) {
            sinImpacto = 0;
            sinSuperficie = false;
            ultimaPose = performance.now();
            reticula.visible = true;
            reticula.matrix.fromArray(pose.transform.matrix);
            const matriz = pose.transform.matrix;
            impactoHorizontal = Math.abs(matriz[5]) > 0.8;
            (reticula.material as THREE.MeshBasicMaterial).color.setHex(impactoHorizontal ? 0x4ade80 : 0xf59e0b);
            ultimoImpacto = pose.transform;
            if (fase === "buscando" && impactoHorizontal) {
              fase = "listo";
              avisar();
            } else if (fase === "listo" && !impactoHorizontal) {
              fase = "buscando";
              avisar();
            }
          } else if (++sinImpacto >= CONSULTAS_SIN_IMPACTO) {
                                                                                                           
            reticula.visible = false;
            ultimoImpacto = null;
            if (fase === "listo") {
              fase = "buscando";
              avisar();
            }
          }
          if (!pose && fase === "buscando" && !sinSuperficie && performance.now() - ultimaPose > MS_HASTA_PLAN_B) {
            sinSuperficie = true;                                                 
            avisar();
          }
        }
                                                                                        
        if (ancla && frame.trackedAnchors?.has(ancla)) {
          const poseAncla = frame.getPose(ancla.anchorSpace, referencia);
          if (poseAncla) raiz.matrix.fromArray(poseAncla.transform.matrix);
        }
      }
      renderer.render(escena, camara);
    });

    anotar("activa");
    sesion.addEventListener(
      "end",
      () => {
                                                                                                 
        anotar("fin-1-bucle");
        renderer.setAnimationLoop(null);
        quitarObjetoAR = () => {};
        renderer.xr.enabled = false;
        sesionAR = null;
        gestos.destruir();
        anotar("fin-2-fuente");
        try { fuente?.cancel(); } catch {                            }
        anotar("fin-3-ancla");
        try { ancla?.delete(); } catch {            }
        anotar("fin-4-escena");
        escena.remove(reticula);
        reticula.geometry.dispose();
        (reticula.material as THREE.Material).dispose();
        escena.background = fondoPrevio;
        controles.enabled = !porSensores;
        raiz.matrixAutoUpdate = true;
        raiz.matrix.identity();
        raiz.visible = true;
        grupo.position.set(0, 0, 0);
        grupo.scale.setScalar(ESCALA_VISTA);
        if (modelo) modelo.raiz.position.y = -centroY;
        grupo.rotation.set(0, 0, 0);
        opciones.alTerminar();
                                                                                                    
                                                                                                 
        anotar("fin-5-espera");
        window.setTimeout(() => {
          anotar("fin-6-tamano");
          ajustarTamano();                                           
          anotar("fin-7-bucle");
          sucio = true;                                                               
          bucle();                                          
          anotar(PASO_FINAL);
        }, 250);
      },
      { once: true }
    );

    avisar();
    return estado();
  }

                                                                   
  const rayoToque = new THREE.Raycaster();
  let avisarToque: ((id: string | null) => void) | null = null;
  let inicioToque: { x: number; y: number; t: number } | null = null;
  const lienzo = renderer.domElement;
  const alPulsar = (ev: PointerEvent) => {
    inicioToque = { x: ev.clientX, y: ev.clientY, t: performance.now() };
  };
  const alSoltar = (ev: PointerEvent) => {
    const ini = inicioToque;
    inicioToque = null;
                                                                                    
    if (!ini || sesionAR || !modelo) return;
    if (Math.hypot(ev.clientX - ini.x, ev.clientY - ini.y) > 8 || performance.now() - ini.t > 600) return;
    const caja = lienzo.getBoundingClientRect();
    rayoToque.setFromCamera(new THREE.Vector2(((ev.clientX - caja.left) / caja.width) * 2 - 1, -((ev.clientY - caja.top) / caja.height) * 2 + 1), camara);
    const impactos = rayoToque.intersectObjects([...modelo.piezas.values()], false);
    const id = (impactos[0]?.object.userData.piezaId as string | undefined) ?? null;
    seleccionar(id === piezaElegida ? null : id);                                           
    avisarToque?.(piezaElegida);
  };
  lienzo.addEventListener("pointerdown", alPulsar);
  lienzo.addEventListener("pointerup", alSoltar);

  function seleccionar(id: string | null) {
    piezaElegida = id;
    modelo?.resaltar(id);
    sucio = true;
  }

  function mostrarModelo(def: DefinicionModelo) {
    if (modelo) {
      grupo.remove(modelo.raiz);
      modelo.destruir();
    }
    modelo = construirModelo(def);
    sucio = true;
    grupo.add(modelo.raiz);
    centroY = modelo.centroY;
    piezaElegida = null;
    if (!sesionAR) {
      modelo.raiz.position.y = -centroY;                                                                                        
      grupo.rotation.set(0, 0, 0);
      const elev = ((def.elevacion ?? 30) * Math.PI) / 180;
      const dist = DISTANCIA_VISTA * (def.distancia ?? 1);
      camara.position.set(0, dist * Math.sin(elev), dist * Math.cos(elev));
      controles.target.set(0, 0, 0);
      controles.update();
    }
  }

  const aGrados = (r: number) => Math.round((r * 180) / Math.PI);
  return {
    mostrarModelo,
    seleccionar,
    alTocarPieza(avisar) {
      avisarToque = avisar;
    },
    rotarHacia(x, y) {
      objetivoX = x;
      objetivoY = y;
    },
    controlPorSensores(activo) {
      porSensores = activo;
      sucio = true;
      controles.enabled = !activo;
      if (!activo) grupo.rotation.set(0, 0, 0);
    },
    rotacionActualGrados() {
      return { x: aGrados(grupo.rotation.x), y: aGrados(grupo.rotation.y) };
    },
    fondoTransparente(activo) {
      escena.background = activo ? null : COLOR_FONDO;
      sucio = true;
    },
    entrarEnAR,
    quitarEnAR: () => quitarObjetoAR(),
    enAR() {
      return sesionAR !== null;
    },
    destruir() {
      cancelAnimationFrame(animacion);
      void sesionAR?.end();
      window.removeEventListener("resize", ajustarTamano);
      controles.dispose();
      lienzo.removeEventListener("pointerdown", alPulsar);
      lienzo.removeEventListener("pointerup", alSoltar);
      modelo?.destruir();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
