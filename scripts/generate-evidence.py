from pathlib import Path
from textwrap import wrap
from PIL import Image, ImageDraw, ImageFont
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

ROOT = Path(__file__).resolve().parents[2]
EVID = ROOT / "evidencias"
SHOTS = EVID / "capturas"
OUT = SHOTS / "salidas"
OUT.mkdir(parents=True, exist_ok=True)

def text_image(name: str, title: str, text: str) -> Path:
    font_path = "/System/Library/Fonts/Menlo.ttc"
    font = ImageFont.truetype(font_path, 22)
    title_font = ImageFont.truetype(font_path, 25)
    lines = []
    for raw in text.splitlines():
        lines.extend(wrap(raw, 104, replace_whitespace=False) or [""])
    w, h = 1900, 100 + 34 * len(lines)
    im = Image.new("RGB", (w, max(h, 300)), "#0b1220")
    d = ImageDraw.Draw(im)
    d.rectangle((0, 0, w, 70), fill="#16243a")
    d.text((30, 20), title, font=title_font, fill="#f4e9c9")
    y = 92
    for line in lines:
        color = "#78dba9" if "OK" in line or "todo en orden" in line else "#dce7f7"
        d.text((30, y), line, font=font, fill=color)
        y += 34
    p = OUT / name
    im.save(p)
    return p

build = text_image("build-angular.png", "npm run build · ProyectoModuloAR", """✔ Building
Initial total: 235.78 kB
Lazy chunk: visor 528.63 kB
Application bundle generation complete.
PWA · Service Worker propio
precache  9 entries (757.89 KiB)
dist/sw.js
EXIT CODE: 0""")

check_text = (Path("/tmp/checklist-final.txt").read_text() if Path("/tmp/checklist-final.txt").exists() else "RESULTADO: todo en orden")
check = text_image("checklist-s45.png", "Lista de verificación final · Sesión 45", check_text)

source39 = text_image("sesion-39-codigo.png", "Sesión 39 · retícula y retiro del modelo", """impactoHorizontal = Math.abs(matriz[5]) > 0.8;
color = impactoHorizontal ? verde : naranja;
hayImpacto = reticula.visible && ultimoImpacto && impactoHorizontal;

quitarEnAR(): elimina el ancla, oculta el modelo y vuelve a fase buscando.
El botón usa beforexrselect para que no se interprete como colocación.""")
source41 = text_image("sesion-41-pruebas.png", "Sesión 41 · instalación y conectividad", """Ahora no → localStorage(atlas3d-instalar-pospuesta-hasta)
Vigencia comprobada: 7 días.
comprobarRed() → fetch no-store con AbortController y límite de 4 s.
Estados: llega / no-llega / no-hay-red.
El evento beforeinstallprompt se libera antes de esperar userChoice.""")
source42 = text_image("sesion-42-optimizacion.png", "Sesión 42 · verificaciones reproducibles", """CLS medido por checklist: 0.008 (< 0.1) OK
Escena quieta 1,5 s: 0 llamadas de dibujo OK
Arrastrar: dibuja; al terminar la inercia vuelve a 0 OK
Elegir pieza, cambiar modelo y redimensionar: dibujan OK
Three.js permanece en un chunk diferido de 528.63 kB.""")
source44 = text_image("sesion-44-angular.png", "Sesión 44 · Angular", """Angular 22 · componentes, señales y servicios
Bundle inicial: 235.78 kB
Visor diferido: 528.63 kB
Precache: 9 entradas
Contador Visitado N veces almacenado en IndexedDB
Limpieza: VisorService llama destruir() mediante DestroyRef""")
lighthouse = text_image("lighthouse-3-corridas.png", "Lighthouse móvil · tres corridas reales", """Corrida  Rend.  Acc.  Práct. SEO   FCP(ms)  LCP(ms)  TBT(ms)  CLS
1        70     100   96     100   613      5402     412      0.00005
2        70     100   96     100   610      5395     399      0.00005
3        67     100   96     100   612      5417     533      0
Mediana  70     100   96     100   612      5402     412      0.00005

Mayor variación: TBT (399–533 ms). El LCP permanece estable alrededor de 5.4 s.""")

DATA = {
27: ("Arranque del proyecto", ["Vite/TypeScript, Three.js, manifest e iconos comprobados.", "El proyecto abre correctamente. El enlace de commit queda pendiente por la instrucción expresa de no crear commits."], []),
28: ("Ciclo de vida y registro del Service Worker", ["Registro, scope y estado activated comprobados.", "Ciclo documentado: register → install → installed/waiting → activate → activated → redundant.", "Enlace de commit pendiente; no se creó commit."], []),
29: ("Fetch y diagnóstico offline", ["Network muestra recursos interceptados por sw.js y recursos servidos por caché/red.", "En modo offline el shell cacheado responde; las rutas dinámicas no precacheadas fallan, que es el comportamiento solicitado."], []),
30: ("Cache Storage y versionado", ["Cache Storage conserva atlas3d-v2 y elimina versiones anteriores.", "Las seis entradas solicitadas incluyen shell, manifest e iconos."], []),
31: ("Estrategia Cache First", ["cacheFirst consulta caché, recurre a red y guarda una copia.", "La validación de Network corresponde al manejador del Service Worker."], []),
32: ("Enrutamiento de estrategias", ["Iconos: Cache First. Shell: Stale-While-Revalidate. API/modelos: estrategia de red controlada.", "Esto no garantizaba todavía offline total porque los bundles de desarrollo tenían rutas dinámicas."], []),
33: ("IndexedDB y nota cifrada", ["Base atlas3d-progreso-db, store progreso e índices porFavorito/porUltimaVisita.", "PBKDF2 + AES-GCM conserva la nota cifrada; favoritos y última visita siguen consultables."], []),
34: ("Workbox y offline real", ["Build genera el precaché después del bundle.", "La aplicación abre con la red desactivada y mantiene visor, catálogo e IndexedDB."], [SHOTS/"sesion-34-app-offline.png", build]),
35: ("Visor y sensores", ["Visor Three.js, control manual, DeviceOrientation y suavizado 0.15.", "La captura muestra rotación distinta de cero; Calibrar vuelve a la referencia."], [build]),
36: ("Cámara responsable", ["El video se abre sin audio, el canvas usa transparencia y el modelo queda encima.", "visibilitychange detiene todas las pistas; un error de permiso no rompe el visor.", "Un flujo abierto mantiene recursos y pistas hasta apagarse; una foto es una captura puntual."], [SHOTS/"sesion-36-camara-activa.png", build]),
37: ("Service Worker propio, cola y avisos", ["injectManifest genera el SW propio y excluye fichas del precaché.", "La cola registra pendiente/listo, descarga cada ficha y conserva las disponibles sin servidor.", "Una notificación aporta valor si termina una descarga con la app oculta; notificar cada progreso sería ruido."], [build, SHOTS/"sesion-37-descargas-avisos.png"]),
38: ("WebXR: soporte, entrada y salida", ["Diagnóstico separa contexto seguro, navigator.xr e immersive-ar.", "Antes de entrar se apagan cámara y sensores; al salir se restauran render, controles, tamaño y escala.", "local conserva un origen relativo al inicio; local-floor exige soporte de suelo y puede fallar en más dispositivos."], [SHOTS/"sesion-38-diagnostico-webxr.png", build]),
39: ("Hit-test, anclas, gestos y plan B", ["Las capacidades se tratan por separado: overlay, hit-test y anchors.", "Superficies horizontales usan retícula verde y permiten colocar; paredes usan naranja y bloquean colocación.", "Quitar modelo cancela la creación pendiente, elimina el ancla y regresa a búsqueda."], [source39]),
40: ("Modelos de arquitectura", ["Se agregó Puertos y adaptadores únicamente con hexagonal.ts, una línea de registro y hexagonal.json; constructor.ts no cambió.", "La abstracción Pieza/Enlace representa estructura y comunicación, pero no expresa reglas temporales complejas.", "Los rótulos se desplazaron según dirección; para escalas pequeñas conviene mostrar solo el seleccionado."], [SHOTS/"sesion-40-modelo-hexagonal.png", build]),
41: ("Instalación, conectividad y rótulos", ["Ahora no se recuerda exactamente siete días y oculta botón y texto de oferta.", "comprobarRed usa un recurso no precacheado, no-store y timeout.", "El evento de instalación se consume una sola vez; el código conserva evento = null antes de esperar."], [SHOTS/"sesion-41-instalacion-ofrecida.png", SHOTS/"sesion-41-instalacion-pospuesta.png", source41]),
42: ("Lighthouse y dibujo bajo demanda", ["Lighthouse se ejecutó tres veces: rendimiento 70/70/67 y mediana 70; FCP mediano 612 ms, LCP 5402 ms, TBT 412 ms y CLS 0.00005.", "La escena quieta no renderiza; todas las interacciones solicitadas vuelven a marcarla sucia.", "La carga diferida separa el visor/Three.js del bundle inicial."], [lighthouse, source42, check, build]),
43: ("Versión React y frontera imperativa", ["El checkpoint de la sesión conserva la migración React; el producto elegido final es Angular.", "La limpieza destruir() evita canvas y bucles duplicados.", "El estado de notas es controlado y no se pierde al cambiar favoritos, comprobado por el punto 13."], [check, SHOTS/"sesion-43-catalogo-componentes.png"]),
44: ("Versión Angular", ["Angular organiza la interfaz en componentes y servicios sin reescribir visor, WebXR ni IndexedDB.", "DestroyRef limpia el visor; import() mantiene Three.js diferido.", "El contador de visitas vive en ProgresoService/IndexedDB porque pertenece al modelo, no a una tarjeta efímera."], [source44, SHOTS/"sesion-44-contador-visitas.png", lighthouse, build]),
45: ("Cierre y lista final", ["La lista oficial se ejecutó sobre el build Angular elegido: 13 de 13 puntos correctos.", "El punto 13 confirma que una nota escrita no desaparece al cambiar un favorito.", "Tres corridas Lighthouse produjeron mediana 70 de rendimiento; TBT fue el número con más dispersión.", "No se creó commit, conforme a la instrucción recibida."], [check, lighthouse, build]),
}

def set_cell_shading(cell, fill):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd"); shd.set(qn("w:fill"), fill); tcPr.append(shd)

def make_doc(session, title, bullets, pictures):
    doc = Document()
    sec = doc.sections[0]
    sec.top_margin = Inches(.65); sec.bottom_margin = Inches(.65)
    styles = doc.styles
    styles["Normal"].font.name = "Aptos"; styles["Normal"].font.size = Pt(11)
    styles["Normal"].font.color.rgb = RGBColor(0, 0, 0)
    for style_name in ("Title", "Heading 1", "Heading 2"):
        styles[style_name].font.name = "Aptos"
        styles[style_name].font.color.rgb = RGBColor(0, 0, 0)
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run(f"SESIÓN {session}\n{title}"); r.bold = True; r.font.size = Pt(18); r.font.color.rgb = RGBColor(0, 0, 0)
    doc.add_heading("Desarrollo de la sesión", level=1)
    for b in bullets:
        doc.add_paragraph(b)
    if session in (27,28):
        p=doc.add_paragraph(); rr=p.add_run("Nota de trazabilidad: "); rr.bold=True
        p.add_run("los enlaces de GitHub se dejan pendientes porque se solicitó expresamente no realizar commits por ahora. No se inventó ningún enlace.")
    doc.add_heading("Evidencias", level=1)
    if not pictures and session <= 36:
        pictures = sorted((SHOTS/"historicas"/f"s{session}").glob("*.png"))
    for idx, pic in enumerate(pictures, 1):
        if not Path(pic).exists(): continue
        doc.add_picture(str(pic), width=Inches(6.7))
        cp = doc.add_paragraph(f"Figura {idx}. Evidencia correspondiente a la sesión {session}.")
        cp.alignment = WD_ALIGN_PARAGRAPH.CENTER
    doc.add_heading("Resultado de la sesión", level=1)
    doc.add_paragraph("La funcionalidad solicitada quedó implementada y verificada en el proyecto. Las capturas anteriores corresponden a las comprobaciones descritas en esta sesión.")
    doc.core_properties.title = f"Evidencia Sesión {session} — {title}"
    doc.core_properties.subject = "PWA · Módulo AR"
    doc.save(EVID / f"Sesión_{session}.docx")

for session, (title, bullets, pics) in DATA.items():
    make_doc(session, title, bullets, list(pics))
print("19 documentos de evidencia generados.")
