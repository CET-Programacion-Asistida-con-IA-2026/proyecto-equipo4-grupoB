
/* ============ PREFS ============ */
function savePrefs(key, val) { try { localStorage.setItem('aux_'+key, JSON.stringify(val)); } catch(e){} }
function getPrefs(key, def) { try { const v=localStorage.getItem('aux_'+key); return v!==null?JSON.parse(v):def; } catch(e){return def;} }

/* ============ PERFILES (múltiples, simulado en este dispositivo) ============
   Permite tener más de un perfil guardado a la vez (por ejemplo, el tuyo
   y el de tu mascota) y ver/editar cada uno por separado. getUser()/saveUser()
   siguen funcionando igual que antes: operan sobre el perfil "activo". */
function getProfiles() { return getPrefs('profiles_v1', []); }
function saveProfiles(list) { savePrefs('profiles_v1', list); }
function getActiveProfileId() { return getPrefs('active_profile_id', null); }
function setActiveProfileId(id) { savePrefs('active_profile_id', id); }

function _migrarPerfilLegacy() {
  var legacy = getPrefs('user_v2', null);
  if (legacy && !legacy.id) {
    legacy.id = 'p1'; legacy.tipo = legacy.tipo || 'persona';
    saveProfiles([legacy]);
    setActiveProfileId('p1');
    return legacy;
  }
  return null;
}

function getUser() {
  var profiles = getProfiles();
  if (profiles.length === 0) { return _migrarPerfilLegacy(); }
  var activeId = getActiveProfileId() || profiles[0].id;
  return profiles.find(function(p){ return p.id === activeId; }) || profiles[0];
}
function saveUser(u) {
  if (!u) return;
  var profiles = getProfiles();
  if (profiles.length === 0) { _migrarPerfilLegacy(); profiles = getProfiles(); }
  if (!u.id) u.id = getActiveProfileId() || ('p'+Date.now()+'_'+Math.random().toString(36).slice(2,8));
  if (!u.tipo) u.tipo = 'persona';
  var idx = profiles.findIndex(function(p){ return p.id === u.id; });
  if (idx === -1) profiles.push(u); else profiles[idx] = u;
  saveProfiles(profiles);
  setActiveProfileId(u.id);
  savePrefs('user_v2', u); // compatibilidad hacia atrás
  // El filtro de edad ahora se deriva en vivo del perfil activo (ver getEdadFiltro),
  // así que no hace falta guardar nada acá aparte del perfil mismo.
}
function clearUser() {
  // "Olvidar" el perfil activo: lo saca de la lista sin tocar los demás perfiles guardados
  var profiles = getProfiles();
  var activeId = getActiveProfileId();
  var restantes = profiles.filter(function(p){ return p.id !== activeId; });
  saveProfiles(restantes);
  setActiveProfileId(restantes.length ? restantes[0].id : null);
  try{localStorage.removeItem('aux_user_v2');}catch(e){}
}
function crearPerfilNuevo(tipo) {
  var id = 'p'+Date.now()+'_'+Math.random().toString(36).slice(2,8);
  var nuevo = { id: id, tipo: tipo };
  var profiles = getProfiles();
  profiles.push(nuevo);
  saveProfiles(profiles);
  setActiveProfileId(id);
  return nuevo;
}
function eliminarPerfil(id) {
  var profiles = getProfiles().filter(function(p){ return p.id !== id; });
  saveProfiles(profiles);
  if (getActiveProfileId() === id) {
    setActiveProfileId(profiles.length ? profiles[0].id : null);
  }
}

/* ============ FILTRO DE EDAD (rango) ============
   Se alimenta de dos fuentes: la pregunta rápida que hace Auxi al inicio
   de la charla ("¿cuántos años tenés?") o la edad exacta guardada en el
   perfil completo. Sirve para resaltar/organizar recursos por etapa de vida
   en las páginas de categorías, sin necesidad de crear un perfil completo. */
var EDAD_RANGOS = [
  {key:'ninez', label:'Niñez (0 a 12 años)'},
  {key:'adolescencia', label:'Adolescencia (13 a 17 años)'},
  {key:'adultos', label:'Adultos (18 a 49 años)'},
  {key:'mayores', label:'Mayores de 50 años'},
];
function edadNumARango(edad) {
  if (edad <= 12) return 'ninez';
  if (edad <= 17) return 'adolescencia';
  if (edad <= 49) return 'adultos';
  return 'mayores';
}
function edadRangoLabel(key) {
  var r = EDAD_RANGOS.find(function(r){ return r.key===key; });
  return r ? r.label : '';
}
// setEdadFiltro: usado por la charla rápida con Auxi ANTES de que exista un perfil guardado
// (queda como respaldo de sesión, de menor prioridad que un perfil real)
function setEdadFiltro(rango) { savePrefs('edad_filtro_sesion', rango); }
// Zona/ubicación: igual que la edad, se recuerda a nivel dispositivo aunque
// todavía no exista un perfil guardado, para no volver a preguntarla en cada charla nueva.
function setZonaSesion(zona) { savePrefs('zona_sesion', zona); }
function getZonaSesion() { return getPrefs('zona_sesion', null); }
// setEdadFiltroManual: el usuario elige explícitamente un chip — tiene la prioridad más alta
// hasta que la cambie de nuevo o la limpie con "Todas las edades"
function setEdadFiltroManual(rango) { savePrefs('edad_filtro_manual', rango); }
function getEdadFiltro() {
  // 1) Elección manual explícita (chips) — siempre gana mientras esté activa
  var manual = getPrefs('edad_filtro_manual', null);
  if (manual === 'todas') return null;
  if (manual) return manual;
  // 2) El perfil actualmente activo — automático, cambia solo si cambiás de perfil
  var u = getUser();
  if (u && u.tipo !== 'mascota' && u.edad !== undefined && u.edad !== '' && !isNaN(parseInt(u.edad))) {
    return edadNumARango(parseInt(u.edad));
  }
  // 3) Lo que se le contó a Auxi en esta sesión, si todavía no hay perfil guardado
  var sesion = getPrefs('edad_filtro_sesion', null);
  if (sesion === 'todas') return null;
  if (sesion) return sesion;
  return null;
}
// Chips para elegir/cambiar el rango de edad manualmente en cualquier categoría
function edadFiltroChips() {
  var actual = getEdadFiltro();
  var esManual = !!getPrefs('edad_filtro_manual', null) && getPrefs('edad_filtro_manual', null) !== 'todas';
  var wrap = h('div',{class:'edad-chips'});
  function reFiltrarSinSaltar() {
    // Mantiene la posición de lectura: no queremos que la página "salte" arriba
    // al tocar un chip, solo se recalculan las tarjetas destacadas.
    var scrollY = window.scrollY;
    renderRoute();
    window.scrollTo(0, scrollY);
  }
  var todosChip = h('button',{class:'edad-chip'+(!actual?' edad-chip--active':''),onclick:function(){
    setEdadFiltroManual('todas'); reFiltrarSinSaltar();
  }},'Todas las edades');
  wrap.appendChild(todosChip);
  EDAD_RANGOS.forEach(function(r){
    var btn = h('button',{class:'edad-chip'+(actual===r.key?' edad-chip--active':''),onclick:function(){
      setEdadFiltroManual(r.key); reFiltrarSinSaltar();
    }},r.label);
    wrap.appendChild(btn);
  });
  if (!esManual && actual) {
    var u2 = getUser();
    var origen = (u2 && u2.tipo!=='mascota' && u2.edad) ? 'según tu perfil ('+u2.edad+' años)' : 'según lo que le contaste a Auxi';
    var nota = h('span',{style:'width:100%;font-size:0.72rem;color:var(--gris-medio);margin-top:2px;'}, 'Filtro automático '+origen+' — tocá un chip para cambiarlo manualmente.');
    wrap.appendChild(nota);
  }
  return wrap;
}

/* ============ ROUTER ============ */
function navigate(path) {
  window.location.hash = path;
  savePrefs('lastPath', path);
}
function h(tag, attrs, children) {
  const el = document.createElement(tag);
  if (attrs) Object.entries(attrs).forEach(([k,v]) => {
    if (k === 'onclick' && typeof v === 'function') el.addEventListener('click', v);
    else if (k === 'onmouseover' && typeof v === 'function') el.addEventListener('mouseover', v);
    else if (k === 'onmouseout' && typeof v === 'function') el.addEventListener('mouseout', v);
    else if (k === 'onclick' && typeof v === 'string') el.setAttribute('onclick', v);
    else if (k === 'class') el.className = v;
    else if (k === 'style') el.setAttribute('style', v);
    else if (k === 'for') el.setAttribute('for', v);
    else if (k === 'tabindex') el.setAttribute('tabindex', v);
    else if (k.startsWith('aria-') || k.startsWith('data-')) el.setAttribute(k, v);
    else el[k] = v;
  });
  if (children) {
    (Array.isArray(children)?children:[children]).forEach(c => {
      if (!c) return;
      el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
  }
  return el;
}
function renderInto(container, node) {
  if (!container || !node) return;
  container.innerHTML = '';
  container.appendChild(node);
}

const PAGE_TITLES = {
  '/': 'AuxiliAR — Recursos de salud Argentina',
  '/categorias': 'Categorías — AUXILIAR',
  '/categorias/salud-fisica': 'Salud Física — AUXILIAR',
  '/categorias/salud-mental': 'Salud Mental — AUXILIAR',
  '/categorias/esi': 'ESI — AUXILIAR',
  '/categorias/primeros-auxilios': 'Primeros Auxilios — AUXILIAR',
  '/categorias/emergencias': 'Emergencias — AUXILIAR',
  '/categorias/animales': 'Mascotas — AUXILIAR',
  '/categorias/donaciones': 'Donaciones — AUXILIAR',
  '/sumate': 'Sumate a Ayudar — AUXILIAR',
  '/centros': 'Centros de Atención — AUXILIAR',
  '/sobre-auxiliar': 'Sobre AUXILIAR',
  '/recursos-utiles': 'Recursos útiles — AUXILIAR',
  '/mi-salud': 'Mi Salud — AUXILIAR',
};
const CATEGORY_VIEWS = {
  'salud-fisica': viewSaludFisica,
  'salud-mental': viewSaludMental,
  'esi': viewESI,
  'primeros-auxilios': viewPrimerosAuxilios,
  'emergencias': viewEmergencias,
  'animales': viewAnimales,
  'donaciones': viewDonaciones,
};

function renderRoute() {
  const outlet = document.getElementById('app-outlet');
  const path = window.location.hash.replace(/^#/,'') || '/';
  let node;
  if (path === '/') node = viewInicio();
  else if (path === '/categorias') node = viewCategorias();
  else if (path === '/sumate') node = viewSumate('busca');
  else if (path === '/sumate/ofrece') node = viewSumate('ofrece');
  else if (path === '/centros') node = viewCentros();
  else if (path === '/sobre-auxiliar') node = viewSobre();
  else if (path === '/recursos-utiles') node = viewRecursosUtiles();
  else if (path === '/mi-salud') node = viewMiSalud();
  else if (path.startsWith('/categorias/')) {
    const parts = path.split('/');
    const slug = parts[2];
    const subSection = parts[3];
    const fn = CATEGORY_VIEWS[slug];
    node = fn ? fn() : render404();
    if (subSection) setTimeout(()=>{
      const el = document.getElementById('sec-'+subSection);
      if (el) el.scrollIntoView({behavior:'smooth'});
    },100);
  } else node = render404();
  renderInto(outlet, node);
  document.title = PAGE_TITLES[path] || 'AUXILIAR';
  window.scrollTo({top:0,behavior:'auto'});
  // sync a11y panel active states
  syncA11yPanel();
}

function render404() {
  return h('div',{class:'main-content view',style:'text-align:center;padding-top:3rem;'},[
    h('p',{style:'font-size:2.5rem;'},'🔍'),
    h('h1',{},'Página no encontrada'),
    h('p',{},'La sección que buscás no existe.'),
    h('button',{class:'btn btn--primary',onclick:()=>navigate('/')},'Volver al inicio'),
  ]);
}

/* ============ AUXI — ONBOARDING ============ */
// Auxi — expresiones faciales
// Ojos: círculo sólido r=5, brillo blanco pequeño (diseño original)
// Cejas: basadas en emojis específicos por paso
const AUXI_EXPR = {
  // 😊🙂 — bienvenida: sonrisa amplia, cejas suavemente arqueadas
  happy: {
    eyeColor: '#7c2d2d',
    chestColor: 'rgba(255,255,255,0.35)',
    browColor: '#7c2d2d',
    browL: 'M40 40 Q47 35 54 40',   // arco suave hacia arriba
    browR: 'M66 40 Q73 35 80 40',
    mouth: 'M47 58 Q60 70 73 58',   // sonrisa amplia y clara
    mouthW: '3',
    mouthColor: '#7c2d2d',
  },
  // 🥺🙂‍↕️ — orientación: cejas 🥺 (levantadas al centro, juntas),
  // ojos ligeramente más grandes, sonrisa suave
  caring: {
    eyeColor: '#7c2d2d',
    chestColor: '#93c5fd',
    browColor: '#7c2d2d',
    // 🥺: ceja izquierda va ARRIBA en el lado derecho (hacia el centro)
    browL: 'M40 42 Q46 33 54 38',
    browR: 'M66 38 Q74 33 80 42',
    mouth: 'M50 60 Q60 67 70 60',   // sonrisa suave
    mouthW: '2.5',
    mouthColor: '#7c2d2d',
  },
  // 🫡🥺 — urgente: cejas 🥺 más pronunciadas + boca seria recta
  // Serio pero compasivo — "estoy acá, te escucho"
  alert: {
    eyeColor: '#1e40af',            // ojos azules — atención, no alarma
    chestColor: '#93c5fd',
    browColor: '#1e40af',
    // 🥺 pronunciado: cejas muy levantadas al centro
    browL: 'M39 43 Q45 31 54 37',
    browR: 'M66 37 Q75 31 81 43',
    mouth: 'M50 63 L70 63',         // boca recta — serio, presente
    mouthW: '2.5',
    mouthColor: '#1e40af',
    mline: true,
  },
  // pensando — cejas asimétricas
  thinking: {
    eyeColor: '#7c2d2d',
    chestColor: 'rgba(255,255,255,0.35)',
    browColor: '#7c2d2d',
    browL: 'M40 39 Q47 33 54 41',   // una más arriba
    browR: 'M66 41 Q73 35 80 39',   // la otra también pero distinta
    mouth: 'M50 62 Q60 59 70 62',
    mouthW: '2.5',
    mouthColor: '#7c2d2d',
  },
  // satisfecho — sonrisa amplia, cejas muy arqueadas
  satisfied: {
    eyeColor: '#15803d',
    chestColor: '#86efac',
    browColor: '#15803d',
    browL: 'M39 39 Q47 31 55 39',
    browR: 'M65 39 Q73 31 81 39',
    mouth: 'M45 62 Q60 78 75 62',
    mouthW: '3.5',
    mouthColor: '#15803d',
  },
};

function AUXI_SVG(expr) {
  var e = AUXI_EXPR[expr] || AUXI_EXPR.happy;
  var mouthSVG = e.mline
    ? '<line x1="50" y1="63" x2="70" y2="63" stroke="' + e.mouthColor + '" stroke-width="' + e.mouthW + '" stroke-linecap="round"/>'
    : '<path d="' + e.mouth + '" stroke="' + e.mouthColor + '" stroke-width="' + e.mouthW + '" fill="none" stroke-linecap="round"/>';
  return '<svg class="auxi-robot ' + expr + '" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">'
    // Antena
    + '<line x1="60" y1="8" x2="60" y2="22" stroke="#7c2d2d" stroke-width="2.5" stroke-linecap="round"/>'
    + '<circle cx="60" cy="6" r="4" fill="#7c2d2d"/>'
    // Cabeza
    + '<rect x="22" y="22" width="76" height="58" rx="24" fill="#fff" stroke="#e7e5e4" stroke-width="1.5"/>'
    + '<rect x="32" y="32" width="56" height="36" rx="14" fill="#fafaf9"/>'
    // Cejas — encima del área de pantalla
    + '<path d="' + e.browL + '" stroke="' + e.browColor + '" stroke-width="2.5" fill="none" stroke-linecap="round"/>'
    + '<path d="' + e.browR + '" stroke="' + e.browColor + '" stroke-width="2.5" fill="none" stroke-linecap="round"/>'
    // Ojos — diseño original: r=5, brillo blanco
    + '<circle cx="46" cy="50" r="5" fill="' + e.eyeColor + '"/>'
    + '<circle cx="74" cy="50" r="5" fill="' + e.eyeColor + '"/>'
    + '<circle cx="48" cy="48" r="1.5" fill="white" opacity="0.8"/>'
    + '<circle cx="76" cy="48" r="1.5" fill="white" opacity="0.8"/>'
    // Boca
    + mouthSVG
    // Cuerpo
    + '<rect x="32" y="84" width="56" height="28" rx="12" fill="#7c2d2d"/>'
    + '<circle cx="60" cy="98" r="5" fill="' + e.chestColor + '"/>'
    // Brazos
    + '<rect x="12" y="88" width="18" height="10" rx="5" fill="#e7e5e4"/>'
    + '<rect x="90" y="88" width="18" height="10" rx="5" fill="#e7e5e4"/>'
    + '</svg>';
}

let auxiState = { step: 'welcome', data: {}, expr: 'happy', history: [] };
let auxiSkipReset = false; // when true, viewInicio() won't overwrite an auxiState set right before navigate('/')

function setAuxiExpr(expr) { auxiState.expr = expr; }

function goToStep(step, expr) {
  auxiState.history.push({ step: auxiState.step, expr: auxiState.expr });
  auxiState.step = step;
  if (expr) auxiState.expr = expr;
  renderAuxi();
}
/* ============ SISTEMA INTERNO DE PRIORIDAD ============
   Puntúa la conversación combinando síntomas + contexto para decidir
   qué preguntar después y qué recurso priorizar. Es enteramente interno:
   el usuario nunca ve puntajes, categorías ni nada que se parezca a un
   diagnóstico — solo recibe la orientación y los recursos resultantes. */
function calcularPrioridad(data) {
  var score = { emergencia: 0, clinica: 0, crisisEmocional: 0, primerosAuxilios: 0 };
  var sintomas = data.sintomas || [];
  var zona = data.sint_zona || '';
  var tiene = function(s){ return sintomas.indexOf(s) !== -1; };
  var respiratorioOMareo = tiene('Dificultad para respirar') || tiene('Mareo');
  var anguustiaOAgitacion = tiene('Angustia') || tiene('Angustia o sensación de ahogo') || tiene('Nervios o agitación');
  var palpitaciones = tiene('Palpitaciones o el corazón acelerado');

  if (tiene('Dificultad para respirar') || tiene('Angustia o sensación de ahogo')) { score.emergencia += 2; score.clinica += 1; }
  if (tiene('Dolor') && zona === 'Pecho') { score.clinica += 2; score.emergencia += 1; }
  if (tiene('Presión') && zona === 'Pecho') { score.emergencia += 2; score.clinica += 1; }
  if (tiene('Mareo')) { score.clinica += 1; }
  if (tiene('Entumecimiento')) { score.clinica += 1; }
  if (tiene('Angustia')) { score.crisisEmocional += 2; }
  if (tiene('Tristeza profunda o llanto')) { score.crisisEmocional += 2; }
  if (tiene('Nervios o agitación')) { score.crisisEmocional += 1; }
  if (tiene('Pensamientos que no puedo parar')) { score.crisisEmocional += 1; }
  if (tiene('Sensación de que algo malo va a pasar')) { score.crisisEmocional += 1; }
  if (palpitaciones) { score.clinica += 1; }

  // Combinación de síntomas físicos — reconocer el patrón aunque nunca se
  // haya elegido "dolor en el pecho" como opción explícita.
  if ((tiene('Dolor') || tiene('Presión')) && respiratorioOMareo) {
    score.emergencia += 3;
  }
  // Ansiedad/agitación + palpitaciones + respiración acelerada: contemplar
  // tanto una crisis de angustia como una causa clínica, sin descartar ninguna.
  if (anguustiaOAgitacion && (palpitaciones || tiene('Dificultad para respirar'))) {
    score.crisisEmocional += 2;
    score.clinica += 2;
  }
  // Primeros auxilios: inicio súbito + zona extremidades + sin descripción clara
  if (tiene('No sé') && zona === 'Extremidades' && data.sint_cuando === 'Hace minutos') {
    score.primerosAuxilios += 2;
  }
  return score;
}
function prioridadDominante(score) {
  var max = null, maxVal = 0;
  Object.keys(score).forEach(function(k){
    if (score[k] > maxVal) { maxVal = score[k]; max = k; }
  });
  return max;
}

/* ============ OBRAS SOCIALES (simulación frontend) ============
   Sitios oficiales reales, usados solo para enlazar — AuxiliAR nunca
   accede a datos reales de afiliación; todo lo demás es simulado
   y guardado únicamente en este dispositivo. */
var OBRAS_SOCIALES = [
  {key:'osde', nombre:'OSDE', sitio:'https://www.osde.com.ar'},
  {key:'swiss', nombre:'Swiss Medical', sitio:'https://www.swissmedical.com.ar'},
  {key:'galeno', nombre:'Galeno', sitio:'https://www.galeno.com.ar'},
  {key:'medife', nombre:'Medifé', sitio:'https://www.medife.com.ar'},
  {key:'sancor', nombre:'Sancor Salud', sitio:'https://www.sancorsalud.com.ar'},
  {key:'omint', nombre:'Omint', sitio:'https://www.omint.com.ar'},
  {key:'ioma', nombre:'IOMA', sitio:'https://www.ioma.gba.gov.ar'},
  {key:'pami', nombre:'PAMI', sitio:'https://www.pami.org.ar'},
];
function buscarObraSocial(nombre) {
  if (!nombre) return null;
  var n = nombre.trim().toLowerCase();
  return OBRAS_SOCIALES.find(function(o){ return n.indexOf(o.key) !== -1 || n.indexOf(o.nombre.toLowerCase()) !== -1; }) || null;
}
function generarCredencialSimulada(nombreOS, numeroAfiliado) {
  var num = numeroAfiliado && numeroAfiliado.trim();
  if (!num) {
    var rand = '';
    for (var i=0;i<10;i++) rand += Math.floor(Math.random()*10);
    num = rand.slice(0,3)+'-'+rand.slice(3,7)+'-'+rand.slice(7,10)+' (de ejemplo)';
  }
  return {
    obra_social: nombreOS,
    numero_afiliado: num,
    fecha_conexion: new Date().toLocaleDateString('es-AR'),
  };
}

function esParaOtro() { return auxiState.data.para === 'otro'; }
function esMenorActivo() {
  var u = getUser();
  return !!(u && u.tipo !== 'mascota' && u.edad !== undefined && u.edad !== '' && !isNaN(parseInt(u.edad)) && parseInt(u.edad) < 18);
}

function goBack() {
  if (auxiState.history.length === 0) {
    auxiState.step = 'welcome'; auxiState.data = {}; auxiState.expr = 'happy';
    renderAuxi();
    return;
  }
  const prev = auxiState.history.pop();
  auxiState.step = prev.step;
  auxiState.expr = prev.expr;
  renderAuxi();
}

function renderAuxi() {
  const outlet = document.getElementById('app-outlet');
  const user = getUser();
  const screen = h('div',{class:'auxi-screen'});
  const wrap = h('div',{class:'auxi-wrap'});

  // Título AuxiliAR encima del robot
  const titleEl = h('div',{style:'text-align:center;margin-bottom:-0.5rem;'});
  titleEl.innerHTML = '<span style="font-family:Georgia,serif;font-size:1.1rem;font-weight:700;color:rgba(255,255,255,0.9);letter-spacing:-0.01em;">Auxili<em style="color:#fca5a5;font-style:italic;">AR</em></span>';

  const robotEl = h('div',{});
  robotEl.innerHTML = AUXI_SVG(auxiState.expr);

  const bubble = h('div',{class:'auxi-bubble'});
  const btns = h('div',{class:'auxi-btns'});

  const step = auxiState.step;

  // Welcome / ya tiene perfil
  if (step === 'welcome') {
    setAuxiExpr('happy');
    if (user && user.nombre) {
      bubble.innerHTML = '<p>¡Hola de nuevo, <strong>' + user.nombre + '</strong>! 😊 Soy Auxi.</p><p>¿Continuamos con tu perfil o sos otra persona?</p>';
      addBtn(btns,'Continuar como ' + user.nombre,'primary',()=>{
        auxiState.data.nombre = user.nombre;
        if (user.sexo) auxiState.data.sexo = user.sexo;
        if (user.edad !== undefined && user.edad !== '' && !isNaN(parseInt(user.edad))) {
          auxiState.data.edad = user.edad;
          auxiState.data.edadRango = edadNumARango(parseInt(user.edad));
          setEdadFiltro(auxiState.data.edadRango);
          auxiState.data.esMayor = parseInt(user.edad) >= 18;
          goToStep('role_tipo','caring');
        } else {
          // No tenemos la edad guardada — solo preguntamos eso, no repetimos todo
          goToStep('role','caring');
        }
      });
      addBtn(btns,'No soy ' + user.nombre,'',()=>goToStep('perfil_no_soy','caring'));
      addBtn(btns,'Necesito ayuda urgente','danger',()=>goToStep('urgente_si','alert'));
    } else {
      bubble.innerHTML = '<p>Hola. Soy <strong>Auxi</strong>, el asistente de AuxiliAR.</p><p>¿Tenés unos minutos para que te pueda orientar mejor?</p>';
      addBtn(btns,'Sí, quiero orientación','primary',()=>goToStep('role','caring'));
      addBtn(btns,'No, prefiero explorar por mi cuenta','',()=>goToStep('explore','happy'));
      addBtn(btns,'Necesito ayuda urgente','danger',()=>goToStep('urgente_si','alert'));
    }
  }

  else if (step === 'perfil_no_soy') {
    setAuxiExpr('happy');
    var userAnterior = getUser();
    var nombreAnterior = (userAnterior && userAnterior.nombre) || 'esa persona';
    var otrosPerfiles = getProfiles().filter(function(p){
      return p.id !== getActiveProfileId() && p.tipo !== 'mascota' && p.nombre;
    });
    bubble.innerHTML = otrosPerfiles.length
      ? '<p>Sin problema. ¿Sos alguno de estos perfiles que ya tengo guardados?</p>'
      : '<p>Sin problema. Puedo guardar el perfil de <strong>' + nombreAnterior + '</strong> para más tarde y armar uno nuevo para vos, o si preferís, lo elimino.</p>';
    otrosPerfiles.forEach(function(p){
      addBtn(btns, 'Sí, soy ' + p.nombre, 'primary', function(){
        setActiveProfileId(p.id);
        auxiState.history = [];
        goToStep('welcome','happy');
      });
    });
    addBtn(btns, otrosPerfiles.length ? 'No, soy alguien nuevo' : ('Guardar el de ' + nombreAnterior + ' y crear uno nuevo'), otrosPerfiles.length ? '' : 'primary', ()=>{
      crearPerfilNuevo('persona');
      auxiState.history=[];
      goToStep('welcome_new','happy');
    });
    addBtn(btns,'Eliminar el perfil de ' + nombreAnterior,'',()=>{
      clearUser();
      auxiState.history=[];
      goToStep('welcome_new','happy');
    });
    addBtn(btns,'← Volver','',()=>goBack());
  }

  else if (step === 'welcome_new') {
    setAuxiExpr('happy');
    bubble.innerHTML = '<p>¡Perfecto! Empecemos de cero.</p><p>¿Qué necesitás hoy?</p>';
    addBtn(btns,'Sí, quiero orientación','primary',()=>goToStep('role','caring'));
    addBtn(btns,'No, prefiero explorar por mi cuenta','',()=>goToStep('explore','happy'));
    addBtn(btns,'Necesito ayuda urgente','danger',()=>goToStep('urgente_si','alert'));
  }

  // Explorar por cuenta propia
  else if (step === 'explore') {
    setAuxiExpr('happy');
    bubble.innerHTML = '<p>Está bien, sin problema. Podés explorar todo a tu ritmo.</p>'
      + '<p style="font-size:0.83rem;color:inherit;opacity:0.85;">Si en algún momento querés que te oriente, volvé y hablamos.</p>';
    addBtn(btns,'Ver todas las categorías','primary',()=>navigate('/categorias'));
    addBtn(btns,'Emergencias y números de ayuda','danger',()=>navigate('/categorias/emergencias'));
    addBtn(btns,'Mi Salud','',()=>navigate('/mi-salud'));
    addBtn(btns,'← Volver','',()=>goBack());
  }

  // Pregunta edad (primer paso tras welcome)
  else if (step === 'role') {
    setAuxiExpr('caring');
    bubble.innerHTML = '<p>Antes de empezar, ¿sos mayor de 18 años o estás acompañado/a por un adulto responsable?</p>';
    addBtn(btns,'Sí, soy mayor de edad','primary',()=>{ auxiState.data.esMayor=true; goToStep('role_edad_rango','caring'); });
    addBtn(btns,'Soy menor y estoy acompañado/a','',()=>{ auxiState.data.esMayor=false; goToStep('role_edad_rango','caring'); });
    addBtn(btns,'Soy menor y estoy solo/a','',()=>{ auxiState.data.esMayor=false; auxiState.data.soloMenor=true; goToStep('menor_solo','caring'); });
    addBtn(btns,'← Volver','',()=>goBack());
  }

  // Rango de edad — alimenta el filtro de edad usado en las categorías
  else if (step === 'role_edad_rango') {
    setAuxiExpr('caring');
    var esMayorEdad = auxiState.data.esMayor;
    bubble.innerHTML = '<p>¿Cuántos años tenés? Así te muestro recursos más específicos para tu edad.</p>';
    addFieldStep(btns,'Tu edad...','edad','role_sexo');
    addBtn(btns,'← Volver','',()=>goBack());
  }

  // Sexo (opcional) — solo se usa cuando mejora la orientación (ej. controles preventivos)
  else if (step === 'role_sexo') {
    setAuxiExpr('caring');
    bubble.innerHTML = '<p>Una última pregunta opcional: ¿con qué sexo te identificás? Esto solo lo uso si ayuda a orientarte mejor, por ejemplo con controles preventivos.</p>';
    [['Femenino','femenino'],['Masculino','masculino'],['Otro','otro']].forEach(function(o){
      addBtn(btns, o[0], '', function(){
        auxiState.data.sexo = o[1];
        goToStep('role_tipo','caring');
      });
    });
    addBtn(btns,'Prefiero no responder','',()=>goToStep('role_tipo','caring'));
    addBtn(btns,'← Volver','',()=>goBack());
  }

  // Menor solo/a — recursos específicos
  else if (step === 'menor_solo') {
    setAuxiExpr('caring');
    bubble.innerHTML = '<p>Estoy acá con vos. No estás solo/a en esto — hay personas preparadas para ayudarte ahora mismo, gratis y sin que tengas que dar tu nombre si no querés.</p>'
      + '<p>¿Qué es lo que más se parece a lo que te está pasando?</p>';
    addBtn(btns,'Me pasó algo grave ahora (accidente, herida, no puedo respirar bien)','danger',()=>goToStep('menor_solo_emergencia','alert'));
    addBtn(btns,'Alguien me lastimó, me tocó o me hizo sentir mal','',()=>goToStep('menor_solo_abuso','caring'));
    addBtn(btns,'Me siento muy mal, angustiado/a o no sé qué hacer','',()=>goToStep('menor_solo_emocional','caring'));
    addBtn(btns,'Necesito hablar con alguien / no sé bien qué me pasa','',()=>goToStep('menor_solo_hablar','caring'));
    addBtn(btns,'← Volver','',()=>goBack());
  }

  // Menor solo/a — emergencia física inmediata
  else if (step === 'menor_solo_emergencia') {
    setAuxiExpr('alert');
    bubble.innerHTML = '<p>Si es algo grave y está pasando ahora, llamá ya al 911 o al 107 — no hace falta esperar a nadie.</p>'
      + '<p style="font-size:0.83rem;opacity:0.9;">Si podés, contale a un adulto cerca (un vecino, alguien en la calle) o quedate en un lugar seguro mientras llega ayuda.</p>';
    var em1 = h('a',{href:'tel:911',style:'display:flex;align-items:center;gap:14px;background:rgba(255,255,255,0.14);border:2px solid rgba(255,255,255,0.35);color:white;border-radius:14px;padding:12px 16px;text-decoration:none;font-family:var(--font-body);width:100%;max-width:380px;margin-bottom:6px;'});
    em1.innerHTML = '<span style="font-size:1.6rem;font-weight:900;min-width:48px;">911</span><span style="font-size:0.85rem;font-weight:600;">Policía / Emergencias</span><span style="margin-left:auto;">📞</span>';
    var em2 = h('a',{href:'tel:107',style:'display:flex;align-items:center;gap:14px;background:rgba(255,255,255,0.14);border:2px solid rgba(255,255,255,0.35);color:white;border-radius:14px;padding:12px 16px;text-decoration:none;font-family:var(--font-body);width:100%;max-width:380px;'});
    em2.innerHTML = '<span style="font-size:1.6rem;font-weight:900;min-width:48px;">107</span><span style="font-size:0.85rem;font-weight:600;">SAME (emergencia médica)</span><span style="margin-left:auto;">📞</span>';
    btns.appendChild(em1); btns.appendChild(em2);
    addBtn(btns,'Ya llamé, seguí acompañándome','',()=>goToStep('menor_solo_hablar','caring'));
    addBtn(btns,'← Volver','',()=>goBack());
  }

  // Menor solo/a — abuso, violencia o maltrato
  else if (step === 'menor_solo_abuso') {
    setAuxiExpr('caring');
    bubble.innerHTML = '<p>Lo que me contás es importante, y hiciste bien en decirlo. Nada de esto es tu culpa.</p>'
      + '<p style="font-size:0.83rem;opacity:0.9;">Podés llamar y contar lo que quieras, con tus propias palabras, cuando estés listo/a. Es gratis, confidencial, y te van a creer.</p>';
    var ab1 = h('a',{href:'tel:137',style:'display:flex;align-items:center;gap:14px;background:rgba(255,255,255,0.14);border:2px solid rgba(255,255,255,0.35);color:white;border-radius:14px;padding:12px 16px;text-decoration:none;font-family:var(--font-body);width:100%;max-width:380px;margin-bottom:6px;'});
    ab1.innerHTML = '<span style="font-size:1.6rem;font-weight:900;min-width:48px;">137</span><span style="font-size:0.85rem;font-weight:600;">Víctimas de violencia y abuso sexual</span><span style="margin-left:auto;">📞</span>';
    var ab2 = h('a',{href:'tel:102',style:'display:flex;align-items:center;gap:14px;background:rgba(255,255,255,0.14);border:2px solid rgba(255,255,255,0.35);color:white;border-radius:14px;padding:12px 16px;text-decoration:none;font-family:var(--font-body);width:100%;max-width:380px;'});
    ab2.innerHTML = '<span style="font-size:1.6rem;font-weight:900;min-width:48px;">102</span><span style="font-size:0.85rem;font-weight:600;">Niñez y adolescencia · 24 hs</span><span style="margin-left:auto;">📞</span>';
    btns.appendChild(ab1); btns.appendChild(ab2);
    addBtn(btns,'Quiero seguir contándote a vos primero','',()=>goToStep('menor_solo_hablar','caring'));
    addBtn(btns,'← Volver','',()=>goBack());
  }

  // Menor solo/a — angustia, crisis emocional
  else if (step === 'menor_solo_emocional') {
    setAuxiExpr('caring');
    bubble.innerHTML = '<p>Gracias por contarme cómo te sentís. Lo que sentís es válido, y no tenés que atravesarlo solo/a.</p>'
      + '<p style="font-size:0.83rem;opacity:0.9;">La línea 135 es gratuita, confidencial, y está para escucharte ahora, sin juzgar.</p>';
    var em3 = h('a',{href:'tel:135',style:'display:flex;align-items:center;gap:14px;background:rgba(255,255,255,0.14);border:2px solid rgba(255,255,255,0.35);color:white;border-radius:14px;padding:12px 16px;text-decoration:none;font-family:var(--font-body);width:100%;max-width:380px;'});
    em3.innerHTML = '<span style="font-size:1.6rem;font-weight:900;min-width:48px;">135</span><span style="font-size:0.85rem;font-weight:600;">Crisis emocional · 24 hs</span><span style="margin-left:auto;">📞</span>';
    btns.appendChild(em3);
    addBtn(btns,'Quiero contarte más a vos','primary',()=>goToStep('sint_sensacion_mental','caring'));
    addBtn(btns,'← Volver','',()=>goBack());
  }

  // Menor solo/a — quiere hablar / no sabe bien qué le pasa
  else if (step === 'menor_solo_hablar') {
    setAuxiExpr('caring');
    bubble.innerHTML = '<p>Está bien no saber exactamente qué te pasa. Contame con tus palabras, o si preferís, llamá directamente a alguna de estas líneas.</p>';
    var h1 = h('a',{href:'tel:102',style:'display:flex;align-items:center;gap:14px;background:rgba(255,255,255,0.14);border:2px solid rgba(255,255,255,0.35);color:white;border-radius:14px;padding:12px 16px;text-decoration:none;font-family:var(--font-body);width:100%;max-width:380px;margin-bottom:6px;'});
    h1.innerHTML = '<span style="font-size:1.6rem;font-weight:900;min-width:48px;">102</span><span style="font-size:0.85rem;font-weight:600;">Niñez y adolescencia · 24 hs</span><span style="margin-left:auto;">📞</span>';
    var h2 = h('a',{href:'tel:135',style:'display:flex;align-items:center;gap:14px;background:rgba(255,255,255,0.14);border:2px solid rgba(255,255,255,0.35);color:white;border-radius:14px;padding:12px 16px;text-decoration:none;font-family:var(--font-body);width:100%;max-width:380px;'});
    h2.innerHTML = '<span style="font-size:1.6rem;font-weight:900;min-width:48px;">135</span><span style="font-size:0.85rem;font-weight:600;">Crisis emocional · 24 hs</span><span style="margin-left:auto;">📞</span>';
    btns.appendChild(h1); btns.appendChild(h2);
    addBtn(btns,'Contarte a vos con mis palabras','primary',()=>goToStep('sint_sensacion_mental','caring'));
    addBtn(btns,'Ver recursos para jóvenes','',()=>navigate('/categorias/salud-mental'));
    addBtn(btns,'← Volver','',()=>goBack());
  }

  // Rol: buscar o ofrecer ayuda
  else if (step === 'role_tipo') {
    setAuxiExpr('caring');
    var esMayor = auxiState.data.esMayor !== false;
    // Detectar automáticamente el rango de edad a partir del número ingresado
    var edadNum = parseInt(auxiState.data.edad);
    if (!isNaN(edadNum) && edadNum >= 0) {
      auxiState.data.edadRango = edadNumARango(edadNum);
      setEdadFiltro(auxiState.data.edadRango);
    }
    bubble.innerHTML = '<p>' + (esMayor ? '¿Venís a buscar ayuda o a ofrecerla?' : '¿En qué te puedo ayudar?') + '</p>';
    addBtn(btns, 'Buscar ayuda', 'primary', ()=>goToStep('para_quien','caring'));
    if (esMayor) {
      addBtn(btns, 'Ofrecer ayuda / colaborar', '', ()=>goToStep('ofrece','caring'));
    }
    addBtn(btns, '← Volver', '', ()=>goBack());
  }

  // Ofrece ayuda
  else if (step === 'ofrece') {
    setAuxiExpr('caring');
    bubble.innerHTML = `<p>¡Qué bueno! En la sección <strong>Sumate a Ayudar</strong> podés registrarte como profesional, voluntario, ONG u organización.</p>`;
    addBtn(btns,'Sumate a Ayudar','primary',()=>navigate('/sumate/ofrece'));
    addBtn(btns,'← Volver','',()=>goBack());
  }

  // Para quién
  else if (step === 'para_quien') {
    setAuxiExpr('caring');
    bubble.innerHTML = `<p>¿La ayuda es para vos o para otra persona?</p>`;
    addBtn(btns,'Para mí','primary',()=>{ auxiState.data.para='yo'; goToStep('urgente','caring'); });
    addBtn(btns,'Para otra persona','',()=>{ auxiState.data.para='otro'; goToStep('urgente','caring'); });
    addBtn(btns,'Para un animal','',()=>{ auxiState.data.para='animal_ajeno'; goToStep('para_animal','caring'); });
    addBtn(btns,'← Volver','',()=>goBack());
  }

  // Mascota
  else if (step === 'para_animal') {
    setAuxiExpr('caring');
    bubble.innerHTML = `<p>¿Qué le está pasando?</p>`;
    addBtn(btns,'Es una emergencia (accidente, intoxicación, no puede respirar bien)','danger',()=>goToStep('animal_emergencia','alert'));
    addBtn(btns,'Sospecho de maltrato o abandono','',()=>goToStep('animal_maltrato','caring'));
    addBtn(btns,'Necesita vacunas, castración o un control de rutina','primary',()=>navigate('/categorias/animales'));
    addBtn(btns,'No estoy seguro/a, quiero ver las opciones','',()=>navigate('/categorias/animales'));
    addBtn(btns,'← Volver','',()=>goBack());
  }

  // Emergencia con un animal — sin línea gratuita 24hs equivalente al SAME, orientar con honestidad
  else if (step === 'animal_emergencia') {
    setAuxiExpr('alert');
    bubble.innerHTML = '<p>Entiendo la urgencia. Para emergencias con animales no existe en Argentina una línea telefónica gratuita de emergencia equivalente al SAME.</p>'
      + '<p style="font-size:0.83rem;color:inherit;opacity:0.85;">Lo más rápido es acercarte directamente a una guardia veterinaria de urgencias 24 hs (la mayoría son clínicas privadas con costo). Llamá antes de ir para confirmar que atienden a tu especie y que hay veterinario disponible en ese momento.</p>';
    addBtn(btns,'Ver veterinarias y centros','primary',()=>navigate('/categorias/animales'));
    addBtn(btns,'← Volver','',()=>goBack());
  }

  // Sospecha de maltrato o abandono — línea oficial de denuncia
  else if (step === 'animal_maltrato') {
    setAuxiExpr('caring');
    bubble.innerHTML = '<p>Hiciste bien en decirlo. El maltrato animal es un delito y se puede denunciar de forma gratuita.</p>'
      + '<p style="font-size:0.83rem;color:inherit;opacity:0.85;">La línea <strong>0800-333-7225</strong> del Gobierno de la Ciudad recibe denuncias de maltrato animal.</p>';
    addBtn(btns,'📞 Llamar al 0800-333-7225','danger',()=>{ window.location.href='tel:08003337225'; });
    addBtn(btns,'Ver otros recursos para animales','',()=>navigate('/categorias/animales'));
    addBtn(btns,'← Volver','',()=>goBack());
  }

  // Urgente
  else if (step === 'urgente') {
    setAuxiExpr('caring');
    var paraTercero = auxiState.data.para === 'otro';
    bubble.innerHTML = paraTercero
      ? '<p>¿Cómo está la persona en este momento?</p>'
      : '<p>¿Cómo estás en este momento?</p>';
    addBtn(btns, paraTercero ? 'Está en una situación urgente' : 'Estoy en una situación urgente', 'danger',
      ()=>goToStep('urgente_si','alert'));
    addBtn(btns, paraTercero ? 'Está sintiendo algo pero no es urgente' : 'Estoy sintiendo algo pero no es urgente', '',
      ()=>goToStep('contexto_malestar','caring'));
    addBtn(btns, paraTercero ? 'Quiero buscar información para ayudarla' : 'Quiero informarme o hacer una consulta', '',
      ()=>goToStep('consulta_tipo','caring'));
    addBtn(btns,'← Volver','',()=>goBack());
  }

  // Malestar presente pero no urgente — guiar con síntomas antes de derivar
  else if (step === 'contexto_malestar') {
    setAuxiExpr('caring');
    var para3 = auxiState.data.para === 'otro';
    bubble.innerHTML = para3
      ? '<p>Contame un poco. ¿Qué está sintiendo?</p>'
      : '<p>Contame un poco. ¿Qué estás sintiendo?</p>';
    addBtn(btns, 'Algo físico (dolor, malestar en el cuerpo)', 'primary',
      ()=>{ auxiState.data.tipo_consulta='fisica'; goToStep('sint_zona','caring'); });
    addBtn(btns, 'Algo emocional (angustia, tristeza, ansiedad)', '',
      ()=>{ auxiState.data.tipo_consulta='mental'; goToStep('sint_sensacion_mental','caring'); });
    addBtn(btns, 'No sé bien cómo describirlo', '',
      ()=>{ auxiState.data.tipo_consulta='desconocido'; goToStep('contexto_no_se','caring'); });
    addBtn(btns,'← Volver','',()=>goBack());
  }

  // Sprint 4 — acompañar cuando la persona no sabe cómo describir lo que siente
  else if (step === 'contexto_no_se') {
    setAuxiExpr('caring');
    bubble.innerHTML = '<p>No hace falta que sepas exactamente qué te está ocurriendo. Contame con tus palabras qué sentís, en el cuerpo o en el ánimo, y voy a intentar orientarte igual.</p>';
    addBtn(btns,'Sigamos','primary',()=>goToStep('sint_zona','caring'));
    addBtn(btns,'← Volver','',()=>goBack());
  }

  // Síntomas emocionales — rama específica
  // Chequeo de ánimo — reconoce explícitamente lo que ya se sabe antes de volver a preguntar
  else if (step === 'chequeo_animo') {
    setAuxiExpr('caring');
    var uPrev = getUser();
    var uc = uPrev && uPrev.ultima_consulta;
    auxiState.data.sintomas = []; // arrancamos un chequeo nuevo, no arrastramos la selección anterior
    bubble.innerHTML = (uc && uc.sensacion)
      ? '<p>Recuerdo que la última vez me dijiste que te sentías así: <strong>' + uc.sensacion + '</strong>' + (uc.fecha ? ' (' + uc.fecha + ')' : '') + '.</p><p>¿Cómo estás ahora? ¿Sigue igual, mejoró, o es algo distinto?</p>'
      : '<p>Contame, ¿cómo estás ahora?</p>';
    addBtn(btns,'Sigue parecido','primary',()=>{
      if (uc && uc.sensacion) {
        auxiState.data.sintomas = uc.sensacion.split(',').map(function(s){return s.trim();});
        auxiState.data.sint_sensacion = uc.sensacion;
        auxiState.data.sint_cuando = 'Hace mucho tiempo, viene y va';
        goToStep('sint_resumen_mental','caring');
      } else {
        goToStep('sint_sensacion_mental','caring');
      }
    });
    addBtn(btns,'Es distinto / contarte de nuevo','',()=>goToStep('sint_sensacion_mental','caring'));
    addBtn(btns,'← Volver','',()=>goBack());
  }

  else if (step === 'sint_sensacion_mental') {
    setAuxiExpr('caring');
    if (!auxiState.data.sintomas) auxiState.data.sintomas = [];
    var p3sm = esParaOtro();
    bubble.innerHTML = p3sm
      ? '<p>Vamos paso a paso.</p><p>¿Cómo describirías lo que le está pasando? Podés elegir más de una opción — muchas veces varias cosas pasan al mismo tiempo.</p>'
      : '<p>Estoy con vos. Vamos paso a paso.</p><p>¿Cómo lo describirías? Podés elegir más de una opción — muchas veces varias cosas pasan al mismo tiempo.</p>';
    var opcionesMentales = ['Angustia o sensación de ahogo','Tristeza profunda o llanto','Nervios o agitación','Palpitaciones o el corazón acelerado','Pensamientos que no puedo parar','Sensación de que algo malo va a pasar','No sé bien cómo explicarlo'];
    var chipsWrapM = h('div',{style:'display:flex;flex-wrap:wrap;gap:8px;width:100%;max-width:380px;margin-bottom:6px;'});
    opcionesMentales.forEach(function(s){
      var isActive = auxiState.data.sintomas.indexOf(s) !== -1;
      var chip = h('button',{class:'sint-chip'+(isActive?' sint-chip--active':'')}, s);
      chip.addEventListener('click', function(){
        var exclusiva = 'No sé bien cómo explicarlo';
        var idx = auxiState.data.sintomas.indexOf(s);
        if (s === exclusiva) { auxiState.data.sintomas = idx===-1 ? [exclusiva] : []; }
        else {
          var noIdx = auxiState.data.sintomas.indexOf(exclusiva);
          if (noIdx !== -1) auxiState.data.sintomas.splice(noIdx,1);
          if (idx === -1) auxiState.data.sintomas.push(s); else auxiState.data.sintomas.splice(idx,1);
        }
        renderAuxi();
      });
      chipsWrapM.appendChild(chip);
    });
    btns.appendChild(chipsWrapM);
    addBtn(btns,'Continuar','primary',function(){
      if (auxiState.data.sintomas.length === 0) { showToast('Elegí al menos una opción'); return; }
      auxiState.data.sint_sensacion = auxiState.data.sintomas.join(', ');
      goToStep('sint_cuando_mental','caring');
    });
    addBtn(btns,'← Volver','',()=>goBack());
  }

  else if (step === 'sint_cuando_mental') {
    setAuxiExpr('caring');
    bubble.innerHTML = esParaOtro()
      ? '<p>¿Hace cuánto se siente así?</p>'
      : '<p>¿Hace cuánto estás sintiéndote así?</p>';
    ['Empezó ahora o hace poco','Desde hace algunos días','Hace semanas o meses','Hace mucho tiempo, viene y va'].forEach(function(t){
      addBtn(btns, t, '', function(){
        auxiState.data.sint_cuando = t;
        goToStep('sint_resumen_mental','caring');
      });
    });
    addBtn(btns,'← Volver','',()=>goBack());
  }

  else if (step === 'sint_resumen_mental') {
    setAuxiExpr('caring');
    var sintomasM = auxiState.data.sintomas || [];
    var score = calcularPrioridad(auxiState.data);
    var prioridad = prioridadDominante(score);
    auxiState.data._prioridad = prioridad;
    auxiState.data.destino = '/categorias/salud-mental';
    var p3rm = esParaOtro();
    var msg = p3rm
      ? '<p>Gracias por contarme. No hace falta que sepas exactamente qué es lo que le pasa — con lo que me compartiste ya puedo orientarte.</p>'
      : '<p>Gracias por contarme. No hace falta que sepas exactamente qué es lo que sentís — con lo que me compartiste ya puedo orientarte.</p>';
    var tieneAngustia = sintomasM.indexOf('Angustia o sensación de ahogo') !== -1 || sintomasM.indexOf('Nervios o agitación') !== -1;
    var tienePalpitaciones = sintomasM.indexOf('Palpitaciones o el corazón acelerado') !== -1;
    if (score.crisisEmocional >= 2 && score.clinica >= 2) {
      // Combinación: crisis de angustia y causa clínica son ambas posibles — no descartamos ninguna
      msg += p3rm
        ? '<p>Lo que describís — ' + (tieneAngustia?'la agitación':'lo que le pasa') + (tienePalpitaciones?' junto con las palpitaciones':'') + ' — puede tratarse de una crisis de angustia, algo muy frecuente y tratable. Pero como el cuerpo también se activa así ante algunas causas físicas, no está de más que lo consulten con un médico además de buscar apoyo psicológico.</p>'
        : '<p>Lo que describís — ' + (tieneAngustia?'la agitación':'lo que sentís') + (tienePalpitaciones?' junto con las palpitaciones':'') + ' — puede tratarse de una crisis de angustia, algo muy frecuente y tratable. Pero como el cuerpo también se activa así ante algunas causas físicas, no está de más que lo converses con un médico además de buscar apoyo psicológico.</p>';
      addBtn(btns,'📞 Llamar al 107 (por las dudas, causa física)','danger',()=>{ window.location.href='tel:107'; });
    } else if (tieneAngustia) {
      msg += p3rm
        ? '<p>Lo que describís suena a que su sistema nervioso está muy activado. Puede ser ansiedad o una crisis de angustia — algo muy frecuente y completamente tratable.</p>'
        : '<p>Lo que describís suena a que tu sistema nervioso está muy activado. Puede ser ansiedad o una crisis de angustia — algo muy frecuente y completamente tratable.</p>';
    } else if (sintomasM.indexOf('Tristeza profunda o llanto') !== -1) {
      msg += p3rm
        ? '<p>Sentirse así durante un tiempo puede ser una señal de que necesita apoyo. No tiene nada de malo pedir ayuda.</p>'
        : '<p>Sentirse así durante un tiempo puede ser una señal de que necesitás apoyo. No tiene nada de malo pedir ayuda.</p>';
    } else if (sintomasM.indexOf('Pensamientos que no puedo parar') !== -1) {
      msg += '<p>Los pensamientos que no se pueden parar son agotadores. Hay profesionales que pueden ayudar a trabajar eso.</p>';
    } else {
      msg += p3rm
        ? '<p>Lo que le pasa merece atención. Un profesional puede ayudar a entenderlo mejor.</p>'
        : '<p>Lo que sentís merece atención. Un profesional puede ayudarte a entenderlo mejor.</p>';
    }
    msg += '<p style="font-size:0.8rem;color:inherit;margin-top:0.3rem;opacity:0.82;">Esto <strong>no es un diagnóstico</strong>. Solo un profesional puede orientar correctamente.</p>';
    bubble.innerHTML = msg;
    addBtn(btns,'📞 Llamar al 135 (salud mental)','danger',()=>{ window.location.href='tel:135'; });
    addBtn(btns,'Ver recursos de salud mental','primary',()=>navigate('/categorias/salud-mental'));
    addBtn(btns,'Guardar y ver recursos','',()=>goToStep('guardar_sint_mental','satisfied'));
    addBtn(btns,'← Volver','',()=>goBack());
  }

  // Consulta informativa — preguntar qué puntualmente
  else if (step === 'consulta_tipo') {
    setAuxiExpr('caring');
    bubble.innerHTML = '<p>¿Sobre qué tema necesitás ayuda?</p>';
    // Flexbox — se adapta solo a cualquier ancho de pantalla, sin desbordes
    var grid = h('div',{class:'consulta-tema-grid'});
    var opciones = [
      {icon:'🏥', label:'Salud física', sub:'Hospitales, guardias, vacunas',
       dest:'/categorias/salud-fisica', next:'consulta_provincia', geo:'salud-fisica'},
      {icon:'🧠', label:'Salud mental', sub:'Apoyo emocional, psicólogos',
       dest:'/categorias/salud-mental', next:'consulta_provincia', geo:'salud-mental'},
      {icon:'💚', label:'ESI y derechos', sub:'Sexual, reproductivos, identidad',
       dest:'/categorias/esi', next:'ofrecer_centros_cercanos'},
      {icon:'🩹', label:'Primeros auxilios', sub:'RCP, emergencias, guías',
       dest:'/categorias/primeros-auxilios', next:'ofrecer_centros_cercanos'},
      {icon:'🩸', label:'Donaciones', sub:'Sangre, órganos, plasma',
       dest:'/categorias/donaciones', next:'ofrecer_centros_cercanos'},
      {icon:'📋', label:'Leyes y trámites', sub:'Derechos, FAQ, gestiones',
       dest:'/recursos-utiles', next:'ofrecer_centros_cercanos'},
    ];
    opciones.forEach(function(op){
      var btn = h('button',{class:'consulta-tema-btn',
        onclick: function(){
          auxiState.data.destino = op.dest;
          if(op.geo) auxiState.data.geoTipo = op.geo;
          goToStep(op.next || 'ofrecer_centros_cercanos','caring');
        }
      });
      btn.innerHTML = '<span class="consulta-tema-icon">'+op.icon+'</span>'
        +'<span class="consulta-tema-label">'+op.label+'</span>'
        +'<span class="consulta-tema-sub">'+op.sub+'</span>';
      grid.appendChild(btn);
    });
    btns.appendChild(grid);
    var otraBtn = h('button',{class:'consulta-tema-btn consulta-tema-btn--otra',onclick:()=>goToStep('consulta_libre','caring')});
    otraBtn.innerHTML = '<span class="consulta-tema-icon">✏️</span>'
      +'<span class="consulta-tema-label">Otra consulta</span>'
      +'<span class="consulta-tema-sub">Escribime con tus palabras qué necesitás</span>';
    grid.appendChild(otraBtn);
    addBtn(btns,'← Volver','',()=>goBack());
  }

  // Casilla libre para consultas que no encajan en ninguna categoría
  else if (step === 'consulta_libre') {
    setAuxiExpr('caring');
    bubble.innerHTML = '<p>Contame con tus palabras qué necesitás saber. Voy a buscarte lo más parecido en los recursos disponibles.</p>';
    var ta = document.createElement('textarea');
    ta.className = 'consulta-libre-textarea';
    ta.placeholder = 'Ej: no sé a dónde ir si perdí mi medicación...';
    ta.rows = 3;
    btns.appendChild(ta);
    var enviarBtn = h('button',{class:'auxi-btn auxi-btn--primary',style:'margin-top:8px;',onclick:function(){
      var texto = ta.value.trim();
      if (!texto) { showToast('Escribí tu consulta primero'); return; }
      auxiState.data.consultaLibre = texto;
      goToStep('consulta_libre_resultado','caring');
    }});
    enviarBtn.textContent = 'Buscar';
    btns.appendChild(enviarBtn);
    addBtn(btns,'← Volver','',()=>goBack());
  }

  else if (step === 'consulta_libre_resultado') {
    setAuxiExpr('caring');
    var texto = (auxiState.data.consultaLibre || '').toLowerCase();
    var palabras = texto.split(/\s+/).filter(function(w){ return w.length > 3; });
    var matches = searchIndex.filter(function(item){
      var t = item.t.toLowerCase();
      return palabras.some(function(w){ return t.indexOf(w) !== -1; }) || t.indexOf(texto) !== -1;
    }).slice(0, 5);
    if (matches.length > 0) {
      bubble.innerHTML = '<p>Encontré esto que puede servirte:</p>';
      matches.forEach(function(m){
        addBtn(btns, m.t, '', function(){ irA(m.s); });
      });
      addBtn(btns,'Ver todas las categorías','',()=>navigate('/categorias'));
    } else {
      bubble.innerHTML = '<p>No encontré algo específico para eso, pero acá tenés todas las categorías disponibles — seguro alguna te sirve.</p>';
      addBtn(btns,'Ver todas las categorías','primary',()=>navigate('/categorias'));
    }
    addBtn(btns,'← Volver','',()=>goBack());
  }

  // Pregunta de provincia — para personalizar recursos
  else if (step === 'consulta_provincia') {
    setAuxiExpr('caring');
    var p3cp = esParaOtro();
    var yaUbicacion = (getUser() && getUser().ubicacion) || getZonaSesion();
    // Ya la dijo en esta misma charla — confirmar en vez de repreguntar
    if (auxiState.data.provincia) {
      bubble.innerHTML = p3cp
        ? `<p>Me habías dicho que está en <strong>${auxiState.data.provincia}</strong>. ¿Seguimos con eso?</p>`
        : `<p>Me habías dicho que estás en <strong>${auxiState.data.provincia}</strong>. ¿Seguimos con eso?</p>`;
      addBtn(btns,'Sí, es correcto','primary',()=>goToStep('ofrecer_centros_cercanos','satisfied'));
      addBtn(btns,'Cambiarla','',()=>{ auxiState.data.provincia=''; setZonaSesion(''); renderAuxi(); });
      addBtn(btns,'← Volver','',()=>goBack());
    }
    // Ya está en el perfil guardado, o ya se lo dijo en una charla anterior — usarla sin volver a preguntar
    else if (yaUbicacion) {
      auxiState.data.provincia = yaUbicacion;
      goToStep('ofrecer_centros_cercanos','satisfied');
      return;
    }
    else {
    bubble.innerHTML = (p3cp
      ? '<p>¿En qué provincia o ciudad está? Así te muestro los recursos más cercanos.</p>'
      : '<p>¿En qué provincia o ciudad estás? Así te muestro los recursos más cercanos.</p>')
      + '<p style="font-size:0.8rem;color:inherit;opacity:0.82;">(opcional)</p>';
    var provincias = ['CABA','GBA / Gran Buenos Aires','Córdoba','Rosario','Mendoza','Otra ciudad / provincia'];
    provincias.forEach(function(p){
      addBtn(btns, p, '', function(){
        auxiState.data.provincia = p;
        setZonaSesion(p);
        if (p !== 'CABA' && p !== 'GBA / Gran Buenos Aires') {
          // Mostrar aviso de cobertura nacional
          auxiState.data._aviso_cobertura = true;
        }
        goToStep('ofrecer_centros_cercanos','satisfied');
      });
    });
    addBtn(btns,'Prefiero no decir','',()=>goToStep('ofrecer_centros_cercanos','satisfied'));
    addBtn(btns,'← Volver','',()=>goBack());
    }
  }

  // Ofrecer centros cercanos (GPS) — paso separado, no se mezcla con la pregunta de ubicación
  else if (step === 'ofrecer_centros_cercanos') {
    setAuxiExpr('caring');
    var p3oc = esParaOtro();
    // Solo tiene sentido si venimos de una categoría con búsqueda de centros
    if (!auxiState.data.geoTipo) {
      goToStep('ofrecer_guardar_perfil','satisfied');
      return;
    }
    bubble.innerHTML = p3oc
      ? '<p>¿Querés que busque centros cercanos usando la ubicación de este dispositivo (GPS)? Es distinto de lo que me contaste recién.</p>'
      : '<p>¿Querés que busque centros cercanos usando la ubicación de tu dispositivo (GPS)? Es distinto de lo que me contaste recién.</p>';
    addBtn(btns,'📍 Sí, buscar centros cercanos','primary',()=>goToStep('geo_centros','thinking'));
    addBtn(btns,'No, gracias','',()=>goToStep('ofrecer_guardar_perfil','satisfied'));
    addBtn(btns,'← Volver','',()=>goBack());
  }

  // Ofrecer guardar el perfil — último paso antes de ir a los recursos
  else if (step === 'ofrecer_guardar_perfil') {
    setAuxiExpr('satisfied');
    const yaHayPerfil = !!(getUser() && getUser().nombre);
    if (yaHayPerfil) {
      navigate(auxiState.data.destino||'/categorias');
      return;
    }
    var p3g2 = esParaOtro();
    bubble.innerHTML = '<p>¡Genial!</p><p>Antes de irte, ¿te gustaría contarme un poco sobre '
      + (p3g2 ? 'la persona a la que querés ayudar' : 'vos')
      + ' para que pueda ayudar' + (p3g2 ? 'la' : 'te') + ' más rápido la próxima vez?</p>'
      + '<p style="font-size:0.8rem;color:var(--gris);">Todo es opcional y queda guardado solo en tu dispositivo. 🔒</p>';
    if (auxiState.data._aviso_cobertura) {
      var cobertura2 = h('div',{style:'background:rgba(255,255,255,0.12);border-radius:8px;padding:8px 12px;font-size:0.78rem;color:rgba(255,255,255,0.85);margin-bottom:4px;'});
      cobertura2.textContent = 'Algunos recursos son específicos de CABA. Los marcados como "Nacional" aplican en todo el país.';
      btns.appendChild(cobertura2);
    }
    addBtn(btns, p3g2 ? 'Sí, quiero contarte sobre esa persona' : 'Sí, quiero contarte sobre mí', 'primary', ()=>goToStep('perfil_nombre','caring'));
    addBtn(btns,'No, prefiero no configurar perfil','',()=>goToStep('cierre','satisfied'));
    addBtn(btns,'← Volver','',()=>goBack());
  }

  // Urgente: sí
  else if (step === 'urgente_si') {
    setAuxiExpr('alert');
    var menorUrg = esMenorActivo() && !esParaOtro();
    // Pregunta de Auxi es lo protagonista
    bubble.innerHTML = menorUrg
      ? '<p>Estoy acá. Respirá.</p><p>¿Hay un adulto con vos en este momento? Te recomiendo avisarle mientras seguimos hablando.</p>'
      : '<p>Estoy acá. Respirá.</p><p>¿Podés contarme un poco qué está pasando?</p>';
    if (menorUrg) {
      var u = getUser();
      if (u && u.adulto_telefono) {
        var avisarBtn = h('a',{
          href: 'tel:'+u.adulto_telefono.replace(/[^0-9+]/g,''),
          style: 'display:flex;align-items:center;gap:10px;background:rgba(255,255,255,0.14);border:2px solid rgba(255,255,255,0.35);color:white;border-radius:14px;padding:12px 16px;text-decoration:none;font-family:var(--font-body);width:100%;max-width:380px;'
        });
        avisarBtn.innerHTML = '<span style="font-size:1.3rem;">📞</span><span style="font-size:0.86rem;font-weight:600;">Llamar a '+(u.adulto_nombre||'tu adulto responsable')+(u.adulto_relacion?' ('+u.adulto_relacion+')':'')+'</span>';
        btns.appendChild(avisarBtn);
      }
    }
    // Botón principal: contarle a Auxi
    addBtn(btns,'Sí, contarle a Auxi','primary',()=>goToStep('sint_zona','caring'));
    // Separador visual
    var sep = h('div',{style:'width:100%;max-width:380px;text-align:center;'});
    sep.innerHTML = '<span style="font-size:0.75rem;color:rgba(255,255,255,0.55);font-weight:600;letter-spacing:0.05em;display:block;margin:4px 0;">— o llamá directamente —</span>';
    btns.appendChild(sep);
    // Números integrados como botones grandes, uno por uno
    [
      ['107', 'SAME — Emergencias médicas', 'tel:107'],
      ['911', 'Policía · Emergencias generales', 'tel:911'],
      ['135', 'Crisis de salud mental', 'tel:135'],
    ].forEach(function(info) {
      var btn = h('a', {
        href: info[2],
        style: 'display:flex;align-items:center;gap:14px;background:rgba(255,255,255,0.14);'
          + 'border:2px solid rgba(255,255,255,0.35);color:white;border-radius:14px;'
          + 'padding:14px 18px;text-decoration:none;font-family:var(--font-body);'
          + 'width:100%;max-width:380px;transition:background 0.14s,border-color 0.14s;'
      });
      btn.innerHTML = '<span style="font-size:1.8rem;font-weight:900;min-width:52px;letter-spacing:-1px;">'
        + info[0] + '</span>'
        + '<span style="font-size:0.88rem;font-weight:600;line-height:1.35;">' + info[1] + '</span>'
        + '<span style="margin-left:auto;font-size:1.3rem;">📞</span>';
      btn.addEventListener('mouseover', function(){
        this.style.background='rgba(255,255,255,0.24)';
        this.style.borderColor='rgba(255,255,255,0.65)';
      });
      btn.addEventListener('mouseout', function(){
        this.style.background='rgba(255,255,255,0.14)';
        this.style.borderColor='rgba(255,255,255,0.35)';
      });
      btns.appendChild(btn);
    });
    addBtn(btns,'← Volver','',()=>goBack());
  }

  else if (step === 'sint_zona') {
    setAuxiExpr('caring');
    var notaMenor = '';
    if (esMenorActivo() && !esParaOtro() && !auxiState.data._notaMenorMostrada) {
      auxiState.data._notaMenorMostrada = true;
      notaMenor = '<p style="font-size:0.8rem;opacity:0.85;">Te recomiendo hacer esto junto a una persona adulta responsable, si podés.</p>';
    }
    bubble.innerHTML = (esParaOtro() ? `<p>¿Dónde siente el malestar?</p>` : `<p>¿Dónde sentís el malestar?</p>`) + notaMenor;
    ['Cabeza','Pecho','Abdomen','Extremidades','Todo el cuerpo','No sé'].forEach(z=>{
      addBtn(btns, z, auxiState.data.sint_zona===z?'primary':'', ()=>{
        auxiState.data.sint_zona = z; goToStep('sint_sensacion','caring');
      });
    });
    addBtn(btns,'← Volver','',()=>goBack());
  }

  else if (step === 'sint_sensacion') {
    setAuxiExpr('caring');
    if (!auxiState.data.sintomas) auxiState.data.sintomas = [];
    var p3ss = esParaOtro();
    bubble.innerHTML = p3ss
      ? '<p>¿Cómo describirías lo que le pasa? Podés elegir más de una opción si siente varias cosas a la vez — a veces la combinación dice más que un síntoma solo.</p>'
      : '<p>¿Cómo lo describirías? Podés elegir más de una opción si sentís varias cosas a la vez — a veces la combinación dice más que un síntoma solo.</p>';
    var opcionesFisicas = ['Dolor','Presión','Mareo','Dificultad para respirar','Entumecimiento','Angustia','No sé'];
    var chipsWrap = h('div',{style:'display:flex;flex-wrap:wrap;gap:8px;width:100%;max-width:380px;margin-bottom:6px;'});
    opcionesFisicas.forEach(function(s){
      var isActive = auxiState.data.sintomas.indexOf(s) !== -1;
      var chip = h('button',{class:'sint-chip'+(isActive?' sint-chip--active':'')}, s);
      chip.addEventListener('click', function(){
        var idx = auxiState.data.sintomas.indexOf(s);
        if (s === 'No sé') { auxiState.data.sintomas = idx===-1 ? ['No sé'] : []; }
        else {
          var noIdx = auxiState.data.sintomas.indexOf('No sé');
          if (noIdx !== -1) auxiState.data.sintomas.splice(noIdx,1);
          if (idx === -1) auxiState.data.sintomas.push(s); else auxiState.data.sintomas.splice(idx,1);
        }
        renderAuxi();
      });
      chipsWrap.appendChild(chip);
    });
    btns.appendChild(chipsWrap);
    addBtn(btns, 'Continuar', 'primary', function(){
      if (auxiState.data.sintomas.length === 0) { showToast('Elegí al menos una opción, o "No sé" si no estás seguro/a'); return; }
      auxiState.data.sint_sensacion = auxiState.data.sintomas.join(', ');
      var score = calcularPrioridad(auxiState.data);
      var prioridad = prioridadDominante(score);
      auxiState.data._prioridad = prioridad;
      var s = auxiState.data.sintomas;
      if (prioridad === 'emergencia' && s.length > 1) {
        goToStep('sint_orientacion_combo','alert');
      } else if (s.indexOf('Dificultad para respirar') !== -1) {
        goToStep('sint_orientacion_resp','alert');
      } else if (s.indexOf('Angustia') !== -1) {
        goToStep('sint_orientacion_ang','caring');
      } else if (s.indexOf('Presión') !== -1) {
        goToStep('sint_orientacion_pres','alert');
      } else {
        goToStep('sint_cuando','caring');
      }
    });
    addBtn(btns,'← Volver','',()=>goBack());
  }

  // Combinación de síntomas que, juntos, ameritan más atención que por separado
  else if (step === 'sint_orientacion_combo') {
    setAuxiExpr('alert');
    var s = (auxiState.data.sintomas||[]).join(', ').toLowerCase();
    bubble.innerHTML = '<p>Por lo que me contás — ' + s + ' — me preocupa que esta situación pueda requerir atención inmediata.</p>'
      + '<p>Mientras seguimos conversando, te recomiendo comunicarte con el SAME (107).</p>'
      + '<p style="font-size:0.8rem;color:inherit;margin-top:0.4rem;opacity:0.82;">Esto <strong>no es un diagnóstico</strong>. Solo un profesional puede evaluarte, pero ante esta combinación es mejor prevenir.</p>';
    addBtn(btns,'📞 Llamar al 107 (SAME)','danger',()=>{ window.location.href='tel:107'; });
    addBtn(btns,'Sigamos charlando','',()=>goToStep('sint_cuando','caring'));
    addBtn(btns,'← Volver','',()=>goBack());
  }

  else if (step === 'sint_orientacion_resp') {
    setAuxiExpr('alert');
    bubble.innerHTML = '<p>Estoy con vos. La dificultad para respirar puede tener distintas causas, y algunas conviene chequearlas pronto.</p><p style="font-size:0.8rem;color:inherit;margin-top:0.3rem;opacity:0.82;">Esto <strong>no es un diagnóstico</strong>. Si el malestar es intenso o empeora, llamá al 107.</p>';
    addBtn(btns,'📞 Llamar al 107 (SAME)','danger',()=>{ window.location.href='tel:107'; });
    addBtn(btns,'Sigamos charlando','',()=>goToStep('sint_cuando','caring'));
    addBtn(btns,'← Volver','',()=>goBack());
  }

  else if (step === 'sint_orientacion_ang') {
    setAuxiExpr('caring');
    bubble.innerHTML = esParaOtro()
      ? '<p>La angustia puede ser una señal de que necesita apoyo — muchas veces es ansiedad, algo muy frecuente y tratable.</p><p style="font-size:0.8rem;color:inherit;opacity:0.82;margin-top:0.4rem;">Esto <strong>no es un diagnóstico</strong>. La línea 135 puede orientarlos ahora mismo, las 24 horas.</p>'
      : '<p>Estoy con vos. La angustia puede ser una señal de que tu mente o cuerpo necesitan apoyo — muchas veces es ansiedad, algo muy frecuente y tratable.</p><p style="font-size:0.8rem;color:inherit;opacity:0.82;margin-top:0.4rem;">Esto <strong>no es un diagnóstico</strong>. La línea 135 puede orientarte ahora mismo, las 24 horas.</p>';
    addBtn(btns,'📞 Llamar al 135','danger',()=>{ window.location.href='tel:135'; });
    addBtn(btns,'Sigamos charlando','',()=>goToStep('sint_cuando','caring'));
    addBtn(btns,'← Volver','',()=>goBack());
  }

  else if (step === 'sint_orientacion_pres') {
    setAuxiExpr('alert');
    bubble.innerHTML = '<p>Te escucho. La presión, especialmente en el pecho, puede tener distintas causas que conviene evaluar con un profesional cuanto antes.</p><p style="font-size:0.8rem;color:inherit;opacity:0.82;margin-top:0.4rem;">Esto <strong>no es un diagnóstico</strong>. Si la presión en el pecho es intensa, llamá al 107.</p>';
    addBtn(btns,'📞 Llamar al 107 (SAME)','danger',()=>{ window.location.href='tel:107'; });
    addBtn(btns,'Sigamos charlando','',()=>goToStep('sint_cuando','caring'));
    addBtn(btns,'← Volver','',()=>goBack());
  }

  else if (step === 'sint_cuando') {
    setAuxiExpr('caring');
    bubble.innerHTML = `<p>¿Hace cuánto empezó?</p>`;
    ['Hace minutos','Hace horas','Hace días','No sé'].forEach(t=>{
      addBtn(btns, t, '', ()=>{ auxiState.data.sint_cuando=t; goToStep('sint_resumen','satisfied'); });
    });
    addBtn(btns,'← Volver','',()=>goBack());
  }

  else if (step === 'sint_resumen') {
    setAuxiExpr('satisfied');
    const user = getUser();
    const lineas = [];
    if (user && user.nombre) lineas.push(`Nombre: ${user.nombre}`);
    if (user && user.edad) lineas.push(`Edad: ${user.edad}`);
    if (user && user.alergias) lineas.push(`Alergias: ${user.alergias}`);
    if (user && user.enfermedades) lineas.push(`Enfermedades: ${user.enfermedades}`);
    if (user && user.medicacion) lineas.push(`Medicación: ${user.medicacion}`);
    if (auxiState.data.provincia) lineas.push('Ubicación: ' + auxiState.data.provincia);
    if (auxiState.data.sint_zona) lineas.push('Zona: ' + auxiState.data.sint_zona);
    if (auxiState.data.sint_sensacion) lineas.push('Síntoma: ' + auxiState.data.sint_sensacion);
    if (auxiState.data.sint_cuando) lineas.push('Inicio: ' + auxiState.data.sint_cuando);
    const texto = lineas.join('\n') || 'Sin datos adicionales.';
    auxiState.data._resumen = texto;
    bubble.innerHTML = `<p>Armé este resumen para que puedas compartirlo:</p>
      <pre style="background:#f5f5f4;border-radius:8px;padding:0.75rem;font-size:0.8rem;white-space:pre-wrap;margin:0.5rem 0;color:#1c1917;">${texto}</pre>`;
    // 1. SAME primero — acción más importante
    var sameBtn = h('a',{href:'tel:107',style:'display:flex;align-items:center;justify-content:center;gap:10px;background:#b91c1c;color:white;border-radius:12px;padding:14px;text-decoration:none;font-family:var(--font-body);font-size:1rem;font-weight:800;width:100%;max-width:380px;'});
    sameBtn.innerHTML = '📞 Llamar al 107 — SAME';
    btns.appendChild(sameBtn);
    // 2. Acciones compactas en fila
    var actionRow = h('div',{style:'display:flex;gap:8px;width:100%;max-width:380px;flex-wrap:wrap;'});
    // Compartir (nativo o fallback)
    var shareBtn = h('button',{class:'auxi-btn',style:'flex:1;min-width:80px;font-size:0.82rem;',onclick:function(){
      if(navigator.share){ navigator.share({title:'Emergencia AUXILIAR',text:texto}).catch(function(){}); }
      else { navigator.clipboard.writeText(texto).then(function(){showToast('Copiado');}).catch(function(){}); }
    }});
    shareBtn.innerHTML = '↗ Compartir';
    actionRow.appendChild(shareBtn);
    // Copiar
    var copyBtn = h('button',{class:'auxi-btn',style:'flex:1;min-width:80px;font-size:0.82rem;',onclick:function(){
      navigator.clipboard.writeText(texto).then(function(){showToast('Copiado al portapapeles');}).catch(function(){
        var ta=document.createElement('textarea');ta.value=texto;document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta);showToast('Copiado');
      });
    }});
    copyBtn.innerHTML = '📋 Copiar';
    actionRow.appendChild(copyBtn);
    // Descargar
    var dlBtn = h('button',{class:'auxi-btn',style:'flex:1;min-width:80px;font-size:0.82rem;',onclick:function(){
      var blob=new Blob([texto],{type:'text/plain'});
      var a=document.createElement('a');a.href=URL.createObjectURL(blob);
      a.download='emergencia-auxiliar.txt';a.click();
    }});
    dlBtn.innerHTML = '⬇ Descargar';
    actionRow.appendChild(dlBtn);
    btns.appendChild(actionRow);
    // ARQUITECTURA FUTURA: Red de profesionales disponibles
    // Para implementar necesitaría: backend Node.js/Python, WebSockets para disponibilidad,
    // auth de profesionales, DB de turnos. Se deja botón preparado para v2.0
    var proBtn = h('button',{class:'auxi-btn',style:'opacity:0.55;cursor:not-allowed;',onclick:function(){ showToast('Esta función estará disponible próximamente'); }});
    proBtn.innerHTML = '🩺 Solicitar acompañamiento profesional <span style="font-size:0.7rem;background:rgba(255,255,255,0.2);border-radius:4px;padding:1px 5px;margin-left:4px;">Próximamente</span>';
    btns.appendChild(proBtn);
    addBtn(btns,'← Volver','',()=>goBack());
  }

  // Tema
  else if (step === 'tema') {
    // Redirige a consulta_tipo que tiene el árbol completo
    goToStep('consulta_tipo','caring');
    return;
  }

  // Centros cercanos (geolocalización por categoría)
  else if (step === 'geo_centros') {
    setAuxiExpr('caring');
    bubble.innerHTML = '<p>Buscando centros cercanos a tu ubicación...</p>';
    var geoCont = h('div',{style:'margin-top:0.5rem;width:100%;max-width:380px;'});
    btns.appendChild(geoCont);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        function(pos) {
          buscarCentrosCercanos(pos.coords.latitude, pos.coords.longitude, auxiState.data.geoTipo||'salud-fisica', geoCont);
          var robotEl2 = wrap.querySelector('.auxi-robot');
          if (robotEl2) { var tmp=document.createElement('div'); tmp.innerHTML=AUXI_SVG('satisfied'); robotEl2.replaceWith(tmp.firstChild); }
        },
        function() {
          geoCont.innerHTML = '<p style="color:var(--gris);font-size:0.84rem;">No se pudo obtener tu ubicación. <a href="https://www.buenosaires.gob.ar/salud/hospitales" target="_blank">Ver mapa oficial →</a></p>';
        }
      );
    } else {
      geoCont.innerHTML = '<p style="color:var(--gris);font-size:0.84rem;">Tu navegador no soporta geolocalización.</p>';
    }
    addBtn(btns,'Continuar','primary',()=>goToStep('ofrecer_guardar_perfil','satisfied'));
    addBtn(btns,'← Volver','',()=>goBack());
  }

  // Perfil — nombre
  // Guardar síntomas emocionales y derivar
  else if (step === 'guardar_sint_mental') {
    setAuxiExpr('satisfied');
    var p3g = esParaOtro();
    var yaTienePerfil = !p3g && !!(getUser() && getUser().nombre);
    if (yaTienePerfil) {
      var u = getUser();
      // Guardar cómo se siente como nota en el perfil (solo si es sobre uno mismo y ya existe perfil)
      u.ultima_consulta = {
        fecha: new Date().toLocaleDateString('es-AR'),
        sensacion: auxiState.data.sint_sensacion || '',
        desde: auxiState.data.sint_cuando || '',
      };
      if (!u.historial_animo) u.historial_animo = [];
      u.historial_animo.unshift(u.ultima_consulta);
      u.historial_animo = u.historial_animo.slice(0, 10); // conservar como máximo las últimas 10
      saveUser(u);
    }
    if (p3g) {
      bubble.innerHTML = '<p>Tomé nota de lo que me contaste sobre esta persona.</p><p style="font-size:0.83rem;color:inherit;opacity:0.85;">Te llevo a los recursos de salud mental. Recordá que la línea 135 está disponible ahora si lo necesita.</p>';
      addBtn(btns,'Ver recursos de salud mental','primary',()=>navigate('/categorias/salud-mental'));
    } else if (yaTienePerfil) {
      bubble.innerHTML = '<p>Guardé cómo te sentís. Podés verlo en <strong>Mi Salud</strong>.</p>'
        + '<p style="font-size:0.83rem;color:inherit;opacity:0.85;">Te llevo a los recursos de salud mental. Recordá que la línea 135 está disponible ahora si lo necesitás.</p>';
      addBtn(btns,'Ver recursos de salud mental','primary',()=>navigate('/categorias/salud-mental'));
      addBtn(btns,'Ir a Mi Salud','',()=>navigate('/mi-salud'));
    } else {
      // Todavía no hay perfil — no guardamos nada a ciegas, ofrecemos crear el perfil de verdad
      bubble.innerHTML = '<p>Todavía no tenés un perfil creado, así que no puedo guardar esto en <strong>Mi Salud</strong> — pero si querés, lo creamos ahora mismo y lo guardo ahí.</p>';
      addBtn(btns,'Sí, crear mi perfil ahora','primary',()=>goToStep('perfil_nombre','caring'));
      addBtn(btns,'Ver recursos de salud mental','',()=>navigate('/categorias/salud-mental'));
    }
    addBtn(btns,'← Volver','',()=>goBack());
  }

  // Cierre cálido de conversación
  else if (step === 'cierre') {
    setAuxiExpr('satisfied');
    var dest = auxiState.data.destino || '/categorias';
    var nombre = getUser() && getUser().nombre ? getUser().nombre : '';
    bubble.innerHTML = '<p>' + (nombre ? nombre + ', te' : 'Te') + ' llevo a los recursos.</p>'
      + '<p style="font-size:0.83rem;color:inherit;opacity:0.85;">Si en algún momento necesitás volver, acá voy a estar. Cuidate mucho.</p>';
    addBtn(btns, 'Ver recursos →', 'primary', function(){ navigate(dest); });
    addBtn(btns, 'Hacer otra consulta', '', function(){
      auxiState = { step:'role_tipo', data: Object.assign({}, auxiState.data), expr:'caring', history:[] };
      renderAuxi();
    });
    addBtn(btns,'← Volver','',()=>goBack());
  }

  // Elegir qué tipo de perfil crear — permite tener el propio y el de una mascota a la vez
  else if (step === 'elegir_tipo_perfil') {
    setAuxiExpr('happy');
    bubble.innerHTML = '<p>¿Para quién es este perfil?</p>';
    addBtn(btns,'Para mí','primary',()=>{
      crearPerfilNuevo('persona');
      goToStep('perfil_nombre','caring');
    });
    addBtn(btns,'Para mi mascota','',()=>{
      var nuevo = crearPerfilNuevo('mascota');
      showToast('Perfil de mascota creado');
      navigate('/mi-salud');
    });
    addBtn(btns,'← Volver','',()=>goBack());
  }

  else if (step === 'perfil_nombre') {
    setAuxiExpr('caring');
    bubble.innerHTML = esParaOtro()
      ? `<p>¿Cómo se llama? <span style="color:#a8a29e;font-size:0.82rem;">(podés omitirlo)</span></p>`
      : `<p>¿Cómo te llamás? <span style="color:#a8a29e;font-size:0.82rem;">(podés omitirlo)</span></p>`;
    addFieldStep(btns,esParaOtro()?'Su nombre...':'Tu nombre...','nombre','perfil_edad');
    addBtn(btns,'← Volver','',()=>goBack());
  }
  else if (step === 'perfil_edad') {
    setAuxiExpr('caring');
    var p3pe = esParaOtro();
    if (auxiState.data.edad) {
      bubble.innerHTML = p3pe
        ? `<p>Ya me habías dicho que tiene <strong>${auxiState.data.edad} años</strong>. ¿Seguimos con ese dato?</p>`
        : `<p>Ya me habías dicho que tenés <strong>${auxiState.data.edad} años</strong>. ¿Seguimos con ese dato?</p>`;
      addBtn(btns,'Sí, es correcto','primary',()=>goToStep('perfil_edad_router','caring'));
      addBtn(btns,'Cambiarlo','',()=>{ auxiState.data.edad=''; renderAuxi(); });
    } else {
      bubble.innerHTML = p3pe
        ? `<p>¿Cuántos años tiene? <span style="color:#a8a29e;font-size:0.82rem;">(opcional)</span></p>`
        : `<p>¿Cuántos años tenés? <span style="color:#a8a29e;font-size:0.82rem;">(opcional)</span></p>`;
      addFieldStep(btns,p3pe?'Su edad...':'Tu edad...','edad','perfil_edad_router');
      addBtn(btns,'← Volver','',()=>goBack());
    }
  }
  // Bifurca según si la edad ingresada corresponde a un menor de edad
  else if (step === 'perfil_edad_router') {
    var edadNum = parseInt(auxiState.data.edad);
    if (!isNaN(edadNum) && edadNum < 18) {
      goToStep('perfil_menor_acompanante','caring');
    } else {
      goToStep('perfil_ubicacion','caring');
    }
    return;
  }
  // Modo de acompañamiento para menores — datos del adulto responsable (opcional)
  else if (step === 'perfil_menor_acompanante') {
    setAuxiExpr('caring');
    bubble.innerHTML = '<p>Como sos menor de edad, puedo guardar el contacto de un adulto responsable, por si en algún momento hace falta.</p>'
      + '<p style="font-size:0.78rem;color:#78716c;">Es completamente opcional — solo lo guardo si vos querés.</p>';
    addBtn(btns,'Sí, quiero agregarlo','primary',()=>goToStep('perfil_menor_nombre_adulto','caring'));
    addBtn(btns,'No, prefiero no darlo','',()=>goToStep('perfil_ubicacion','caring'));
    addBtn(btns,'← Volver','',()=>goBack());
  }
  else if (step === 'perfil_menor_nombre_adulto') {
    setAuxiExpr('caring');
    bubble.innerHTML = '<p>¿Cómo se llama el adulto responsable?</p>';
    addFieldStep(btns,'Nombre del adulto...','adulto_nombre','perfil_menor_relacion');
    addBtn(btns,'← Volver','',()=>goBack());
  }
  else if (step === 'perfil_menor_relacion') {
    setAuxiExpr('caring');
    bubble.innerHTML = '<p>¿Qué relación tiene con vos?</p>';
    ['Madre','Padre','Tutor/a','Otro'].forEach(function(r){
      addBtn(btns, r, '', function(){ auxiState.data.adulto_relacion = r; goToStep('perfil_menor_telefono','caring'); });
    });
    addBtn(btns,'← Volver','',()=>goBack());
  }
  else if (step === 'perfil_menor_telefono') {
    setAuxiExpr('caring');
    bubble.innerHTML = '<p>¿Tenés su teléfono? <span style="color:#a8a29e;font-size:0.82rem;">(opcional)</span></p>';
    addFieldStep(btns,'Teléfono...','adulto_telefono','perfil_menor_email');
    addBtn(btns,'← Volver','',()=>goBack());
  }
  else if (step === 'perfil_menor_email') {
    setAuxiExpr('caring');
    bubble.innerHTML = '<p>¿Y su correo electrónico? <span style="color:#a8a29e;font-size:0.82rem;">(opcional)</span></p>';
    addFieldStep(btns,'Correo...','adulto_email','perfil_ubicacion');
    addBtn(btns,'← Volver','',()=>goBack());
  }
  else if (step === 'perfil_ubicacion') {
    setAuxiExpr('caring');
    var zonaConocida = auxiState.data.ubicacion || auxiState.data.provincia || (getUser() && getUser().ubicacion) || getZonaSesion();
    if (zonaConocida) {
      auxiState.data.ubicacion = zonaConocida; // aseguramos que quede guardado con la clave correcta del perfil
      bubble.innerHTML = `<p>Ya sé que estás en <strong>${zonaConocida}</strong>. ¿Seguimos así, o preferís agregar el barrio o localidad para recursos más precisos?</p>`;
      addBtn(btns,'Seguimos así','primary',()=>goToStep('perfil_alergias','caring'));
      addBtn(btns,'Agregar barrio/localidad','',()=>goToStep('perfil_barrio','caring'));
      addBtn(btns,'Cambiar la zona','',()=>{ auxiState.data.ubicacion=''; auxiState.data.provincia=''; setZonaSesion(''); renderAuxi(); });
      addBtn(btns,'← Volver','',()=>goBack());
    } else {
      bubble.innerHTML = `<p>¿En qué zona estás? <span style="color:#a8a29e;font-size:0.82rem;">(ej: CABA, GBA, Rosario…)</span></p>`;
      addFieldStep(btns,'Tu ubicación...','ubicacion','perfil_ubicacion_guardar');
      addBtn(btns,'← Volver','',()=>goBack());
    }
  }
  else if (step === 'perfil_ubicacion_guardar') {
    setZonaSesion(auxiState.data.ubicacion || '');
    goToStep('perfil_alergias','caring');
    return;
  }
  // Refinamiento opcional: barrio o localidad, solo si el usuario lo pide — nunca repite la pregunta de zona
  else if (step === 'perfil_barrio') {
    setAuxiExpr('caring');
    bubble.innerHTML = `<p>¿En qué barrio o localidad, más específicamente? <span style="color:#a8a29e;font-size:0.82rem;">(opcional)</span></p>`;
    addFieldStep(btns,'Ej: Palermo, San Isidro...','barrio_temp','perfil_barrio_confirmar');
    addBtn(btns,'← Volver','',()=>goBack());
  }
  else if (step === 'perfil_barrio_confirmar') {
    if (auxiState.data.barrio_temp) {
      auxiState.data.ubicacion = (auxiState.data.ubicacion||'') + (auxiState.data.ubicacion && auxiState.data.barrio_temp ? ', ' : '') + auxiState.data.barrio_temp;
    }
    setZonaSesion(auxiState.data.ubicacion || '');
    goToStep('perfil_alergias','caring');
    return;
  }
  else if (step === 'perfil_alergias') {
    setAuxiExpr('caring');
    bubble.innerHTML = `<p>¿Tenés alergias conocidas?</p><p style="font-size:0.78rem;color:#78716c;">Lo que me contás queda solo en tu dispositivo. Yo no tengo acceso a esta información.</p>`;
    addFieldStep(btns,'Alergias (o dejá vacío)','alergias','perfil_listo_basico');
    addBtn(btns,'← Volver','',()=>goBack());
  }
  else if (step === 'perfil_listo_basico') {
    setAuxiExpr('satisfied');
    var usr = getUser() || {};
    // Guardar los 3 campos esenciales
    if (auxiState.data.nombre) usr.nombre = auxiState.data.nombre;
    if (auxiState.data.edad !== undefined) usr.edad = auxiState.data.edad;
    if (auxiState.data.sexo !== undefined) usr.sexo = auxiState.data.sexo;
    if (auxiState.data.alergias !== undefined) usr.alergias = auxiState.data.alergias;
    // Si veníamos de contarle a Auxi cómo nos sentíamos antes de tener perfil, guardarlo ahora
    if (auxiState.data.sint_sensacion) {
      usr.ultima_consulta = {
        fecha: new Date().toLocaleDateString('es-AR'),
        sensacion: auxiState.data.sint_sensacion,
        desde: auxiState.data.sint_cuando || '',
      };
      if (!usr.historial_animo) usr.historial_animo = [];
      usr.historial_animo.unshift(usr.ultima_consulta);
      usr.historial_animo = usr.historial_animo.slice(0, 10);
    }
    saveUser(Object.assign(usr, auxiState.data));
    var nombre = usr.nombre || '';
    bubble.innerHTML = '<p>¡Listo' + (nombre ? ', <strong>' + nombre + '</strong>' : '') + '! Guardé lo esencial'+(auxiState.data.sint_sensacion?', incluyendo cómo te sentías':'')+'.</p>'
      + '<p style="font-size:0.83rem;color:inherit;opacity:0.85;margin-top:0.3rem;">Podés completar más datos médicos en <strong>Mi Salud</strong> cuando quieras.</p>';
    if ((auxiState.data.destino || '/categorias') !== '/mi-salud') {
      addBtn(btns, 'Ver recursos', 'primary', function() {
        navigate(auxiState.data.destino || '/categorias');
      });
    }
    addBtn(btns, 'Completar más datos (obra social, DNI, etc.)', '', ()=>goToStep('perfil_enfermedades','caring'));
    addBtn(btns, 'Ir a Mi Salud', '', function() { navigate('/mi-salud'); });
    addBtn(btns, '← Volver', '', ()=>goBack());
  }

  else if (step === 'perfil_enfermedades') {
    setAuxiExpr('caring');
    bubble.innerHTML = `<p>¿Hay alguna enfermedad o condición relevante que quieras mencionar? <span style="color:#a8a29e;font-size:0.82rem;">(opcional)</span></p>`;
    addFieldStep(btns,'Enfermedades o condiciones...','enfermedades','perfil_medicacion');
    addBtn(btns,'← Volver','',()=>goBack());
  }
  else if (step === 'perfil_medicacion') {
    setAuxiExpr('caring');
    bubble.innerHTML = `<p>¿Tomás alguna medicación regularmente? <span style="color:#a8a29e;font-size:0.82rem;">(opcional)</span></p>`;
    var edadNumMed = parseInt(auxiState.data.edad);
    var esMenorPerfilNuevo = !isNaN(edadNumMed) && edadNumMed < 18;
    addFieldStep(btns,'Medicación...','medicacion', esMenorPerfilNuevo ? 'perfil_dni' : 'perfil_obra_social');
    addBtn(btns,'← Volver','',()=>goBack());
  }
  else if (step === 'perfil_obra_social') {
    setAuxiExpr('caring');
    bubble.innerHTML = '<p>¿Tenés obra social o prepaga? <span style="color:#a8a29e;font-size:0.82rem;">(opcional)</span></p>';
    var chipsOS = h('div',{style:'display:flex;flex-wrap:wrap;gap:8px;width:100%;max-width:380px;margin-bottom:8px;'});
    OBRAS_SOCIALES.forEach(function(o){
      var chip = h('button',{class:'sint-chip'}, o.nombre);
      chip.addEventListener('click', function(){
        auxiState.data.obra_social = o.nombre;
        goToStep('perfil_obra_social_conectar','caring');
      });
      chipsOS.appendChild(chip);
    });
    btns.appendChild(chipsOS);
    addFieldStep(btns,'Otra (escribila)...','obra_social','perfil_dni');
    addBtn(btns,'No tengo','',()=>{ auxiState.data.obra_social=''; goToStep('perfil_dni','caring'); });
    addBtn(btns,'← Volver','',()=>goBack());
  }

  // Simulación frontend: "conectar" la obra social — nunca accede a datos reales
  else if (step === 'perfil_obra_social_conectar') {
    setAuxiExpr('caring');
    bubble.innerHTML = '<p>¿Querés conectar tu <strong>' + auxiState.data.obra_social + '</strong> a AuxiliAR?</p>'
      + '<p style="font-size:0.78rem;color:#a8a29e;">Esto es una simulación: no accedemos a ningún dato real de tu afiliación, solo guardamos en tu dispositivo un acceso rápido a la cartilla, el sitio oficial y una credencial de ejemplo.</p>';
    addBtn(btns,'Sí, conectar','primary',()=>goToStep('perfil_obra_social_numero','caring'));
    addBtn(btns,'No, gracias','',()=>goToStep('perfil_dni','caring'));
    addBtn(btns,'← Volver','',()=>goBack());
  }

  // Número de afiliado (opcional) — para que la credencial simulada se sienta real
  else if (step === 'perfil_obra_social_numero') {
    setAuxiExpr('caring');
    bubble.innerHTML = '<p>¿Cuál es tu número de afiliado? <span style="color:#a8a29e;font-size:0.82rem;">(opcional — si no lo tenés a mano, podés omitirlo)</span></p>';
    addFieldStep(btns,'Ej: 123-4567-890...','numero_afiliado_temp','perfil_obra_social_confirmar');
    addBtn(btns,'← Volver','',()=>goBack());
  }

  else if (step === 'perfil_obra_social_confirmar') {
    auxiState.data.obra_social_conectada = generarCredencialSimulada(auxiState.data.obra_social, auxiState.data.numero_afiliado_temp);
    goToStep('perfil_dni','caring');
    return;
  }
  else if (step === 'perfil_dni') {
    setAuxiExpr('caring');
    bubble.innerHTML = '<p>¿Querés agregar tu DNI o Pasaporte? Puede ser útil para futuras gestiones médicas. <span style="color:#a8a29e;font-size:0.82rem;">(completamente opcional · queda solo en tu dispositivo)</span></p>';
    addFieldStep(btns,'DNI o Pasaporte...','dni','perfil_contacto');
    addBtn(btns,'← Volver','',()=>goBack());
  }
  else if (step === 'perfil_contacto') {
    setAuxiExpr('caring');
    bubble.innerHTML = '<p>¿Tenés un contacto de emergencia? Podés dejarme su número de WhatsApp para avisarle rápido si lo necesitás. <span style="color:#a8a29e;font-size:0.82rem;">(opcional)</span></p>';
    addFieldStep(btns,'Ej: 5491123456789...','contacto_emergencia','perfil_listo');
    addBtn(btns,'← Volver','',()=>goBack());
  }
  else if (step === 'perfil_listo') {
    setAuxiExpr('satisfied');
    var usrFinal = getUser() || {};
    if (auxiState.data.sint_sensacion) {
      usrFinal.ultima_consulta = {
        fecha: new Date().toLocaleDateString('es-AR'),
        sensacion: auxiState.data.sint_sensacion,
        desde: auxiState.data.sint_cuando || '',
      };
      if (!usrFinal.historial_animo) usrFinal.historial_animo = [];
      usrFinal.historial_animo.unshift(usrFinal.ultima_consulta);
      usrFinal.historial_animo = usrFinal.historial_animo.slice(0, 10);
    }
    saveUser(Object.assign(usrFinal, auxiState.data));
    bubble.innerHTML = `<p>¡Listo, <strong>${auxiState.data.nombre||'!'}</strong> Guardé tu información.</p><p>La próxima vez que me consultes voy a recordar tus datos para ayudarte mejor.</p>`;
    var destinoFinal = auxiState.data.destino || '/categorias';
    if (destinoFinal === '/mi-salud') {
      addBtn(btns,'Ver mi perfil','primary',()=>navigate('/mi-salud'));
    } else {
      addBtn(btns,'Ir a ver recursos','primary',()=>navigate(destinoFinal));
      addBtn(btns,'Ver mi perfil','',()=>navigate('/mi-salud'));
    }
    addBtn(btns,'← Volver','',()=>goBack());
  }

  robotEl.innerHTML = AUXI_SVG(auxiState.expr);
  // Añadir botón TTS a la burbuja de Auxi si hay texto
  if (ttsSupported()) {
    var bubbleText = bubble.innerText || bubble.textContent;
    var ttsBtn = document.createElement('button');
    ttsBtn.className = 'tts-btn';
    ttsBtn.style.cssText = 'margin-top:8px;font-size:0.72rem;';
    ttsBtn.textContent = '🔊 Escuchar';
    ttsBtn.addEventListener('click', function(){
      ttsSpeak(bubbleText);
    });
    bubble.appendChild(ttsBtn);
  }
  // Acceso rápido al inicio — para no tener que apretar "← Volver" muchas veces
  // si ya se avanzó bastante en la charla.
  if (step !== 'welcome' && step !== 'welcome_new') {
    var homeLink = h('button',{class:'auxi-home-link'},'🏠 Volver al inicio');
    homeLink.addEventListener('click', function(){
      auxiState = { step:'welcome', data:{}, expr:'happy', history:[] };
      renderAuxi();
    });
    btns.appendChild(homeLink);
  }
  wrap.appendChild(titleEl);
  wrap.appendChild(robotEl);
  wrap.appendChild(bubble);
  wrap.appendChild(btns);
  screen.appendChild(wrap);
  renderInto(outlet, screen);
}

function addBtn(container, label, style, cb) {
  const cls = style==='primary'?'auxi-btn auxi-btn--primary':style==='danger'?'auxi-btn auxi-btn--danger':'auxi-btn';
  const b = h('button',{class:cls, onclick:cb}, label);
  container.appendChild(b);
}

function addFieldStep(container, placeholder, dataKey, nextStep) {
  const field = h('div',{class:'auxi-field'});
  const input = h('input',{type:'text', placeholder});
  field.appendChild(input);
  container.appendChild(field);
  function intentarContinuar() {
    if (!input.value.trim()) {
      showToast('Completá el campo, o apretá "Omitir" si preferís no responder');
      input.focus();
      return;
    }
    auxiState.data[dataKey] = input.value.trim();
    auxiState.step = nextStep;
    renderAuxi();
  }
  input.addEventListener('keydown', e=>{ if(e.key==='Enter'){ intentarContinuar(); }});
  // "Continuar" ahora es un botón más, al lado de "Omitir" y "← Volver" (no queda embebido en el campo)
  addBtn(container,'Continuar','primary',intentarContinuar);
  addBtn(container,'Omitir','',()=>{ auxiState.data[dataKey]=''; auxiState.step=nextStep; renderAuxi(); });
}

/* ============ VIEW: INICIO ============ */
function viewInicio() {
  if (auxiSkipReset) {
    auxiSkipReset = false;
  } else {
    auxiState = { step:'welcome', data:{}, expr:'happy', history:[] };
  }
  // Render Auxi in next tick so #app-outlet exists in DOM
  requestAnimationFrame(function(){
    try { renderAuxi(); } catch(e){ console.error('Auxi render error:', e); }
  });
  // Return a loading placeholder that gets immediately replaced
  var ph = document.createElement('div');
  ph.className = 'auxi-screen';
  ph.style.minHeight = 'calc(100vh - 90px)';
  return ph;
}


/* ============ CAT DATA ============ */
const CAT_DATA = [
  {
    title:'Salud Física', slug:'salud-fisica',
    bg:'linear-gradient(135deg,#e63946,#b5172b)',
    svgIcon:`<svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="22" y="8" width="12" height="40" rx="6" fill="rgba(255,255,255,0.55)"/><rect x="8" y="22" width="40" height="12" rx="6" fill="rgba(255,255,255,0.55)"/></svg>`,
    items:['Hospitales públicos gratuitos','Guardias de urgencia','Vacunación · Programas del Estado','Médicos sin obra social'],
  },
  {
    title:'Salud Mental', slug:'salud-mental',
    bg:'linear-gradient(135deg,#4361ee,#1a2a8c)',
    svgIcon:`<svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="28" cy="22" r="14" fill="rgba(255,255,255,0.45)"/><rect x="22" y="34" width="12" height="8" rx="4" fill="rgba(255,255,255,0.45)"/><rect x="20" y="42" width="16" height="5" rx="2.5" fill="rgba(255,255,255,0.35)"/><circle cx="23" cy="20" r="2.5" fill="white"/><circle cx="33" cy="20" r="2.5" fill="white"/><path d="M23 27 Q28 31 33 27" stroke="white" stroke-width="2" fill="none" stroke-linecap="round"/></svg>`,
    items:['Línea 135 · crisis emocional','Psicólogos gratuitos · CABA','Hospitales especializados','Herramientas de bienestar'],
  },
  {
    title:'ESI', slug:'esi',
    bg:'linear-gradient(135deg,#00b894,#007d5a)',
    svgIcon:`<svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M28 10 C16 10 10 20 10 28 C10 40 28 50 28 50 C28 50 46 40 46 28 C46 20 40 10 28 10Z" fill="rgba(255,255,255,0.5)"/><circle cx="28" cy="28" r="8" fill="rgba(255,255,255,0.6)"/></svg>`,
    items:['Anticonceptivos gratuitos','Derechos sexuales y reproductivos','IVE · Ley 27.610','Consentimiento e identidad'],
  },
  {
    title:'Primeros Auxilios', slug:'primeros-auxilios',
    bg:'linear-gradient(135deg,#f77f00,#d45a1a)',
    svgIcon:`<svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="18" y="8" width="20" height="40" rx="6" fill="rgba(255,255,255,0.45)"/><rect x="8" y="18" width="40" height="20" rx="6" fill="rgba(255,255,255,0.45)"/><rect x="22" y="12" width="12" height="32" rx="4" fill="rgba(255,255,255,0.3)"/><rect x="12" y="22" width="32" height="12" rx="4" fill="rgba(255,255,255,0.3)"/></svg>`,
    items:['RCP paso a paso','Atragantamiento · Heimlich','ACV · Quemaduras · Heridas','Quiz interactivo'],
  },
  {
    title:'Emergencias', slug:'emergencias',
    bg:'linear-gradient(135deg,#d00000,#7d0000)',
    svgIcon:`<svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M28 6 L52 48 H4 Z" fill="rgba(255,255,255,0.45)"/><rect x="25" y="22" width="6" height="14" rx="3" fill="white"/><circle cx="28" cy="41" r="3" fill="white"/></svg>`,
    items:['911 · 107 (SAME) · 144','Protocolos de actuación','Recursos por región','Intoxicaciones · Accidentes'],
  },
  {
    title:'Animales', slug:'animales',
    bg:'linear-gradient(135deg,#f4a200,#c97c00)',
    svgIcon:`<svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="28" cy="22" r="12" fill="rgba(255,255,255,0.5)"/><ellipse cx="28" cy="38" rx="14" ry="10" fill="rgba(255,255,255,0.45)"/><ellipse cx="18" cy="16" rx="5" ry="8" fill="rgba(255,255,255,0.35)" transform="rotate(-20 18 16)"/><ellipse cx="38" cy="16" rx="5" ry="8" fill="rgba(255,255,255,0.35)" transform="rotate(20 38 16)"/><circle cx="24" cy="21" r="2" fill="rgba(255,255,255,0.8)"/><circle cx="32" cy="21" r="2" fill="rgba(255,255,255,0.8)"/></svg>`,
    items:['Guardia veterinaria gratuita','Vacunación antirrábica gratuita','Castración gratuita · sin turno','Primeros auxilios para tu animal'],
  },
  {
    title:'Donaciones', slug:'donaciones',
    bg:'linear-gradient(135deg,#0096c7,#023e8a)',
    svgIcon:`<svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M28 46 C14 36 6 28 6 20 C6 13 12 8 18 8 C22 8 26 11 28 14 C30 11 34 8 38 8 C44 8 50 13 50 20 C50 28 42 36 28 46Z" fill="rgba(255,255,255,0.5)"/><path d="M28 14 C28 14 22 22 22 27 C22 31 25 34 28 34 C31 34 34 31 34 27 C34 22 28 14 28 14Z" fill="rgba(255,120,120,0.7)"/></svg>`,
    items:['Donación de sangre','Donación de órganos · INCUCAI','Plasma y médula ósea','Recursos materiales'],
  },
];

function viewCategorias() {
  const grid = h('div',{class:'cat-grid'});
  CAT_DATA.forEach(c => {
    const card = h('button',{class:'cat-card',onclick:()=>navigate('/categorias/'+c.slug),'aria-label':'Ver '+c.title});
    card.innerHTML = `
      <div class="cat-card__img" style="background:${c.bg}">
        <div class="cat-card__img-icon">${c.svgIcon}</div>
      </div>
      <div class="cat-card__body">
        <h3 class="cat-card__title">${c.title}</h3>
        <ul class="cat-card__list">${c.items.map(i=>`<li>${i}</li>`).join('')}</ul>
      </div>`;
    grid.appendChild(card);
  });
  return h('div',{class:'view'},[
    h('div',{class:'main-content'},[
      h('div',{class:'section-block'},[
        h('div',{class:'section-divider'}),
        h('h2',{class:'section-title'},'Categorías de ayuda'),
        h('p',{class:'section-sub'},'Recursos gratuitos en CABA, GBA y todo el país'),
        grid,
      ]),
    
    ]),
  ]);
}

/* ============ HELPERS ============ */

/* ============ FILTRO POR EDAD ============ */
function edadBanner(categoria) {
  var rango = getEdadFiltro();
  if (!rango) return null;
  var mensajes = {
    'salud-fisica': {
      'ninez':'Para niñes de 0 a 12 años el pediatra es el referente principal. En los CeSAC podés acceder a controles de crecimiento, vacunas y atención primaria sin turno previo y de forma gratuita.',
      'adolescencia':'En la adolescencia aparecen necesidades específicas: vacuna HPV, salud sexual y reproductiva, y atención sin que tus padres tengan que estar presentes si preferís privacidad.',
      'adultos':'Es recomendable un control anual: presión arterial, vacuna antigripal si tenés factores de riesgo, y chequeo de colesterol. A partir de los 40 el riesgo cardiovascular aumenta, así que conviene sumar control de glucemia.',
      'mayores':'PAMI cubre tu atención sin costo. Las personas mayores de 50 tienen mayor riesgo de enfermedades crónicas y caídas. Priorizá vacunas antineumocócica, antigripal y refuerzo COVID, y controles regulares.',
    },
    'salud-mental': {
      'ninez':'En la niñez los problemas de salud mental se expresan diferente: cambios de conducta, dificultades escolares o en el sueño pueden ser señales. El Hospital Tobar García tiene atención especializada gratuita.',
      'adolescencia':'La adolescencia es una etapa de alta vulnerabilidad emocional. Si estás pasando un momento difícil, la línea 135 es gratuita, confidencial y disponible ahora mismo. No tenés que estar en crisis para llamar.',
      'adultos':'La ansiedad y el estrés son muy frecuentes en la vida adulta, entre el trabajo, la crianza o la incertidumbre. Hay psicólogos gratuitos en los CeSAC de CABA sin necesidad de obra social.',
      'mayores':'El aislamiento social, la pérdida de seres queridos y los cambios físicos pueden impactar la salud mental a partir de esta edad. Los centros de día de CABA ofrecen actividades gratuitas y contención.',
    },
    'esi': {
      'ninez':'En la niñez, la ESI se trata sobre todo del cuidado del propio cuerpo, el respeto y la prevención del abuso — siempre acompañado por un adulto de confianza. Es un derecho garantizado por la Ley 26.150.',
      'adolescencia':'En la adolescencia podés acceder a métodos anticonceptivos gratuitos y consultas confidenciales en los CAPS, sin necesidad de autorización de un adulto para la mayoría de las consultas.',
      'adultos':'Los métodos anticonceptivos, la IVE y los controles de salud sexual son gratuitos en hospitales públicos y CAPS, sin importar tu edad ni tu obra social.',
      'mayores':'El acceso a la salud sexual no tiene límite de edad. Los controles ginecológicos y urológicos de rutina siguen siendo importantes después de los 50.',
    },
    'donaciones': {
      'ninez':'Todavía sos muy joven para donar sangre (se requieren 16 años), pero podés acompañar a un adulto a donar o guardar la idea para el futuro.',
      'adolescencia':'A partir de los 16 años ya podés donar sangre (con autorización de un adulto responsable hasta los 18). Es un buen momento para empezar el hábito.',
      'adultos':'Podés donar sangre hasta los 65 años, y a partir de los 18 sos donante de órganos automáticamente salvo que hayas expresado lo contrario ante el INCUCAI.',
      'mayores':'Podés donar sangre hasta los 65 años. Pasada esa edad, todavía podés colaborar difundiendo la donación o consultando por donación de córneas y otros tejidos, que no tienen el mismo límite de edad.',
    },
  };
  var lista = mensajes[categoria];
  if (!lista) return null;
  var msg = lista[rango];
  if (!msg) return null;
  var user = getUser();
  var sexo = (user && user.sexo) || auxiState.data.sexo;
  if (categoria === 'salud-fisica' && (rango === 'adultos' || rango === 'mayores')) {
    if (sexo === 'femenino') {
      msg += ' Sumá también mamografía cada 2 años desde los 40 y Papanicolau anual.';
    } else if (sexo === 'masculino' && rango === 'mayores') {
      msg += ' A partir de los 50 conviene consultar sobre control de próstata.';
    }
  }
  if (categoria === 'esi' && (rango === 'adolescencia' || rango === 'adultos' || rango === 'mayores')) {
    if (sexo === 'femenino') {
      msg += ' El Papanicolau anual es gratuito en hospitales públicos y CAPS, y es clave para la prevención.';
    } else if (sexo === 'masculino') {
      msg += ' Los controles urológicos y los test de ITS también son gratuitos en hospitales públicos, para vos y para tu pareja.';
    }
  }
  var etiquetaEdad = (user && user.edad) ? (user.edad+' años') : edadRangoLabel(rango);
  var banner = h('div',{style:'display:flex;gap:0.75rem;align-items:flex-start;background:var(--primario-claro);border:1px solid var(--primario);border-radius:10px;padding:0.85rem 1rem;margin-bottom:1.25rem;flex-wrap:wrap;'});
  banner.innerHTML = '<span style="font-size:1.1rem;flex-shrink:0;">👤</span>'
    +'<div style="flex:1;min-width:200px;"><div style="font-size:0.8rem;font-weight:700;color:var(--primario);margin-bottom:2px;">Para vos · '+etiquetaEdad+'</div>'
    +'<div style="font-size:0.82rem;color:var(--color-text);">'+msg+'</div></div>'
    +'<a href="#/mi-salud" onclick="navigate(\'/mi-salud\')" style="margin-left:auto;font-size:0.72rem;font-weight:700;color:var(--primario);text-decoration:none;flex-shrink:0;align-self:center;">Mi Salud →</a>';
  return banner;
}

function catBanner(title, subtitle, bgColors, svgContent) {
  const stops = bgColors.split(',').map(s=>s.trim());
  const grad = stops.length===3
    ? `linear-gradient(135deg,${stops[0]} 0%,${stops[1]} 55%,${stops[2]} 100%)`
    : `linear-gradient(135deg,${stops[0]},${stops[1]})`;
  const wrap = h('div',{class:'cat-banner',style:`background:${grad};`});
  const bg = h('div',{class:'cat-banner__bg'});
  bg.innerHTML = `<div style="width:300px;height:300px;border-radius:50%;background:rgba(255,255,255,0.06);position:absolute;right:-60px;top:-80px;"></div>`;
  wrap.appendChild(bg);
  const content = h('div',{class:'cat-banner__content'},[
    h('h1',{class:'cat-banner__title'},title),
    h('p',{class:'cat-banner__sub'},subtitle),
    h('button',{style:'margin-top:0.75rem;background:rgba(255,255,255,0.18);border:1.5px solid rgba(255,255,255,0.4);color:white;border-radius:8px;padding:5px 12px;font-size:0.8rem;font-weight:600;cursor:pointer;font-family:var(--font-body);',onclick:()=>navigate('/categorias')},'← Todas las categorías'),
  ]);
  wrap.appendChild(content);
  const iconWrap = h('div',{class:'cat-banner__icon'});
  iconWrap.innerHTML = svgContent;
  wrap.appendChild(iconWrap);
  return wrap;
}
function sectionTitle(title, sub) {
  const el = h('div',{});
  el.appendChild(h('div',{class:'section-divider'}));
  el.appendChild(h('h2',{class:'section-title'},title));
  if (sub) el.appendChild(h('p',{class:'section-sub'},sub));
  return el;
}
function mapaLink(label, url, desc) {
  const a = h('a',{class:'mapa-link',href:url,target:'_blank',rel:'noopener'});
  a.innerHTML = `<span class="mapa-link-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg></span><div><div class="mapa-link-title">${label}</div><div class="mapa-link-desc">${desc}</div></div><span class="mapa-link-arrow">Abrir →</span>`;
  return a;
}
function calLink(label, url, desc) {
  const a = h('a',{class:'cal-link',href:url,target:'_blank',rel:'noopener'});
  a.innerHTML = `<span class="cal-link-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></span><div><div class="cal-link-title">${label}</div><div class="cal-link-desc">${desc}</div></div><span class="cal-link-arrow">Ver →</span>`;
  return a;
}
function cardEl(ic, icon, title, desc, link, edadTags) {
  const c = h('div',{class:'card'});
  const destacar = edadTags && getEdadFiltro() && edadTags.indexOf(getEdadFiltro()) !== -1;
  if (destacar) { c.classList.add('card--destacada'); }
  c.innerHTML = `${destacar?'<div class="card-badge-edad">★ Recomendado para tu edad</div>':''}<div class="card-icon ${ic}">${icon}</div><h3>${title}</h3><p>${desc}</p>${link?`<a href="${link}" target="_blank" rel="noopener">Ver más →</a>`:''}`;
  return c;
}
// Reordena un arreglo de elementos ya construidos (cardEl, hospCard, etc.) poniendo primero
// los que están destacados para la edad activa, sin alterar el orden relativo dentro de cada grupo.
function ordenarDestacadasPrimero(elementos) {
  var destacados = [], resto = [];
  elementos.forEach(function(el){
    if (el && el.classList && el.classList.contains('card--destacada')) destacados.push(el);
    else resto.push(el);
  });
  return destacados.concat(resto);
}
function hospCard(name, esp, addr, tel) {
  const c = h('div',{class:'hosp-card'});
  c.innerHTML = `<p class="hosp-esp">${esp}</p><h4>${name}</h4><p>${addr}</p><span style="font-size:0.78rem;color:var(--primario);font-weight:700;">${tel}</span><br><a href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addr)}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:4px;margin-top:6px;font-size:0.75rem;color:var(--azul);font-weight:700;text-decoration:none;">📍 Cómo llegar</a>`;
  return c;
}
function contactoCard(num, label, desc) {
  const telNum = num.replace(/[^0-9+]/g,'');
  const c = h('div',{class:'contacto-card'});
  c.innerHTML = `<a href="tel:${telNum}" class="cnum" aria-label="Llamar al ${num}">${num}</a><h4>${label}</h4><p>${desc}</p><a href="tel:${telNum}" class="contacto-call-btn">Llamar ahora</a>`;
  return c;
}
function regionCard(region, info) { return h('div',{class:'region-card'},[h('h4',{},region),h('p',{},info)]); }
function paStep(num, title, desc) {
  return h('div',{class:'pa-step'},[h('div',{class:'pa-num'},String(num)),h('div',{},[h('h4',{},title),h('p',{},desc)])]);
}
function accItem(title, htmlContent) {
  const item = h('div',{class:'acc-item'});
  const btn = h('button',{class:'acc-btn',onclick:function(){this.classList.toggle('open');this.nextElementSibling.classList.toggle('open');}},[h('span',{},title),h('span',{class:'arrow'},'▾')]);
  const content = h('div',{class:'acc-content'});
  content.innerHTML = htmlContent;
  item.appendChild(btn); item.appendChild(content);
  return item;
}
function th(text) { return h('th',{},text); }
function vacRow(vacuna, para, donde, gratuita) {
  return h('tr',{},[h('td',{},vacuna),h('td',{},para),h('td',{},donde),h('td',{},[h('span',{class:gratuita?'badge badge-verde':'badge badge-naranja'},gratuita?'Gratuita':'Costo')])]);
}
function tabBtn(label, targetId, groupId, active) {
  return h('button',{class:'tab-btn'+(active?' active':''),onclick:`switchTab('${targetId}','${groupId}',this)`},label);
}
function voluntariosInline(area) {
  const w = h('div',{class:'voluntarios-inline'});
  w.innerHTML = `<div><p>¿Trabajás en ${area||'esta área'} y querés sumar recursos?</p><span>Profesionales, voluntarios, ONGs y organizaciones son bienvenidos.</span></div>`;
  const btn = h('button',{class:'btn btn--outline',onclick:()=>navigate('/sumate/ofrece')},'Sumate →');
  w.appendChild(btn);
  return w;
}

/* ============ VIEW: SALUD FÍSICA ============ */
function viewSaludFisica() {
  return h('div',{class:'view'},[
    catBanner('Salud Física','Hospitales públicos, guardias gratuitas y programas del Estado',
      '#e63946, #b5172b, #7a0e1a',
      `<svg viewBox="0 0 200 200" width="180" height="180" xmlns="http://www.w3.org/2000/svg"><rect x="70" y="30" width="60" height="140" rx="8" fill="rgba(255,255,255,0.18)"/><rect x="30" y="70" width="140" height="60" rx="8" fill="rgba(255,255,255,0.18)"/><rect x="82" y="42" width="36" height="116" rx="5" fill="rgba(255,255,255,0.55)"/><rect x="42" y="82" width="116" height="36" rx="5" fill="rgba(255,255,255,0.55)"/></svg>`
    ),
    h('div',{class:'main-content'},[
      edadFiltroChips(),
      (function(){var eb=edadBanner('salud-fisica');return eb;})(),
      h('div',{class:'section-block',id:'sec-hospitales'},[
        sectionTitle('Hospitales públicos','Atención gratuita · sin obra social'),
        mapaLink('Mapa de Hospitales y Centros de Salud CABA','https://buenosaires.gob.ar/salud/establecimientos-hospitales-y-centros-de-salud','Gobierno de la Ciudad · 35 hospitales + 50 CeSAC · Buscador interactivo'),
        h('div',{class:'grid-2'},[
          hospCard('Hospital Ramos Mejía','Clínica Médica · Guardia','Urquiza 609, CABA','4931-5252'),
          hospCard('Hospital Fernández','Guardia General · Traumatología','Cerviño 3356, CABA','4808-2600'),
          hospCard('Hospital Rivadavia','Clínica Médica · Maternidad','Las Heras 2670, CABA','4809-2000'),
          hospCard('Hospital Piñero','Guardia General','Varela 1301, CABA','4631-0041'),
          hospCard('Hospital Santojanni','Clínica General · Urgencias','Pilar 950, CABA','4630-0806'),
          hospCard('Hospital Tornú','Neumonología · Clínica','Combate de los Pozos 2063, CABA','4782-2531'),
          hospCard('Hospital de Niños Ricardo Gutiérrez','Pediatría · Guardia 24 hs','Gallo 1330, CABA','4962-9247'),
        ]),
      ]),
      h('div',{class:'section-block',id:'sec-vacunas'},[
        sectionTitle('Vacunas gratuitas','Calendario Nacional de Vacunación'),
        calLink('Calendario Nacional de Vacunación 2026','https://www.argentina.gob.ar/salud/vacunas','Ministerio de Salud · Gratuito · Sin orden médica · Todas las edades'),
        calLink('Vacunatorios y horarios CABA','https://buenosaires.gob.ar/salud/vacunas/calendario-de-vacunacion','Gobierno de la Ciudad · Descargá el calendario y consultá los vacunatorios'),
        h('div',{class:'table-wrap'},[
          h('table',{},[
            h('thead',{},[h('tr',{},[th('Vacuna'),th('Para quién'),th('Dónde'),th('Costo')])]),
            h('tbody',{},[
              vacRow('Triple bacteriana','Adultos cada 10 años','Vacunatorio público',true),
              vacRow('Antigripal','Grupos de riesgo','CAPS y hospitales',true),
              vacRow('COVID-19','Mayores de 6 meses','Vacunatorios',true),
              vacRow('HPV','11-13 años (ambos sexos)','Escuelas y CAPS',true),
              vacRow('Fiebre amarilla','Viajeros a zonas tropicales','Vacunatorio internacional',true),
              vacRow('Hepatitis B','Sin vacunación previa','CAPS y hospitales',true),
            ]),
          ]),
        ]),
      ]),
      h('div',{class:'section-block',id:'sec-programas'},[
        sectionTitle('Programas gratuitos'),
        h('div',{class:'grid-2'},ordenarDestacadasPrimero([
          cardEl('ic-verde','','Programa Remediar','Medicamentos gratuitos en CAPS para enfermedades crónicas.',null),
          cardEl('ic-azul','','PAMI','Cobertura integral gratuita para jubilados, pensionados y mayores de 70 sin obra social.','https://www.pami.org.ar',['mayores']),
          cardEl('ic-rojo','','SUMAR','Seguro público de salud gratuito para quienes no tienen obra social.','https://www.argentina.gob.ar/salud/sumarmas',['ninez','adolescencia','adultos']),
          cardEl('ic-naranja','','Maternidad e Infancia','Plan 1000 días · Controles gratuitos durante el embarazo y primeros años.',null,['ninez','adultos']),
        ])),
      ]),
      voluntariosInline('salud física'),
    ]),
  ]);
}

/* ============ VIEW: SALUD MENTAL ============ */
function viewSaludMental() {
  return h('div',{class:'view'},[
    catBanner('Salud Mental','Ayuda gratuita, confidencial y disponible las 24 horas',
      '#4361ee, #1a2a8c, #0a1050',
      `<svg viewBox="0 0 200 200" width="180" height="180" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="85" r="55" fill="rgba(255,255,255,0.18)"/><path d="M65 85 Q65 45 100 45 Q135 45 135 85 Q135 110 115 125 L115 145 Q115 150 110 150 L90 150 Q85 150 85 145 L85 125 Q65 110 65 85Z" fill="rgba(255,255,255,0.55)"/><rect x="90" y="155" width="20" height="14" rx="3" fill="rgba(255,255,255,0.55)"/><circle cx="82" cy="78" r="5" fill="rgba(255,255,255,0.9)"/><circle cx="118" cy="78" r="5" fill="rgba(255,255,255,0.9)"/><path d="M88 97 Q100 108 112 97" stroke="rgba(255,255,255,0.9)" stroke-width="4" fill="none" stroke-linecap="round"/></svg>`
    ),
    h('div',{class:'main-content'},[
      edadFiltroChips(),
      (function(){var eb=edadBanner('salud-mental');return eb;})(),
      h('div',{class:'aviso aviso-info'},[h('span',{},'ℹ️'),h('div',{},'Si estás en crisis ahora mismo, llamá al 135 (gratuito, 24 horas). No estás solo/a.')]),
      h('div',{class:'section-block',id:'sec-lineas'},[
        sectionTitle('Líneas de ayuda gratuitas'),
        h('div',{class:'grid-4'},[
          contactoCard('135','Crisis emocional · CABA','24 hs · gratuito · confidencial'),
          contactoCard('0800-999-0135','Crisis emocional · Nacional','Gratuito desde todo el país'),
          contactoCard('144','Violencia de género','24 hs · gratuito'),
          contactoCard('102','Niñez en riesgo','SENNAF · gratuito'),
        ]),
        (function(){ var smr = contactoCard('0800-333-1665','Salud Mental Responde (CABA)','Orientación telefónica gratuita del Gobierno de la Ciudad'); smr.style.marginTop='8px'; return smr; })(),
      ]),
      h('div',{class:'section-block',id:'sec-salud-mental'},[
        sectionTitle('Psicólogos y centros gratuitos'),
        h('div',{class:'grid-2'},[
          hospCard('Hospital Borda','Psiquiatría · Adultos','Ramón Carrillo 375, CABA','4305-4646'),
          hospCard('Hospital Moyano','Psiquiatría · Mujeres','Brandsen 2570, CABA','4308-4600'),
          hospCard('Hospital Tobar García','Psiquiatría · Infanto-juvenil (hasta 18 años)','Ramón Carrillo 315, CABA','4305-6108'),
          hospCard('CeSAC (54 en CABA)','Atención primaria · salud mental','Según tu barrio','Ver mapa GCBA'),
        ]),
        (function(){ var cesacLink = mapaLink('Buscá un CeSAC cerca tuyo','https://buenosaires.gob.ar/salud/cesac','Red de 54 centros en toda la Ciudad · Turnos gratuitos · Atención psicológica'); cesacLink.style.marginTop = '10px'; return cesacLink; })(),
      ]),
      h('div',{class:'section-block',id:'sec-salud-mental-edad'},[
        sectionTitle('Según tu etapa de vida'),
        h('div',{class:'grid-2'},ordenarDestacadasPrimero([
          cardEl('ic-azul','','Hospital Tobar García','Especializado en niñez y adolescencia (hasta 18 años). Guardia y consultorios externos.','https://buenosaires.gob.ar/hospitaltobargarcia',['ninez','adolescencia']),
          cardEl('ic-verde','','Centros de Día (CABA)','Espacios gratuitos de contención, actividades y socialización para mayores de 60 años.','https://buenosaires.gob.ar/vicejefatura/bienestar-integral/puntos-de-bienestar/centros-de-dia',['mayores']),
        ])),
      ]),
      h('div',{class:'section-block'},[
        sectionTitle('Herramientas de bienestar'),
        h('div',{class:'grid-2'},[
          cardEl('ic-azul','','Técnica 4-7-8 (respiración)','Inhalá 4 seg, retené 7, exhalá 8. Reduce la ansiedad en minutos.',null),
          cardEl('ic-verde','','Grounding 5-4-3-2-1','Nombrá 5 cosas que ves, 4 que tocás, 3 que oís, 2 que olés, 1 que saboreás.',null),
          cardEl('ic-naranja','','Municipios Saludables','Programa nacional con recursos en todo el país.','https://www.argentina.gob.ar/salud/municipios'),
          cardEl('ic-rojo','','SEDRONAR','Orientación en consumo problemático.','https://www.argentina.gob.ar/sedronar'),
        ]),
      ]),
      voluntariosInline('salud mental'),
    ]),
  ]);
}

/* ============ VIEW: ESI ============ */
function viewESI() {
  var esNinezESI = getEdadFiltro() === 'ninez';
  return h('div',{class:'view'},[
    catBanner('ESI','Educación Sexual Integral · Derechos y acceso gratuito',
      '#00b894, #007d5a, #00462f',
      `<svg viewBox="0 0 200 200" width="180" height="180" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="100" r="65" fill="rgba(255,255,255,0.15)"/><path d="M100 45 C70 45 50 65 50 90 C50 130 100 160 100 160 C100 160 150 130 150 90 C150 65 130 45 100 45Z" fill="rgba(255,255,255,0.5)"/><circle cx="100" cy="96" r="18" fill="rgba(255,255,255,0.8)"/><circle cx="100" cy="96" r="9" fill="rgba(0,123,90,0.6)"/></svg>`
    ),
    esNinezESI ? h('div',{class:'main-content'},[
      edadFiltroChips(),
      (function(){var eb=edadBanner('esi');return eb;})(),
      h('div',{class:'aviso aviso-info'},[h('span',{},'ℹ️'),h('div',{},'En la niñez, la Educación Sexual Integral (Ley 26.150) se enfoca en el cuidado del propio cuerpo, el respeto y la prevención del abuso — siempre acompañado por un adulto de confianza.')]),
      h('div',{class:'section-block'},[
        sectionTitle('Cuidado del cuerpo y respeto'),
        h('div',{class:'grid-2'},[
          cardEl('ic-verde','','Mi cuerpo es mío','Tenés derecho a decidir quién te toca y cómo. Está bien decir que no, incluso a un familiar.',null),
          cardEl('ic-azul','','Buen trato y mal trato','Aprender a reconocer situaciones que no están bien y que siempre se le pueden contar a un adulto de confianza.',null),
        ]),
      ]),
      h('div',{class:'section-block'},[
        sectionTitle('A quién pedir ayuda'),
        h('div',{class:'grid-2'},[
          cardEl('ic-rojo','','Línea 102','Niñez y adolescencia · gratuita · las 24 horas.',null),
          cardEl('ic-naranja','','Línea 137','Ante situaciones de abuso o violencia · gratuita.',null),
        ]),
      ]),
      h('div',{class:'section-block'},[
        sectionTitle('Identidad y derechos'),
        h('div',{class:'grid-2'},[
          cardEl('ic-verde','','Identidad de género','Ley 26.743: cambio registral gratuito y sin requisitos médicos.',null),
          cardEl('ic-azul','','INADI','Atención ante discriminación.','https://www.argentina.gob.ar/inadi'),
        ]),
      ]),
      voluntariosInline('ESI y derechos'),
    ]) : h('div',{class:'main-content'},[
      edadFiltroChips(),
      (function(){var eb=edadBanner('esi');return eb;})(),
      h('div',{class:'aviso aviso-info'},[h('span',{},'ℹ️'),h('div',{},'La ESI (Ley 26.150) y el Programa de Salud Sexual (Ley 25.673) garantizan acceso gratuito a métodos anticonceptivos, información y atención en todo el país.')]),
      h('div',{class:'section-block'},[
        sectionTitle('Métodos anticonceptivos gratuitos','Disponibles en hospitales y CAPS sin receta obligatoria'),
        h('div',{class:'grid-2'},ordenarDestacadasPrimero([
          cardEl('ic-verde','','Pastillas anticonceptivas','Gratuitas en hospitales públicos y CAPS. Pedí en farmacia hospitalaria.',null,['adolescencia','adultos','mayores']),
          cardEl('ic-verde','','Preservativos','Gratuitos en hospitales, CAPS y algunos centros comunitarios.',null,['adolescencia','adultos','mayores']),
          cardEl('ic-azul','','DIU (espiral)','Colocación gratuita en hospitales públicos con turno médico.',null,['adultos','mayores']),
          cardEl('ic-azul','','Implante subdérmico','Disponible gratuitamente con turno en hospitales públicos.',null,['adolescencia','adultos']),
          cardEl('ic-naranja','','Inyectable anticonceptivo','En CAPS y hospitales públicos. Consultá por disponibilidad.',null,['adultos','mayores']),
          cardEl('ic-rojo','','Anticoncepción de emergencia','Pastilla del día después: gratuita en CAPS y farmacias del plan Remediar.',null,['adolescencia','adultos']),
        ])),
      ]),
      h('div',{class:'section-block'},[
        sectionTitle('Interrupción Voluntaria del Embarazo (IVE)','Ley 27.610 · Gratuita hasta la semana 14'),
        h('div',{class:'aviso aviso-warn'},[h('span',{},'⚠️'),h('div',{},'La IVE es un derecho legal en Argentina (Ley 27.610). Podés solicitarla en hospitales y CAPS hasta la semana 14 de gestación, o en cualquier momento en casos de violación o riesgo para la salud.')]),
        h('div',{class:'grid-2'},[
          cardEl('ic-rojo','','Dónde acceder','Hospitales y CAPS públicos. No necesitás permiso de nadie más.',null),
          cardEl('ic-azul','','Acompañamiento','Podés ir sola o con quien elijas. Tenés derecho a información clara.',null),
        ]),
      ]),
      h('div',{class:'section-block'},[
        sectionTitle('Identidad y derechos'),
        h('div',{class:'grid-2'},[
          cardEl('ic-verde','','Identidad de género','Ley 26.743: cambio registral gratuito y sin requisitos médicos.',null),
          cardEl('ic-azul','','INADI','Atención ante discriminación por orientación o identidad.','https://www.argentina.gob.ar/inadi'),
          cardEl('ic-naranja','','Violencia de género','Línea 144 · 24 hs · gratuita · confidencial.',null),
          cardEl('ic-rojo','','Asesoría legal gratuita','Consultorios jurídicos universitarios y defensorías del pueblo.',null),
        ]),
      ]),
      voluntariosInline('ESI y derechos'),
    ]),
  ]);
}

/* ============ VIEW: MASCOTAS ============ */
function viewAnimales() {
  return h('div',{class:'view'},[
    catBanner('Animales','Veterinarias gratuitas, vacunas y primeros auxilios',
      '#f4a200, #c97c00, #7a4900',
      `<svg viewBox="0 0 200 200" width="180" height="180" xmlns="http://www.w3.org/2000/svg"><ellipse cx="100" cy="120" rx="45" ry="38" fill="rgba(255,255,255,0.5)"/><circle cx="100" cy="78" r="28" fill="rgba(255,255,255,0.5)"/><ellipse cx="76" cy="60" rx="14" ry="22" fill="rgba(255,255,255,0.35)" transform="rotate(-15 76 60)"/><ellipse cx="124" cy="60" rx="14" ry="22" fill="rgba(255,255,255,0.35)" transform="rotate(15 124 60)"/><circle cx="90" cy="75" r="5" fill="rgba(255,255,255,0.9)"/><circle cx="110" cy="75" r="5" fill="rgba(255,255,255,0.9)"/><ellipse cx="100" cy="88" rx="8" ry="5" fill="rgba(255,255,255,0.8)"/></svg>`
    ),
    h('div',{class:'main-content'},[
      h('div',{class:'section-block',id:'sec-lineas-animales'},[
        sectionTitle('Líneas de ayuda','No existe una línea gratuita de emergencia veterinaria 24 hs equivalente al SAME — para una urgencia, la opción real es una guardia veterinaria (ver más abajo)'),
        contactoCard('0800-333-7225','Denuncia de maltrato animal','Línea oficial y gratuita del Gobierno de la Ciudad para denunciar maltrato o abandono.'),
      ]),
      h('div',{class:'section-block',id:'sec-veterinarias'},[
        sectionTitle('Guardias y veterinarias gratuitas','CABA y Gran Buenos Aires'),
        mapaLink('Centros veterinarios y cronograma semanal CABA','https://buenosaires.gob.ar/agenciaambiental/mascotas/atencion-veterinaria-y-castraciones-gratuitas','Gobierno de la Ciudad · 8 móviles + 2 centros fijos · Castración y vacunación gratuita'),
        h('div',{class:'grid-2'},[
          cardEl('ic-naranja','','Centro Veterinario Costanera Sur','Av. Costanera Rafael Obligado s/n, CABA. Lunes a viernes.',null),
          cardEl('ic-naranja','','Centro Veterinario Villa Soldati','Llorente 2059, CABA. Lunes a viernes.',null),
          cardEl('ic-verde','','Móviles veterinarios CABA','Recorren distintos barrios. Consultá el cronograma semanal en el sitio del GCBA.',null),
          cardEl('ic-azul','','Zoonosis CABA','Boyacá 501, CABA. Atención de mordeduras y enfermedades transmisibles.','https://buenosaires.gob.ar'),
        ]),
      ]),
      h('div',{class:'section-block',id:'sec-vacunacion-animals'},[
        sectionTitle('Vacunación gratuita','Para perros y gatos'),
        calLink('Cronograma vacunación antirrábica gratuita CABA','https://buenosaires.gob.ar/agenciaambiental/mascotas/atencion-veterinaria-y-castraciones-gratuitas','Sin turno previo · Perros y gatos · Obligatoria por ley (Ley 22.953)'),
        calLink('Turno online castración gratuita (MiBA)','https://buenosaires.gob.ar/agenciaambiental/mascotas/atencion-veterinaria-y-castraciones-gratuitas','Turnos disponibles cada viernes a las 10 hs · Centros fijos: Villa Soldati y Costanera Sur'),
        h('div',{class:'grid-2'},[
          cardEl('ic-verde','','Vacuna antirrábica','Obligatoria para perros y gatos. Gratuita en operativos y centros fijos del GCBA.',null),
          cardEl('ic-azul','','Vacunas múltiples','Consultar disponibilidad en centros veterinarios. Algunos CAPS veterinarios las aplican gratuitamente.',null),
        ]),
      ]),
      h('div',{class:'section-block',id:'sec-pa-animals'},[
        sectionTitle('Primeros auxilios para tu animal'),
        h('div',{class:'pa-steps'},[
          paStep(1,'Atragantamiento','Abrí la boca con cuidado, extraé el objeto si lo ves. No introduzcas los dedos a ciegas. Llevá al veterinario inmediatamente.'),
          paStep(2,'Golpe o trauma','Mantené al animal quieto, cubrilo con una manta. No lo muevas bruscamente. Llamá a la guardia veterinaria.'),
          paStep(3,'Intoxicación','No induzcas el vómito sin consultar. Llamá al veterinario y llevá el envase del tóxico si es posible.'),
          paStep(4,'Convulsiones','No sujetes al animal. Alejá objetos peligrosos. Cronometrá la duración. Llevalo al veterinario después.'),
          paStep(5,'Heridas graves','Comprimí con un trapo limpio. No apliques alcohol directamente. Dirigite a guardia veterinaria.'),
        ]),
      ]),
      voluntariosInline('atención veterinaria'),
    ]),
  ]);
}

/* ============ VIEW: PRIMEROS AUXILIOS ============ */
let quizState = {q:0,score:0,answered:false};
const quizData = [
  {q:'¿Cuántas compresiones por minuto se hacen en RCP adultos?',opts:['60-80','100-120','140-160','Menos de 60'],correct:1,exp:'100-120 compresiones por minuto, con una profundidad de 5-6 cm.'},
  {q:'En caso de atragantamiento, ¿qué hacés primero?',opts:['Golpes en la espalda','Maniobra de Heimlich directa','Meter los dedos en la boca','Llamar al 107 y esperar'],correct:0,exp:'5 golpes secos entre los omóplatos. Si no funciona, pasás a la maniobra de Heimlich.'},
  {q:'¿Qué significa FAST en el contexto de un ACV?',opts:['Frecuencia, Alerta, Seguridad, Tiempo','Cara, Brazo, Habla, Tiempo','Frecuencia, Amplitud, Soporte, Temperatura','Ninguna de las anteriores'],correct:1,exp:'Face (cara), Arm (brazo), Speech (habla), Time (tiempo). Si identificás alguno, llamá al 107.'},
  {q:'En una quemadura leve, ¿qué hacés?',opts:['Aplicar pasta de dientes','Pinchar las ampollas','Agua fría por 10-20 minutos','Cubrir con algodón'],correct:2,exp:'Agua fría corriente (no helada) por al menos 10 minutos. No reventar ampollas ni aplicar cremas caseras.'},
  {q:'Si alguien está inconsciente y respira, ¿qué posición le das?',opts:['Boca arriba con piernas elevadas','Posición lateral de seguridad','Sentado con cabeza entre las rodillas','Boca abajo'],correct:1,exp:'Posición lateral de seguridad (PLS): de costado, para evitar que se ahogue con vómito.'},
  {q:'¿Cada cuántos segundos se da una respiración en RCP adultos (con 2 personas)?',opts:['Cada 3 compresiones','Cada 15 compresiones','Cada 30 compresiones','Cada 5 compresiones'],correct:2,exp:'30 compresiones y 2 ventilaciones. Si estás solo, podés hacer RCP solo con compresiones.'},
];
function renderQuestion() {
  const qd = quizData[quizState.q];
  const block = h('div',{class:'section-block'});
  const progress = h('div',{class:'quiz-progress'});
  quizData.forEach((_,i)=>{const d=h('div',{class:'quiz-dot'+(i<quizState.q?' done':'')});progress.appendChild(d);});
  block.appendChild(progress);
  const qEl = h('div',{class:'quiz-q'},`${quizState.q+1}. ${qd.q}`);
  block.appendChild(qEl);
  const optsEl = h('div',{class:'quiz-opts'});
  qd.opts.forEach((o,i)=>{
    const btn = h('button',{class:'quiz-opt',onclick:()=>{
      if(quizState.answered)return;
      quizState.answered=true;
      if(i===qd.correct){quizState.score++;btn.classList.add('correct');}
      else{btn.classList.add('wrong');optsEl.children[qd.correct].classList.add('correct');}
      const exp=h('p',{style:'font-size:0.82rem;color:var(--gris);margin-top:0.75rem;padding:0.6rem;background:var(--gris-claro);border-radius:6px;'},qd.exp);
      const next=h('button',{class:'btn btn--primary',style:'margin-top:0.75rem;',onclick:()=>{
        quizState.q++;quizState.answered=false;
        document.getElementById('quiz-container').innerHTML='';
        const c=document.getElementById('quiz-container');
        c.appendChild(quizState.q<quizData.length?renderQuestion():renderQuizResult());
      }},quizState.q+1<quizData.length?'Siguiente →':'Ver resultado');
      block.appendChild(exp);block.appendChild(next);
    }},o);
    optsEl.appendChild(btn);
  });
  block.appendChild(optsEl);
  return block;
}
function renderQuizResult() {
  const pct=Math.round((quizState.score/quizData.length)*100);
  const block=h('div',{class:'section-block',style:'text-align:center;'});
  block.innerHTML=`<div style="font-size:3rem;margin-bottom:0.5rem;">${pct>=80?'🎉':pct>=50?'👍':'📚'}</div><h3>Resultado: ${quizState.score}/${quizData.length} (${pct}%)</h3><p style="color:var(--color-text-muted);">${pct>=80?'¡Excelente! Estás muy bien preparado/a.':pct>=50?'Buen trabajo. Repasá los errores para estar más seguro/a.':'Te recomendamos repasar los pasos básicos de primeros auxilios.'}</p>`;
  const restart=h('button',{class:'btn btn--outline',onclick:()=>{quizState={q:0,score:0,answered:false};document.getElementById('quiz-container').innerHTML='';document.getElementById('quiz-container').appendChild(renderQuestion());}},'Reintentar');
  block.appendChild(restart);
  return block;
}

function viewPrimerosAuxilios() {
  const view = h('div',{class:'view'});
  view.appendChild(catBanner('Primeros Auxilios','Guías paso a paso para actuar en emergencias',
    '#f77f00, #d45a1a, #8a3200',
    `<svg viewBox="0 0 200 200" width="180" height="180" xmlns="http://www.w3.org/2000/svg"><rect x="60" y="30" width="80" height="140" rx="12" fill="rgba(255,255,255,0.18)"/><rect x="30" y="60" width="140" height="80" rx="12" fill="rgba(255,255,255,0.18)"/><rect x="72" y="42" width="56" height="116" rx="8" fill="rgba(255,255,255,0.6)"/><rect x="42" y="72" width="116" height="56" rx="8" fill="rgba(255,255,255,0.6)"/></svg>`
  ));
  const mc = h('div',{class:'main-content'});
  // Tabs
  const tabBar = h('div',{class:'tab-bar'},[
    tabBtn('RCP','tab-rcp','pa-tabs',true),
    tabBtn('Atragantamiento','tab-atrag','pa-tabs',false),
    tabBtn('ACV','tab-acv','pa-tabs',false),
    tabBtn('Quemaduras','tab-quem','pa-tabs',false),
    tabBtn('Quiz','tab-quiz','pa-tabs',false),
  ]);
  mc.appendChild(tabBar);
  const tabs = h('div',{id:'pa-tabs'});
  // RCP
  const tabRcp = h('div',{class:'tab-panel active',id:'tab-rcp'});
  tabRcp.appendChild(sectionTitle('RCP — Reanimación Cardiopulmonar','La técnica cambia según la edad de quien necesita ayuda — buscá la sección correcta'));
  tabRcp.appendChild(h('div',{class:'aviso aviso-info'},[h('span',{},'ℹ️'),h('div',{},'Estos pasos no reemplazan un curso de RCP presencial. Fuente: Ministerio de Salud de la Nación.')]));
  tabRcp.appendChild(h('h4',{style:'margin:1.25rem 0 0.5rem;color:var(--primario);'},'👶 Bebés (menos de 1 año)'));
  const rcpBebes = h('div',{class:'pa-steps'});
  [['Verificar','Fijate si respira: observá si se mueve el pecho. Colocalo boca arriba sobre una superficie firme.'],
   ['Pedir ayuda','Si no respira o no reacciona, pedile a alguien que llame al 107. Si estás solo, hacé 2 minutos de RCP antes de llamar vos.'],
   ['Posición de las manos','Dos dedos (índice y medio) en el centro del pecho, entre los pezones — o rodealo con ambas manos y presioná con los pulgares.'],
   ['Compresiones','30 compresiones seguidas, unos 4 cm de profundidad, a 100-120 por minuto.'],
   ['Ventilaciones','Cubrí con tu boca la boca Y la nariz del bebé. 2 soplidos suaves de 1 segundo cada uno, que eleven apenas el pecho.'],
   ['Continuar','Repetí el ciclo de 30 compresiones + 2 ventilaciones hasta que se mueva o llegue ayuda. No inclines demasiado su cabeza hacia atrás.']]
   .forEach(([t,d],i)=>rcpBebes.appendChild(paStep(i+1,t,d)));
  tabRcp.appendChild(rcpBebes);
  tabRcp.appendChild(h('h4',{style:'margin:1.5rem 0 0.5rem;color:var(--primario);'},'🧒 Niños (1 a 8 años aprox.)'));
  const rcpNinos = h('div',{class:'pa-steps'});
  [['Verificar y pedir ayuda','Igual que en adultos: verificá que respire y pedí que llamen al 107.'],
   ['Posición de las manos','El talón de una mano en el centro del pecho (dos manos si el niño es grande o mayor a 12 años).'],
   ['Compresiones','30 compresiones de unos 5 cm de profundidad, a 100-120 por minuto.'],
   ['Ventilaciones','Tapá la nariz con tus dedos y soplá 2 veces (1 segundo cada una) en la boca, con cuidado de no inclinar demasiado la cabeza.'],
   ['Continuar','Alterná 30 compresiones y 2 ventilaciones hasta que llegue ayuda.']]
   .forEach(([t,d],i)=>rcpNinos.appendChild(paStep(i+1,t,d)));
  tabRcp.appendChild(rcpNinos);
  tabRcp.appendChild(h('h4',{style:'margin:1.5rem 0 0.5rem;color:var(--primario);'},'🧑 Adultos y adolescentes'));
  const rcpSteps = h('div',{class:'pa-steps'});
  [['Verificar seguridad','Asegurate de que el entorno sea seguro para vos y la persona.'],['Verificar consciencia','Sacudí suavemente los hombros. "¿Estás bien?"'],['Llamar al 107','Pedí a alguien que llame. Si estás solo, hacelo vos y activá el altavoz.'],['Posición de las manos','Talón de la mano en el centro del pecho, otra mano encima, dedos entrelazados.'],['Compresiones','Presioná fuerte y rápido: 100-120 por minuto, 5-6 cm de profundidad. Dejá que el pecho suba.'],['Ventilaciones (si podés)','Cada 30 compresiones, 2 ventilaciones. Si no estás entrenado, solo compresiones.'],['Continuá','Hasta que llegue ayuda, la persona respire, o no puedas más.']].forEach(([t,d],i)=>rcpSteps.appendChild(paStep(i+1,t,d)));
  tabRcp.appendChild(rcpSteps);
  tabs.appendChild(tabRcp);
  // Atragantamiento
  const tabAtrag = h('div',{class:'tab-panel',id:'tab-atrag'});
  tabAtrag.appendChild(sectionTitle('Atragantamiento','La maniobra cambia según la edad — buscá la sección correcta'));
  tabAtrag.appendChild(h('h4',{style:'margin:0.5rem 0 0.5rem;color:var(--primario);'},'👶 Bebés (menos de 1 año)'));
  const atBebes = h('div',{class:'pa-steps'});
  [['¿Llora o tose fuerte?','Si el bebé llora, tose fuerte o balbucea, dejalo intentar expulsarlo solo. No le golpees la espalda todavía.'],
   ['Posición','Sentate y apoyalo boca abajo sobre tu antebrazo, con la cabeza más baja que el cuerpo, sosteniéndole la mandíbula.'],
   ['5 golpes en la espalda','Con el talón de tu mano, entre los omóplatos.'],
   ['5 compresiones en el pecho','Si no sale el objeto, girá al bebé boca arriba y hacé 5 compresiones en el centro del pecho, como en la RCP (nunca compresiones abdominales en bebés).'],
   ['Alternar','Repetí golpes y compresiones hasta que salga el objeto o el bebé pierda el conocimiento — ahí iniciá RCP.']]
   .forEach(([t,d],i)=>atBebes.appendChild(paStep(i+1,t,d)));
  tabAtrag.appendChild(atBebes);
  tabAtrag.appendChild(h('h4',{style:'margin:1.5rem 0 0.5rem;color:var(--primario);'},'🧒 Niños mayores de 1 año y adultos'));
  const atSteps = h('div',{class:'pa-steps'});
  [['¿Puede toser?','Si puede toser, animalo a seguir tosiendo. No hagas nada más todavía.'],['Golpes en la espalda','5 golpes secos entre los omóplatos con el talón de la mano.'],['Maniobra de Heimlich','Parate detrás. Rodalo con los brazos. Puño justo arriba del ombligo. 5 compresiones hacia adentro y arriba.'],['Alternar','Alterná golpes y compresiones hasta que salga el objeto o la persona pierda el conocimiento.'],['Si pierde el conocimiento','Iniciá RCP inmediatamente. Antes de cada ventilación, revisá si ves el objeto en la boca.']].forEach(([t,d],i)=>atSteps.appendChild(paStep(i+1,t,d)));
  tabAtrag.appendChild(atSteps);
  tabs.appendChild(tabAtrag);
  // ACV
  const tabAcv = h('div',{class:'tab-panel',id:'tab-acv'});
  tabAcv.appendChild(sectionTitle('ACV — Accidente Cerebrovascular','Método FAST'));
  const acvSteps = h('div',{class:'pa-steps'});
  [['F — Cara (Face)','Pedile que sonría. ¿Cae un lado de la boca? Eso es una señal de ACV.'],['A — Brazo (Arm)','Pedile que levante ambos brazos. ¿Uno cae involuntariamente?'],['S — Habla (Speech)','Pedile que repita una frase simple. ¿Habla raro, lento o con palabras confusas?'],['T — Tiempo (Time)','Si detectás alguno de estos signos, llamá al 107 INMEDIATAMENTE. Cada minuto cuenta.'],['Mientras esperás','No le des de comer ni tomar. No le des aspirinas sin indicación médica. Mantelo despierto.']].forEach(([t,d],i)=>acvSteps.appendChild(paStep(i+1,t,d)));
  tabAcv.appendChild(acvSteps);
  tabs.appendChild(tabAcv);
  // Quemaduras
  const tabQuem = h('div',{class:'tab-panel',id:'tab-quem'});
  tabQuem.appendChild(sectionTitle('Quemaduras','Qué hacer y qué NO hacer'));
  const qSteps = h('div',{class:'pa-steps'});
  [['Agua fría','Corriente fría (no helada) por 10-20 minutos. Alivía el dolor y frena el daño.'],['No toques las ampollas','Reventarlas aumenta el riesgo de infección.'],['No uses pasta de dientes ni aceite','Solo agua. Los remedios caseros empeoran las quemaduras.'],['Cubrir levemente','Gasa limpia o trapo húmedo sin presionar.'],['Buscar atención médica','Si la quemadura es grande, profunda, en cara/manos/genitales, o en un niño, ir a guardia.']].forEach(([t,d],i)=>qSteps.appendChild(paStep(i+1,t,d)));
  tabQuem.appendChild(qSteps);
  tabs.appendChild(tabQuem);
  // Quiz
  const tabQuiz = h('div',{class:'tab-panel',id:'tab-quiz'});
  tabQuiz.appendChild(sectionTitle('Quiz de Primeros Auxilios','Ponete a prueba'));
  quizState = {q:0,score:0,answered:false};
  const quizContainer = h('div',{id:'quiz-container'});
  quizContainer.appendChild(renderQuestion());
  tabQuiz.appendChild(quizContainer);
  tabs.appendChild(tabQuiz);
  mc.appendChild(tabs);
  mc.appendChild(voluntariosInline('primeros auxilios'));
  view.appendChild(mc);
  return view;
}
function switchTab(targetId, groupId, btn) {
  document.querySelectorAll('#'+groupId+' .tab-panel').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
  const t=document.getElementById(targetId);
  if(t)t.classList.add('active');
  if(btn)btn.classList.add('active');
}

/* ============ VIEW: EMERGENCIAS (rediseñada) ============ */
let emgSintomasState = { zona:[], sensacion:[], cuando:'' };
function viewEmergencias() {
  const view = h('div',{class:'view'});
  view.appendChild(catBanner('Emergencias','Números de emergencia y protocolos de actuación',
    '#d00000, #8b1a12, #3d0000',
    `<svg viewBox="0 0 200 200" width="180" height="180" xmlns="http://www.w3.org/2000/svg"><rect x="20" y="90" width="130" height="65" rx="8" fill="rgba(255,255,255,0.55)"/><rect x="120" y="75" width="50" height="80" rx="8" fill="rgba(255,255,255,0.45)"/><rect x="128" y="82" width="34" height="30" rx="4" fill="rgba(255,255,255,0.7)"/><rect x="55" y="96" width="8" height="24" rx="2" fill="rgba(192,57,43,0.7)"/><rect x="47" y="104" width="24" height="8" rx="2" fill="rgba(192,57,43,0.7)"/><circle cx="60" cy="158" r="20" fill="rgba(255,255,255,0.3)"/><circle cx="60" cy="158" r="12" fill="rgba(255,255,255,0.5)"/><circle cx="148" cy="158" r="20" fill="rgba(255,255,255,0.3)"/><circle cx="148" cy="158" r="12" fill="rgba(255,255,255,0.5)"/><rect x="122" y="68" width="18" height="10" rx="4" fill="rgba(255,80,80,0.8)"/><rect x="143" y="68" width="18" height="10" rx="4" fill="rgba(80,80,255,0.6)"/></svg>`
  ));
  const mc = h('div',{class:'main-content'});

  // Auxi acompaña
  const auxiBar = h('div',{style:'display:flex;align-items:center;gap:1rem;background:var(--primario-claro);border:1px solid var(--primario);border-radius:var(--radius);padding:1rem;margin-bottom:1.5rem;'});
  auxiBar.innerHTML = `<div style="flex-shrink:0;">${AUXI_SVG('caring').replace('width="120px" height="120px"','width="60px" height="60px"')}</div><div><p style="margin:0;font-weight:600;color:var(--primario);">Estoy acá. Respirá. Vamos paso a paso.</p><p style="margin:0;font-size:0.82rem;color:var(--gris);">Si necesitás ayuda inmediata, llamá al 107 o al 911.</p></div>`;
  mc.appendChild(auxiBar);

  // Números principales
  const numSection = h('div',{class:'section-block',id:'sec-contactos'});
  numSection.appendChild(sectionTitle('Llamá ahora','Todos gratuitos · 24 horas'));
  const numGrid = h('div',{class:'grid-4'});
  [['911','Policía · Emergencias generales','24 hs'],
   ['107','SAME · Ambulancias CABA','24 hs · Gratuito'],
   ['100','Bomberos','Nacional · Gratuito'],
   ['144','Violencia de género','24 hs · Gratuito'],
   ['135','Crisis emocional','24 hs · Gratuito'],
   ['137','Violencia familiar','Asistencia inmediata'],
   ['102','Niñez y adolescencia','SENNAF'],
   ['103','Defensa Civil','Inundaciones · desastres'],
  ].forEach(([n,l,d])=>numGrid.appendChild(contactoCard(n,l,d)));
  numSection.appendChild(numGrid);
  mc.appendChild(numSection);

  // Ubicación y hospitales cercanos
  const ubicSection = h('div',{class:'section-block'});
  ubicSection.appendChild(sectionTitle('Encontrá ayuda cercana'));
  const ubicBtn = h('button',{class:'btn btn--primary',onclick:()=>{
    if(!navigator.geolocation){ showToast('Tu navegador no soporta geolocalización'); return; }
    navigator.geolocation.getCurrentPosition(pos=>{
      const {latitude:lat,longitude:lng} = pos.coords;
      window.open(`https://www.google.com/maps/search/hospitales+guardias+médicas/@${lat},${lng},14z`,'_blank');
    }, ()=>showToast('No se pudo obtener tu ubicación'));
  }},'Ver hospitales cercanos en Google Maps');
  ubicSection.appendChild(ubicBtn);
  mc.appendChild(ubicSection);

  // Resumen de emergencia
  const resumenSection = h('div',{class:'section-block'});
  resumenSection.appendChild(sectionTitle('Resumen de emergencia','Para compartir con el servicio de emergencias'));

  // Síntomas guiados por Auxi
  const sintStep = h('div',{id:'sint-step'});
  const user = getUser();

  const auxiSintBar = h('div',{style:'background:var(--primario-claro);border:1px solid var(--primario);border-radius:var(--radius);padding:0.85rem 1rem;margin-bottom:0.75rem;'});
  auxiSintBar.innerHTML = `<p style="margin:0;font-size:0.88rem;color:var(--primario);font-weight:600;">¿Tenés un momento para describir lo que sentís? Voy a ayudarte a armar un resumen para el servicio de emergencias.</p>`;
  const sintBtns = h('div',{style:'display:flex;gap:8px;margin-top:0.65rem;'});
  addBtn(sintBtns,'Sí, tengo un momento','primary',()=>{
    auxiSintBar.style.display='none'; sintBtns.style.display='none';
    renderSintomasGuiados(sintStep, user);
  });
  addBtn(sintBtns,'No, ver resumen básico','',()=>{
    auxiSintBar.style.display='none'; sintBtns.style.display='none';
    mostrarResumen(sintStep, user, {});
  });
  sintStep.appendChild(auxiSintBar);
  sintStep.appendChild(sintBtns);
  resumenSection.appendChild(sintStep);
  mc.appendChild(resumenSection);

  // Protocolos
  const protSection = h('div',{class:'section-block',id:'sec-protocolos'});
  protSection.appendChild(sectionTitle('Protocolos de actuación'));
  const accordion = h('div',{class:'accordion'});
  [['Accidente de tráfico','<p><strong>No muevas a los heridos</strong> salvo peligro inmediato. Llamá al 107 y al 911. Señalizá el área. Prestá primeros auxilios básicos si sabés.</p>'],
   ['Incendio','<p>Llamá al 100. Evacuá por escaleras, nunca ascensor. Si hay humo, agachate. Si la ropa se prende, detente, caé al suelo y rodá.</p>'],
   ['Inundación','<p>No camines por agua en movimiento. 30 cm pueden tumbarte. Subí a zonas altas. Llamá al 103 (Defensa Civil) o al 0800-345-3365 en CABA.</p>'],
   ['Accidente eléctrico','<p>No toques a la persona sin cortar la corriente. Cortá desde la llave térmica. Llamá al 107. Iniciá RCP si es necesario.</p>'],
   ['Intoxicación','<p>Llamá al Centro Antiponzoñoso: 4923-1051 (CABA) o al 107. No induzcas vómito sin indicación médica. Llevá el envase del producto.</p>'],
  ].forEach(([t,h2])=>accordion.appendChild(accItem(t,h2)));
  protSection.appendChild(accordion);
  mc.appendChild(protSection);

  const regionSection = h('div',{class:'section-block'});
  regionSection.appendChild(sectionTitle('Recursos por región'));
  const regionGrid = h('div',{class:'region-grid'});
  [['CABA','SAME: 107 · Policía: 911 · Salud Mental: 135 · Defensa Civil: 103'],
   ['Gran Buenos Aires','Emergencias: 911 · SAME GBA: 911 · Municipal: según municipio'],
   ['Córdoba','SAME: (351) 428-5000 · Emergencias: 911'],
   ['Rosario','SIES: (0341) 480-4545 · Emergencias: 911'],
   ['Mendoza','SAME: (0261) 428-0000 · Emergencias: 911'],
   ['Resto del país','Llamá al 911 desde cualquier lugar de Argentina'],
  ].forEach(([r,i])=>regionGrid.appendChild(regionCard(r,i)));
  regionSection.appendChild(regionGrid);
  mc.appendChild(regionSection);

  view.appendChild(mc);
  return view;
}

function renderSintomasGuiados(container, user) {
  emgSintomasState = { zona:[], sensacion:[], cuando:'' };
  container.innerHTML = '';
  // Paso 1: zona
  const p1 = h('div',{});
  p1.appendChild(h('p',{style:'font-weight:600;font-size:0.88rem;color:var(--color-text);margin-bottom:0.5rem;'},'¿Dónde sentís el malestar?'));
  const zonas = ['Cabeza','Pecho','Abdomen','Extremidades','Todo el cuerpo','No sé'];
  const zonaEl = h('div',{class:'sintoma-opts'});
  zonas.forEach(z=>{
    const chip = h('button',{class:'sintoma-chip',onclick:function(){
      this.classList.toggle('selected');
      const idx = emgSintomasState.zona.indexOf(z);
      idx>=0 ? emgSintomasState.zona.splice(idx,1) : emgSintomasState.zona.push(z);
    }},z);
    zonaEl.appendChild(chip);
  });
  p1.appendChild(zonaEl);
  // Paso 2: sensación
  p1.appendChild(h('p',{style:'font-weight:600;font-size:0.88rem;color:var(--color-text);margin:0.85rem 0 0.5rem;'},'¿Cómo lo describirías?'));
  const sens = ['Dolor','Presión','Mareo','Dificultad para respirar','Entumecimiento','Angustia','No sé'];
  const sensEl = h('div',{class:'sintoma-opts'});
  sens.forEach(s=>{
    const chip = h('button',{class:'sintoma-chip',onclick:function(){
      this.classList.toggle('selected');
      const idx = emgSintomasState.sensacion.indexOf(s);
      idx>=0 ? emgSintomasState.sensacion.splice(idx,1) : emgSintomasState.sensacion.push(s);
    }},s);
    sensEl.appendChild(chip);
  });
  p1.appendChild(sensEl);
  // Paso 3: cuándo
  p1.appendChild(h('p',{style:'font-weight:600;font-size:0.88rem;color:var(--color-text);margin:0.85rem 0 0.5rem;'},'¿Hace cuánto empezó?'));
  const cuandos = ['Hace minutos','Hace horas','Hace días','No sé'];
  const cuandoEl = h('div',{class:'sintoma-opts'});
  cuandos.forEach(c=>{
    const chip = h('button',{class:'sintoma-chip',onclick:function(){
      document.querySelectorAll('.cuando-chip').forEach(cc=>cc.classList.remove('selected'));
      this.classList.add('selected');
      emgSintomasState.cuando = c;
    }},c);
    chip.classList.add('cuando-chip');
    cuandoEl.appendChild(chip);
  });
  p1.appendChild(cuandoEl);
  const genBtn = h('button',{class:'btn btn--primary',style:'margin-top:1rem;',onclick:()=>mostrarResumen(container, user, emgSintomasState)},'Generar resumen');
  p1.appendChild(genBtn);
  container.appendChild(p1);
}

function mostrarResumen(container, user, sintomas) {
  container.innerHTML = '';
  const lines = [];
  if (user) {
    if (user.nombre) lines.push(`Nombre: ${user.nombre}`);
    if (user.edad) lines.push(`Edad: ${user.edad}`);
    if (user.ubicacion) lines.push(`Ubicación: ${user.ubicacion}`);
    if (user.alergias) lines.push(`Alergias: ${user.alergias}`);
    if (user.enfermedades) lines.push(`Enfermedades: ${user.enfermedades}`);
    if (user.medicacion) lines.push(`Medicación: ${user.medicacion}`);
    if (user.obra_social) lines.push(`Obra social: ${user.obra_social}`);
  }
  if (sintomas.zona && sintomas.zona.length) lines.push(`Zona afectada: ${sintomas.zona.join(', ')}`);
  if (sintomas.sensacion && sintomas.sensacion.length) lines.push(`Síntomas: ${sintomas.sensacion.join(', ')}`);
  if (sintomas.cuando) lines.push(`Inicio: ${sintomas.cuando}`);
  const texto = lines.length ? lines.join('\n') : 'Sin datos de perfil. Completá la información con el servicio de emergencias.';

  const resumen = h('div',{class:'emg-resumen'});
  resumen.appendChild(h('h4',{},'Resumen para emergencias'));
  const textoEl = h('div',{class:'emg-resumen-text'},texto);
  resumen.appendChild(textoEl);
  const actions = h('div',{class:'emg-resumen-actions'});
  // Copiar
  const copyBtn = h('button',{class:'emg-action-btn emg-action-btn--copy',onclick:()=>{
    navigator.clipboard.writeText(texto).then(()=>showToast('Copiado al portapapeles')).catch(()=>{
      const ta=document.createElement('textarea');ta.value=texto;document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta);showToast('Copiado');
    });
  }},'Copiar');
  actions.appendChild(copyBtn);
  // Compartir
  if (navigator.share) {
    const shareBtn = h('button',{class:'emg-action-btn emg-action-btn--share',onclick:()=>{
      navigator.share({title:'Resumen de emergencia AUXILIAR',text:texto}).catch(()=>{});
    }},'Compartir');
    actions.appendChild(shareBtn);
  }
  // Llamar 107
  const callBtn = h('a',{class:'emg-action-btn emg-action-btn--call',href:'tel:107'},'Llamar al 107');
  actions.appendChild(callBtn);
  resumen.appendChild(actions);
  container.appendChild(resumen);
}

/* ============ VIEW: DONACIONES ============ */
function viewDonaciones() {
  return h('div',{class:'view'},[
    catBanner('Donaciones','Donaciones de sangre, órganos y recursos materiales',
      '#0096c7, #2979d4, #023e8a',
      `<svg viewBox="0 0 200 200" width="180" height="180" xmlns="http://www.w3.org/2000/svg"><path d="M100 160 C60 130 30 110 30 75 C30 52 50 40 70 40 C83 40 94 47 100 56 C106 47 117 40 130 40 C150 40 170 52 170 75 C170 110 140 130 100 160Z" fill="rgba(255,255,255,0.55)"/><path d="M100 30 C100 30 84 52 84 64 C84 73 91 80 100 80 C109 80 116 73 116 64 C116 52 100 30 100 30Z" fill="rgba(255,80,80,0.7)"/></svg>`
    ),
    h('div',{class:'main-content'},[
      edadFiltroChips(),
      (function(){var eb=edadBanner('donaciones');return eb;})(),
      h('div',{class:'section-block'},[
        sectionTitle('Donación de sangre','Salvás hasta 4 vidas con una sola donación'),
        h('div',{class:'aviso aviso-info'},[h('span',{},'ℹ️'),h('div',{},'Podés donar si tenés entre 16 y 65 años, más de 50 kg y te sentís bien. No necesitás estar en ayunas.')]),
        (function(){
          var acc = h('div',{style:'margin-bottom:1rem;'});
          acc.appendChild(accItem('¿Quiénes pueden donar?',
            '<ul style="padding-left:1.2em;font-size:0.84rem;color:var(--color-text-muted);line-height:1.8;">'
            +'<li>Edad entre <strong>16 y 65 años</strong></li>'
            +'<li>Peso mayor a <strong>50 kg</strong></li>'
            +'<li>Sentirse bien el día de la donación</li>'
            +'<li>No haber tenado fiebre en los últimos 7 días</li>'
            +'<li>No haber tomado antibióticos en los últimos 7 días</li>'
            +'</ul>'));
          acc.appendChild(accItem('¿Cuándo NO se puede donar?',
            '<ul style="padding-left:1.2em;font-size:0.84rem;color:var(--color-text-muted);line-height:1.8;">'
            +'<li>Durante el embarazo o lactancia</li>'
            +'<li>Si tenés tatuajes o piercings de menos de 12 meses</li>'
            +'<li>Si tuviste hepatitis, VIH u otras infecciones de transmisión sanguínea</li>'
            +'<li>Dentro de los 28 días de una vacuna</li>'
            +'<li>Si tomaste aspirina en las últimas 72 horas</li>'
            +'</ul>'));
          acc.appendChild(accItem('¿Con qué frecuencia se puede donar?',
            '<p style="font-size:0.84rem;color:var(--color-text-muted);">'
            +'Los <strong>hombres</strong> pueden donar hasta 4 veces por año. '
            +'Las <strong>mujeres</strong> pueden donar hasta 3 veces por año. '
            +'Entre donación y donación deben pasar al menos <strong>60 días</strong>.</p>'));
          acc.appendChild(accItem('¿Qué pasa después de donar?',
            '<p style="font-size:0.84rem;color:var(--color-text-muted);">'
            +'El cuerpo repone el plasma en 24 horas y los glóbulos rojos en 4-8 semanas. '
            +'Después de donar: reposá 10 minutos, tomá algo dulce, evitá esfuerzos físicos intensos ese día.</p>'));
          return acc;
        })(),
        h('div',{class:'grid-2'},[
          cardEl('ic-rojo','','Hospital Garrahan','Donación de sangre pediátrica · Combate de los Pozos 1881.','https://www.garrahan.gov.ar'),
          cardEl('ic-rojo','','Hospital Italiano','Banco de sangre · Gascón 450, CABA.','https://www.hospitalitaliano.org.ar'),
          cardEl('ic-rojo','','Hospital Álvarez','Donación de sangre · Aranguren 2701, CABA.',null),
          cardEl('ic-rojo','','Encontrá un banco cercano','Ministerio de Salud · Buscador nacional.','https://www.argentina.gob.ar/salud/donarsangre/donde'),
        ]),
      ]),
      h('div',{class:'section-block'},[
        sectionTitle('Donación de órganos','INCUCAI — Instituto Nacional Central Único Coordinador'),
        h('div',{class:'aviso aviso-warn'},[h('span',{},'ℹ️'),h('div',{},'En Argentina, la Ley 27.447 establece que toda persona mayor de 18 años es donante, salvo que haya expresado lo contrario. Podés registrar tu voluntad en el INCUCAI.')]),
        h('div',{class:'grid-2'},[
          cardEl('ic-azul','','Registrarse como donante','INCUCAI · Online o en el Registro Civil.','https://www.argentina.gob.ar/salud/donarorganos'),
          cardEl('ic-azul','','Línea INCUCAI','0800-222-0101 · Gratuito · Consultas sobre donación.',null),
          cardEl('ic-verde','','Donación de plasma','Contactá el banco de sangre de tu hospital de referencia.',null),
          cardEl('ic-verde','','Médula ósea','Registro Nacional de Donantes de Células Progenitoras Hematopoyéticas (INCUCAI).','https://www.argentina.gob.ar/donar-medula'),
        ]),
      ]),
      voluntariosInline('donaciones'),
    ]),
  ]);
}


/* ============ GEOLOCALIZACIÓN Y CENTROS ============ */
const CENTROS_CABA = [
  // Salud general
  {n:'Hospital Ramos Mejía',t:'salud',lat:-34.6083,lng:-58.4026,dir:'Urquiza 609',tel:'4931-5252'},
  {n:'Hospital Fernández',t:'salud',lat:-34.5888,lng:-58.4003,dir:'Cerviño 3356',tel:'4808-2600'},
  {n:'Hospital Rivadavia',t:'salud',lat:-34.5938,lng:-58.4096,dir:'Las Heras 2670',tel:'4809-2000'},
  {n:'Hospital Santojanni',t:'salud',lat:-34.6436,lng:-58.5003,dir:'Pilar 950',tel:'4630-0806'},
  {n:'Hospital Piñero',t:'salud',lat:-34.6480,lng:-58.4720,dir:'Varela 1301',tel:'4631-0041'},
  {n:'Hospital Tornú',t:'salud',lat:-34.5745,lng:-58.4563,dir:'Combate de los Pozos 2063',tel:'4782-2531'},
  // Salud mental
  {n:'Hospital Borda',t:'mental',lat:-34.6234,lng:-58.3929,dir:'Ramón Carrillo 375',tel:'4305-4646'},
  {n:'Hospital Moyano',t:'mental',lat:-34.6294,lng:-58.3974,dir:'Brandsen 2570',tel:'4308-4600'},
  {n:'Hospital Tobar García',t:'mental',lat:-34.6234,lng:-58.3920,dir:'Ramón Carrillo 315',tel:'4305-1690'},
  // Veterinarias
  {n:'Centro Vet. Costanera Sur',t:'animals',lat:-34.6184,lng:-58.3627,dir:'Av. Costanera s/n'},
  {n:'Centro Vet. Villa Soldati',t:'animals',lat:-34.6687,lng:-58.4356,dir:'Llorente 2059'},
];

function distKm(lat1,lon1,lat2,lon2) {
  var R=6371, dLat=(lat2-lat1)*Math.PI/180, dLon=(lon2-lon1)*Math.PI/180;
  var a=Math.sin(dLat/2)*Math.sin(dLat/2)+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)*Math.sin(dLon/2);
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

function buscarCentrosCercanos(lat, lng, tipo, container) {
  var tipo_map = {'salud-fisica':'salud','salud-mental':'mental','animals':'animals'};
  var t = tipo_map[tipo] || 'salud';
  var results = CENTROS_CABA
    .filter(function(c){ return c.t === t; })
    .map(function(c){ return Object.assign({}, c, {dist: distKm(lat,lng,c.lat,c.lng)}); })
    .sort(function(a,b){ return a.dist-b.dist; })
    .slice(0,3);
  container.innerHTML = '';
  if (!results.length) { container.innerHTML = '<p style="color:var(--gris);font-size:0.84rem;">No encontramos centros cercanos en nuestra base de datos. <a href="https://www.buenosaires.gob.ar/salud/hospitales" target="_blank">Ver mapa oficial →</a></p>'; return; }
  results.forEach(function(r) {
    var card = document.createElement('div');
    card.style.cssText = 'background:var(--color-surface);border:1px solid var(--borde);border-radius:10px;padding:0.85rem 1rem;margin-bottom:0.5rem;';
    card.innerHTML = '<div style="font-weight:700;font-size:0.9rem;color:var(--color-text);">' + r.n + '</div>'
      + '<div style="font-size:0.78rem;color:var(--gris);margin:2px 0;">' + r.dir + ' · <strong>' + r.dist.toFixed(1) + ' km</strong></div>'
      + (r.tel ? '<a href="tel:' + r.tel + '" style="font-size:0.8rem;color:var(--primario);font-weight:700;">' + r.tel + '</a>' : '');
    container.appendChild(card);
  });
  var mapsBtn = document.createElement('a');
  mapsBtn.href = 'https://www.google.com/maps/search/' + (t==='animals'?'veterinaria':'hospital+guardia') + '/@' + lat + ',' + lng + ',14z';
  mapsBtn.target = '_blank';
  mapsBtn.style.cssText = 'display:inline-flex;align-items:center;gap:6px;background:var(--azul-claro);color:var(--azul);border:1px solid var(--celeste);border-radius:8px;padding:6px 12px;font-size:0.8rem;font-weight:700;text-decoration:none;margin-top:4px;';
  mapsBtn.textContent = '🗺 Ver en mapa';
  var dirBtn = document.createElement('a');
  dirBtn.href = 'https://www.google.com/maps/dir/?api=1&destination=' + lat + ',' + lng;
  dirBtn.target = '_blank';
  dirBtn.rel = 'noopener';
  dirBtn.style.cssText = 'display:inline-flex;align-items:center;gap:6px;background:var(--verde-claro);color:var(--verde);border:1px solid var(--verde-medio);border-radius:8px;padding:6px 12px;font-size:0.8rem;font-weight:700;text-decoration:none;margin-top:4px;margin-left:6px;';
  dirBtn.textContent = '📍 Cómo llegar';
  container.appendChild(mapsBtn);
  container.appendChild(dirBtn);
}

/* ============ VIEW: CENTROS DE ATENCIÓN ============ */
function viewCentros() {
  return h('div',{class:'view'},[
    h('div',{class:'flow-header'},[
      h('button',{class:'flow-back',onclick:()=>navigate('/')},'← Inicio'),
      h('div',{},[h('div',{class:'flow-title'},'Centros de Atención'),h('div',{class:'flow-subtitle'},'Mapas y recursos oficiales')]),
    ]),
    h('div',{class:'main-content'},[
      h('div',{class:'section-block'},[
        sectionTitle('Atención Clínica'),
        h('div',{class:'grid-2'},[
          (()=>{ const c=h('div',{class:'centro-card'}); c.innerHTML='<h4>Hospitales y CeSAC — CABA</h4><p>35 hospitales + 54 Centros de Salud y Acción Comunitaria</p>'; const a=h('a',{href:'https://buenosaires.gob.ar/salud/establecimientos-hospitales-y-centros-de-salud',target:'_blank',rel:'noopener'},'Abrir mapa oficial'); c.appendChild(a); return c; })(),
          (()=>{ const c=h('div',{class:'centro-card'}); c.innerHTML='<h4>Vacunatorios — CABA</h4><p>Calendario de vacunación y centros disponibles</p>'; const a=h('a',{href:'https://buenosaires.gob.ar/salud/vacunas/calendario-de-vacunacion',target:'_blank',rel:'noopener'},'Ver vacunatorios'); c.appendChild(a); return c; })(),
          (()=>{ const c=h('div',{class:'centro-card'}); c.innerHTML='<h4>Salud Mental — CABA</h4><p>Hospitales especializados y CeSAC con servicio de salud mental</p>'; const a=h('a',{href:'https://buenosaires.gob.ar/gcaba_historico/salud/salud-mental/guardias-hospitalarias-de-salud-mental',target:'_blank',rel:'noopener'},'Ver centros'); c.appendChild(a); return c; })(),
          (()=>{ const c=h('div',{class:'centro-card'}); c.innerHTML='<h4>Establecimientos nacionales</h4><p>Buscador de centros de salud en todo el país</p>'; const a=h('a',{href:'https://www.argentina.gob.ar/sssalud/base-datos',target:'_blank',rel:'noopener'},'Buscar centros'); c.appendChild(a); return c; })(),
        ]),
      ]),
      h('div',{class:'section-block'},[
        sectionTitle('Atención Veterinaria'),
        h('div',{class:'grid-2'},[
          (()=>{ const c=h('div',{class:'centro-card'}); c.innerHTML='<h4>Veterinarias gratuitas — CABA</h4><p>Centros fijos y móviles, castración y vacunación</p>'; const a=h('a',{href:'https://buenosaires.gob.ar/agenciaambiental/mascotas/atencion-veterinaria-y-castraciones-gratuitas',target:'_blank',rel:'noopener'},'Ver cronograma'); c.appendChild(a); return c; })(),
          (()=>{ const c=h('div',{class:'centro-card'}); c.innerHTML='<h4>Vacunación antirrábica — CABA</h4><p>Operativos gratuitos en distintos barrios</p>'; const a=h('a',{href:'https://buenosaires.gob.ar/agenciaambiental/mascotas/atencion-veterinaria-y-castraciones-gratuitas',target:'_blank',rel:'noopener'},'Ver operativos'); c.appendChild(a); return c; })(),
        ]),
      ]),
    ]),
  ]);
}

/* ============ VIEW: SUMATE ============ */
function viewSumate(rol) {
  const ofrece = rol === 'ofrece';
  const view = h('div',{class:'view'});
  view.appendChild(h('div',{class:'flow-header'},[
    h('button',{class:'flow-back',onclick:()=>navigate('/')},'← Inicio'),
    h('div',{},[h('div',{class:'flow-title'},ofrece?'Sumate a Ayudar':'Quiero ser parte'),h('div',{class:'flow-subtitle'},ofrece?'Profesionales, voluntarios y organizaciones':'Formá parte de AuxiliAR')]),
  ]));
  const mc = h('div',{class:'main-content'});
  if (ofrece) {
    mc.appendChild(h('div',{class:'aviso aviso-info'},[h('span',{},'🤝'),h('div',{},'Tu experiencia puede ayudar a muchas personas. Completá el formulario y nos ponemos en contacto.')]));
  }
  const formArea = h('div',{id:'sumate-form-area'});
  function buildForm() {
    const form = h('div',{});
    form.innerHTML = `
      <div class="form-grid-2">
        <div class="form-field"><label>Nombre *</label><input type="text" id="sf-nombre" placeholder="Tu nombre"></div>
        <div class="form-field"><label>Apellido</label><input type="text" id="sf-apellido" placeholder="Tu apellido"></div>
      </div>
      <div class="form-grid-2">
        <div class="form-field"><label>Email *</label><input type="email" id="sf-email" placeholder="tu@email.com"></div>
        <div class="form-field"><label>Teléfono</label><input type="tel" id="sf-tel" placeholder="+54 11..."></div>
      </div>
      <div class="form-field"><label>Tipo de colaboración *</label>
        <select id="sf-tipo">
          <option value="">Seleccioná una opción</option>
          <option value="profesional" ${ofrece?'':''}> Profesional de la salud</option>
          <option value="voluntario">Voluntario/a</option>
          <option value="ong">ONG</option>
          <option value="organizacion">Organización o institución</option>
          <option value="otro">Otro</option>
        </select>
      </div>
      <div class="form-field"><label>Área o especialidad</label><input type="text" id="sf-area" placeholder="Ej: psicología, medicina general, trabajo social..."></div>
      <div class="form-field"><label>Zona donde podés colaborar</label><input type="text" id="sf-zona" placeholder="Ej: CABA, GBA Norte, Rosario..."></div>
      <div class="form-field"><label>Contanos más sobre vos</label><textarea id="sf-mensaje" placeholder="¿Cómo querés colaborar? ¿Tenés experiencia previa?"></textarea></div>`;
    const submitBtn = h('button',{class:'btn btn--primary',onclick:()=>{
      const nombre = document.getElementById('sf-nombre')?.value.trim();
      const email = document.getElementById('sf-email')?.value.trim();
      const tipo = document.getElementById('sf-tipo')?.value;
      if(!nombre||!email||!tipo){ showToast('Por favor completá los campos obligatorios'); return; }
      formArea.innerHTML = '';
      const success = h('div',{class:'form-success'});
      success.innerHTML = `<span class="success-icon">🎉</span><h3>¡Gracias, ${nombre}!</h3><p>Recibimos tu información. Nos pondremos en contacto con vos a la brevedad.</p>`;
      const backBtn = h('button',{class:'btn btn--outline',style:'margin-top:1rem;',onclick:()=>navigate('/')},'Volver al inicio');
      success.appendChild(backBtn);
      formArea.appendChild(success);
    }},'Enviar');
    form.appendChild(submitBtn);
    return form;
  }
  formArea.appendChild(buildForm());
  mc.appendChild(formArea);
  view.appendChild(mc);
  return view;
}

/* ============ VIEW: SOBRE AUXILIAR ============ */

/* ============ VIEW: RECURSOS ÚTILES ============ */

/* ============ VIEW: MI SALUD ============ */
function getVacunasPorEdad(edad) {
  var e = parseInt(edad) || 0;
  var vacunas = [];
  // Siempre
  vacunas.push({n:'Triple bacteriana (dTpa)',d:'Adultos cada 10 años',estado:'pendiente'});
  vacunas.push({n:'Hepatitis B',d:'Si no tenés esquema completo',estado:'pendiente'});
  vacunas.push({n:'Antigripal',d:'Anual · grupos de riesgo',estado:'pendiente'});
  if (e > 0 && e < 18) {
    vacunas.unshift({n:'HPV',d:'11-13 años · ambos sexos',estado:e>=11&&e<=13?'urgente':'pendiente'});
    vacunas.unshift({n:'Triple viral (MMR)',d:'Niñez y adolescencia',estado:'ok'});
    vacunas.unshift({n:'COVID-19',d:'Desde los 6 meses',estado:'pendiente'});
  }
  if (e >= 18 && e < 50) {
    vacunas.unshift({n:'COVID-19',d:'Esquema completo y refuerzo',estado:'pendiente'});
    if (e >= 18 && e <= 35) vacunas.push({n:'HPV',d:'Hasta 45 años si no vacunado/a',estado:'pendiente'});
  }
  if (e >= 50) {
    vacunas.unshift({n:'Neumocócica',d:'65+ o con factores de riesgo',estado:e>=65?'urgente':'pendiente'});
    vacunas.unshift({n:'Herpes zóster',d:'Mayores de 60 años',estado:e>=60?'urgente':'pendiente'});
    vacunas.unshift({n:'COVID-19 (refuerzo)',d:'Mayores de 50 · esquema anual',estado:'urgente'});
  }
  return vacunas;
}

function perfilSwitcher() {
  var profiles = getProfiles();
  var activeId = getActiveProfileId();
  var wrap = h('div',{class:'perfil-switcher'});

  function esMenorPerfil(p) {
    return p.tipo !== 'mascota' && p.edad !== undefined && p.edad !== '' && !isNaN(parseInt(p.edad)) && parseInt(p.edad) < 18;
  }
  // Agrupar solo para el orden visual — no cambia nada de cómo se guardan o eligen los perfiles
  var grupos = [
    {label:'👤 Adultos', items: profiles.filter(function(p){ return p.tipo !== 'mascota' && !esMenorPerfil(p); })},
    {label:'🧒 Menores', items: profiles.filter(function(p){ return esMenorPerfil(p); })},
    {label:'🐾 Animales', items: profiles.filter(function(p){ return p.tipo === 'mascota'; })},
  ];
  var gruposConDatos = grupos.filter(function(g){ return g.items.length > 0; });

  gruposConDatos.forEach(function(grupo, i){
    if (gruposConDatos.length > 1) {
      wrap.appendChild(h('span',{style:'width:100%;font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:var(--gris-medio);margin-top:'+(i>0?'6px':'0')+';'}, grupo.label));
    }
    grupo.items.forEach(function(p){
      var esActivo = p.id === activeId;
      var icono = p.tipo === 'mascota' ? '🐾 ' : (esMenorPerfil(p) ? '🧒 ' : '👤 ');
      var label = icono + (p.nombre || (p.tipo==='mascota'?'Mascota sin nombre':'Sin nombre'));
      var tab = h('button',{class:'perfil-tab'+(esActivo?' perfil-tab--active':'')}, label);
      tab.addEventListener('click', function(){
        if (!esActivo) { setActiveProfileId(p.id); renderRoute(); }
      });
      wrap.appendChild(tab);
    });
  });

  var addBtnEl = h('button',{class:'perfil-tab perfil-tab--add'},'+ Agregar perfil');
  addBtnEl.addEventListener('click', function(){
    auxiState = { step:'elegir_tipo_perfil', data:{}, expr:'happy', history:[] };
    auxiSkipReset = true;
    navigate('/');
  });
  wrap.appendChild(addBtnEl);
  return wrap;
}

function renderPerfilMascota(user) {
  var wrap = h('div',{});
  var inicial = (user.nombre||'🐾').charAt(0).toUpperCase();
  var salHeader = h('div',{class:'salud-header'});
  var avatar = h('div',{class:'salud-avatar'},user.nombre?inicial:'🐾');
  var headerInfo = h('div',{});
  headerInfo.innerHTML = '<h2 style="margin:0 0 2px;font-size:1.2rem;">'+(user.nombre||'Mi mascota')+'</h2>'
    +'<p style="margin:0;font-size:0.82rem;color:var(--color-text-muted);">'+(user.especie?user.especie:'')+(user.edad?' · '+user.edad+' años':'')+'</p>';
  salHeader.appendChild(avatar);
  salHeader.appendChild(headerInfo);
  wrap.appendChild(salHeader);

  wrap.appendChild(sectionTitle('Datos de mi mascota'));
  function campoEditable(label, key, placeholder) {
    var card = h('div',{class:'salud-card'});
    var val = user[key]||'';
    card.innerHTML = '<div class="salud-card__label">'+label+'</div>'
      +(val?'<div class="salud-card__value">'+val+'</div>':'<div class="salud-card__empty">No completado</div>');
    var editBtn = h('button',{class:'salud-edit-btn',style:'margin-top:6px;',onclick:function(){
      var fwrap = document.createElement('div');
      fwrap.className = 'salud-field-inline';
      var inp = document.createElement('input');
      inp.type='text'; inp.value=val; inp.placeholder=placeholder||label;
      var saveBtn = document.createElement('button');
      saveBtn.textContent='Guardar';
      saveBtn.addEventListener('click',function(){
        var u = getUser()||{};
        u[key] = inp.value.trim();
        saveUser(u);
        showToast('✓ Guardado');
        renderRoute();
      });
      fwrap.appendChild(inp); fwrap.appendChild(saveBtn);
      card.appendChild(fwrap);
      editBtn.style.display='none';
      setTimeout(function(){inp.focus();},50);
    }},val?'Editar':'+ Agregar');
    card.appendChild(editBtn);
    return card;
  }
  wrap.appendChild(campoEditable('Nombre','nombre','Ej: Rocco'));
  wrap.appendChild(campoEditable('Especie','especie','Ej: Perro, gato...'));
  wrap.appendChild(campoEditable('Edad','edad','Ej: 3'));
  wrap.appendChild(campoEditable('Castración','castracion','Sí / No / No sé'));

  // ---- Calendario de vacunación (antirrábica) ----
  wrap.appendChild(h('div',{class:'section-divider',style:'margin:1.5rem 0 1rem;'}));
  wrap.appendChild(sectionTitle('Vacunación antirrábica','Obligatoria por ley · gratuita en CABA'));
  var vacCard = h('div',{class:'salud-card'});
  var fechaVac = user.ultima_vacuna_antirrabica || '';
  var estadoVac = null;
  if (fechaVac) {
    var partes = fechaVac.split('/');
    if (partes.length === 3) {
      var fVac = new Date(parseInt(partes[2]), parseInt(partes[1])-1, parseInt(partes[0]));
      var unAnioDespues = new Date(fVac); unAnioDespues.setFullYear(unAnioDespues.getFullYear()+1);
      estadoVac = (new Date() > unAnioDespues) ? 'vencida' : 'ok';
    }
  }
  vacCard.innerHTML = '<div class="salud-card__label">Última aplicación</div>'
    + (fechaVac ? '<div class="salud-card__value">'+fechaVac+'</div>' : '<div class="salud-card__empty">No completado</div>')
    + (estadoVac === 'vencida' ? '<div style="color:var(--rojo);font-weight:700;font-size:0.8rem;margin-top:4px;">⚠️ Vencida — se recomienda renovar (se aplica cada 12 meses)</div>' : '')
    + (estadoVac === 'ok' ? '<div style="color:var(--verde);font-weight:700;font-size:0.8rem;margin-top:4px;">✓ Al día</div>' : '');
  var editVacBtn = h('button',{class:'salud-edit-btn',style:'margin-top:6px;',onclick:function(){
    var fwrap = document.createElement('div');
    fwrap.className = 'salud-field-inline';
    var inp = document.createElement('input');
    inp.type='text'; inp.value=fechaVac; inp.placeholder='dd/mm/aaaa';
    var saveBtn = document.createElement('button');
    saveBtn.textContent='Guardar';
    saveBtn.addEventListener('click',function(){
      var u = getUser()||{};
      u.ultima_vacuna_antirrabica = inp.value.trim();
      saveUser(u);
      showToast('✓ Guardado');
      renderRoute();
    });
    fwrap.appendChild(inp); fwrap.appendChild(saveBtn);
    vacCard.appendChild(fwrap);
    editVacBtn.style.display='none';
    setTimeout(function(){inp.focus();},50);
  }},fechaVac?'Editar fecha':'+ Agregar fecha');
  vacCard.appendChild(editVacBtn);
  wrap.appendChild(vacCard);
  var turnoLink = mapaLink('Turno de vacunación antirrábica gratuita','https://buenosaires.gob.ar/agenciaambiental/mascotas/atencion-veterinaria-y-castraciones-gratuitas','Gobierno de la Ciudad · Centros fijos y móviles');
  turnoLink.style.marginTop = '10px';
  wrap.appendChild(turnoLink);

  wrap.appendChild(campoEditable('Notas','notas','Alergias, condiciones, lo que quieras recordar'));

  // ---- Eliminar perfil ----
  wrap.appendChild(h('div',{class:'section-divider',style:'margin:1.5rem 0 1rem;'}));
  var delBtn = h('button',{class:'btn btn--outline',style:'color:var(--rojo);border-color:var(--rojo);',onclick:function(){
    if (confirm('¿Eliminar el perfil de '+(user.nombre||'esta mascota')+'? Esta acción no se puede deshacer.')) {
      eliminarPerfil(user.id);
      showToast('Perfil eliminado');
      renderRoute();
    }
  }},'Eliminar este perfil');
  wrap.appendChild(delBtn);
  return wrap;
}

function viewMiSalud() {
  var user = getUser();
  var view = h('div',{class:'view'});
  view.appendChild(h('div',{class:'flow-header'},[
    h('button',{class:'flow-back',onclick:()=>navigate('/')},'← Inicio'),
    h('div',{},[h('div',{class:'flow-title'},'Mi Salud'),h('div',{class:'flow-subtitle'},'Tu información personal de salud')]),
  ]));
  var mc = h('div',{class:'main-content'});

  if (getProfiles().length > 0) mc.appendChild(perfilSwitcher());

  if (!user || (!user.nombre && user.tipo !== 'mascota')) {
    // Sin perfil activo con datos
    var noPerfil = h('div',{style:'text-align:center;padding:3rem 1rem;'});
    noPerfil.innerHTML = '<div style="font-size:3rem;margin-bottom:1rem;">👤</div>'
      +'<h2 style="margin-bottom:0.5rem;">Todavía no tenés perfil</h2>'
      +'<p style="color:var(--color-text-muted);margin-bottom:1.5rem;">Completá tu perfil con Auxi para ver tu información de salud personalizada.</p>';
    var auxiBtn = h('button',{class:'btn btn--primary',onclick:function(){
      auxiState={step:'perfil_nombre',data:Object.assign({},auxiState.data,{destino:'/mi-salud'}),expr:'caring',history:[]};
      auxiSkipReset = true;
      navigate('/');
    }},'Crear mi perfil con Auxi');
    noPerfil.appendChild(auxiBtn);
    mc.appendChild(noPerfil);
    view.appendChild(mc);
    return view;
  }

  if (user.tipo === 'mascota') {
    mc.appendChild(renderPerfilMascota(user));
    view.appendChild(mc);
    return view;
  }

  // Header con avatar
  var inicial = (user.nombre||'?').charAt(0).toUpperCase();
  var salHeader = h('div',{class:'salud-header'});
  var avatar = h('div',{class:'salud-avatar'},inicial);
  var headerInfo = h('div',{});
  headerInfo.innerHTML = '<h2 style="margin:0 0 2px;font-size:1.2rem;">'+user.nombre+'</h2>'
    +'<p style="margin:0;font-size:0.82rem;color:var(--color-text-muted);">'+(user.edad?user.edad+' años':'')+' '+(user.ubicacion?'· '+user.ubicacion:'')+'</p>';
  salHeader.appendChild(avatar);
  salHeader.appendChild(headerInfo);
  mc.appendChild(salHeader);

  // ---- Recursos para familias (solo si el perfil activo es de un/a menor) ----
  if (esMenorActivo()) {
    function linkInternoFamilia(label, ruta, desc) {
      var a = h('a',{class:'mapa-link', href:'#'+ruta, onclick:function(e){ e.preventDefault(); navigate(ruta); }});
      a.innerHTML = '<span class="mapa-link-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg></span><div><div class="mapa-link-title">'+label+'</div><div class="mapa-link-desc">'+desc+'</div></div><span class="mapa-link-arrow">Ver →</span>';
      return a;
    }
    mc.appendChild(h('div',{style:'background:var(--primario-claro);border:1px solid var(--primario);border-radius:10px;padding:1rem 1.1rem;margin-bottom:1.5rem;'},[
      (function(){var t=h('div',{style:'font-size:0.85rem;font-weight:700;color:var(--primario);margin-bottom:8px;'},'👨‍👩‍👧 Recursos para familias'); return t;})(),
      linkInternoFamilia('Primeros auxilios pediátricos','/categorias/primeros-auxilios','Guías paso a paso para emergencias con niños y adolescentes'),
      linkInternoFamilia('Cómo acompañar una crisis emocional','/categorias/salud-mental','Apoyo psicológico gratuito y orientación para adultos responsables'),
      calLink('Calendario de vacunación','https://www.argentina.gob.ar/salud/vacunas','Ministerio de Salud · Gratuito · Todas las edades'),
      linkInternoFamilia('Derechos de niños y adolescentes (ESI)','/categorias/esi','Educación sexual integral y derechos garantizados por ley'),
      (function(){var d=h('div',{style:'font-size:0.78rem;color:var(--color-text);margin-top:6px;'},'Línea 102 (Niñez y adolescencia) · gratuita · las 24 horas'); return d;})(),
    ]));
  }

  // ---- Datos personales ----
  mc.appendChild(sectionTitle('Mis datos'));
  var esMenorVista = esMenorActivo();
  var campos = [
    {label:'Nombre',key:'nombre'},
    {label:'Edad',key:'edad'},
    {label:'Ubicación',key:'ubicacion'},
  ];
  if (!esMenorVista) campos.push({label:'Obra social',key:'obra_social'});
  campos.push(
    {label:'DNI / Pasaporte',key:'dni'},
    {label:'Contacto de emergencia',key:'contacto_emergencia'}
  );
  if (esMenorVista) {
    campos.push(
      {label:'Adulto responsable',key:'adulto_nombre'},
      {label:'Relación con el adulto',key:'adulto_relacion'},
      {label:'Teléfono del adulto',key:'adulto_telefono'},
      {label:'Correo del adulto',key:'adulto_email'}
    );
  }
  campos.forEach(function(campo) {
    var card = h('div',{class:'salud-card'});
    var val = user[campo.key]||'';
    card.innerHTML = '<div class="salud-card__label">'+campo.label+'</div>';
    if (val) {
      card.innerHTML += '<div class="salud-card__value">'+val+'</div>';
    } else {
      card.innerHTML += '<div class="salud-card__empty">No completado</div>';
    }
    // Edición inline
    var editBtn = h('button',{class:'salud-edit-btn',style:'margin-top:6px;',onclick:function(){
      var wrap = document.createElement('div');
      wrap.className = 'salud-field-inline';
      var inp = document.createElement('input');
      inp.type='text'; inp.value=val; inp.placeholder=campo.label;
      var saveBtn = document.createElement('button');
      saveBtn.textContent='Guardar';
      saveBtn.addEventListener('click',function(){
        var u = getUser()||{};
        u[campo.key] = inp.value.trim();
        saveUser(u);
        showToast('✓ Guardado');
        // Re-render (forzado: renderRoute() en vez de navigate, porque ya estamos en /mi-salud
        // y el hash no cambia — navigate() no habría disparado el re-render)
        renderRoute();
      });
      wrap.appendChild(inp); wrap.appendChild(saveBtn);
      card.appendChild(wrap);
      editBtn.style.display='none';
      setTimeout(function(){inp.focus();},50);
    }},val?'Editar':'+ Agregar');
    card.appendChild(editBtn);
    mc.appendChild(card);
  });

  // ---- Mi obra social (simulación frontend) — no aplica a menores, que suelen tener la de un adulto ----
  if (!esMenorVista) {
  mc.appendChild(h('div',{class:'section-divider',style:'margin:1.5rem 0 1rem;'}));
  mc.appendChild(sectionTitle('Mi obra social','Simulación — AuxiliAR no accede a datos reales de tu afiliación'));
  if (user.obra_social_conectada) {
    var osc = user.obra_social_conectada;
    var osMatch = buscarObraSocial(osc.obra_social);
    var credCard = h('div',{class:'credencial-simulada'});
    credCard.innerHTML = '<div class="credencial-simulada__header"><span>AuxiliAR · Credencial digital (simulada)</span></div>'
      + '<div class="credencial-simulada__nombre">'+(user.nombre||'')+'</div>'
      + '<div class="credencial-simulada__os">'+osc.obra_social+'</div>'
      + '<div class="credencial-simulada__num">N° afiliado (simulado): '+osc.numero_afiliado+'</div>'
      + '<div class="credencial-simulada__fecha">Conectada el '+osc.fecha_conexion+'</div>';
    mc.appendChild(credCard);
    var osActions = h('div',{style:'display:flex;gap:8px;flex-wrap:wrap;margin-top:0.6rem;'});
    if (osMatch) {
      var btnCartilla = h('a',{href:osMatch.sitio,target:'_blank',rel:'noopener',class:'btn btn--outline',style:'flex:1;min-width:140px;text-align:center;'},'Ver cartilla médica');
      var btnSitio = h('a',{href:osMatch.sitio,target:'_blank',rel:'noopener',class:'btn btn--outline',style:'flex:1;min-width:140px;text-align:center;'},'Sitio oficial');
      osActions.appendChild(btnCartilla);
      osActions.appendChild(btnSitio);
    }
    mc.appendChild(osActions);
    var atencionCard = h('div',{class:'salud-card',style:'margin-top:0.6rem;'});
    atencionCard.innerHTML = '<div class="salud-card__label">Atención al afiliado</div><div class="salud-card__value" style="font-size:0.82rem;">Para trámites, autorizaciones o reclamos, comunicate directamente con tu obra social a través de su app o sitio oficial'+(osMatch?' ('+osMatch.sitio.replace('https://www.','')+')':'')+'.</div>';
    mc.appendChild(atencionCard);
    var desconectarBtn = h('button',{class:'salud-edit-btn',style:'margin-top:8px;',onclick:function(){
      var u = getUser()||{}; delete u.obra_social_conectada; saveUser(u); showToast('Desconectada'); renderRoute();
    }},'Desconectar (simulado)');
    mc.appendChild(desconectarBtn);
  } else {
    var noOsCard = h('div',{class:'salud-card'});
    noOsCard.innerHTML = '<div class="salud-card__empty">Todavía no conectaste una obra social</div>';
    mc.appendChild(noOsCard);
    var conectarBtn = h('button',{class:'btn btn--outline',style:'margin-top:0.5rem;',onclick:function(){
      var nombreOS = user.obra_social && user.obra_social.trim();
      if (!nombreOS) { showToast('Primero completá el campo "Obra social" arriba'); return; }
      var fwrap = document.createElement('div');
      fwrap.className = 'salud-field-inline';
      var inp = document.createElement('input');
      inp.type = 'text'; inp.placeholder = 'N° de afiliado (opcional)';
      var confirmBtn = document.createElement('button');
      confirmBtn.textContent = 'Conectar';
      confirmBtn.addEventListener('click', function(){
        var u = getUser()||{};
        u.obra_social_conectada = generarCredencialSimulada(nombreOS, inp.value.trim());
        saveUser(u);
        showToast('✓ Conectada (simulado)');
        renderRoute();
      });
      fwrap.appendChild(inp); fwrap.appendChild(confirmBtn);
      conectarBtn.replaceWith(fwrap);
      setTimeout(function(){inp.focus();},50);
    }},'Conectar mi obra social (simulado)');
    mc.appendChild(conectarBtn);
  }
  }

  // ---- Cómo te sentiste (guardado por Auxi) ----
  if (user.ultima_consulta && (user.ultima_consulta.sensacion || user.ultima_consulta.desde)) {
    mc.appendChild(h('div',{class:'section-divider',style:'margin:1.5rem 0 1rem;'}));
    mc.appendChild(sectionTitle('Cómo te sentiste','Última vez que hablaste con Auxi sobre esto'));
    var animoCard = h('div',{class:'salud-card'});
    var uc = user.ultima_consulta;
    animoCard.innerHTML = '<div class="salud-card__label">'+(uc.fecha||'')+'</div>'
      +'<div class="salud-card__value">'+(uc.sensacion||'No especificado')+'</div>'
      +(uc.desde?'<div style="font-size:0.78rem;color:var(--color-text-muted);margin-top:2px;">Desde: '+uc.desde+'</div>':'');
    mc.appendChild(animoCard);
    var hablarBtn = h('button',{class:'btn btn--outline',style:'margin-top:0.5rem;',onclick:function(){
      var base = Object.assign({}, auxiState.data);
      if (user.nombre && base.nombre === undefined) base.nombre = user.nombre;
      if (user.edad && base.edad === undefined) base.edad = user.edad;
      if (user.sexo && base.sexo === undefined) base.sexo = user.sexo;
      auxiState={step:'chequeo_animo',data:Object.assign(base,{destino:'/mi-salud',tipo_consulta:'mental'}),expr:'caring',history:[]};
      auxiSkipReset = true;
      navigate('/');
    }},'Contarle a Auxi cómo te sentís ahora');
    mc.appendChild(hablarBtn);

    // Historial completo — solo visible para el propio perfil del/de la menor, como seguimiento
    if (esMenorActivo() && user.historial_animo && user.historial_animo.length > 1) {
      var histWrap = h('div',{style:'margin-top:1rem;'});
      histWrap.appendChild(h('div',{style:'font-size:0.78rem;font-weight:700;color:var(--gris-medio);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px;'},'Historial reciente'));
      user.historial_animo.slice(1,6).forEach(function(h_prev){
        var fila = h('div',{style:'display:flex;justify-content:space-between;gap:8px;font-size:0.8rem;color:var(--color-text-muted);padding:5px 0;border-bottom:1px solid var(--borde);'});
        fila.innerHTML = '<span>'+(h_prev.fecha||'')+'</span><span style="text-align:right;">'+(h_prev.sensacion||'')+'</span>';
        histWrap.appendChild(fila);
      });
      mc.appendChild(histWrap);
    }
  }

  // ---- Enviar resumen al adulto responsable (solo perfiles de menores con contacto guardado) ----
  if (esMenorActivo() && user.adulto_email) {
    var resumenPartes = [
      'Resumen de '+(user.nombre||'')+' generado desde AuxiliAR:',
      user.edad ? ('Edad: '+user.edad) : '',
      user.alergias ? ('Alergias: '+user.alergias) : '',
      user.enfermedades ? ('Condiciones: '+user.enfermedades) : '',
      user.medicacion ? ('Medicación: '+user.medicacion) : '',
      (user.ultima_consulta && user.ultima_consulta.sensacion) ? ('Último chequeo de ánimo ('+user.ultima_consulta.fecha+'): '+user.ultima_consulta.sensacion) : '',
    ].filter(Boolean).join('\n');
    var mailtoUrl = 'mailto:'+encodeURIComponent(user.adulto_email)
      +'?subject='+encodeURIComponent('Resumen de salud de '+(user.nombre||''))
      +'&body='+encodeURIComponent(resumenPartes);
    var enviarBtn = h('a',{href:mailtoUrl, class:'btn btn--outline', style:'margin-top:0.5rem;display:inline-flex;'},'✉️ Enviar resumen a '+(user.adulto_nombre||'el adulto responsable'));
    mc.appendChild(enviarBtn);
  }

  // ---- Información médica ----
  mc.appendChild(h('div',{class:'section-divider',style:'margin:1.5rem 0 1rem;'}));
  mc.appendChild(sectionTitle('Información médica'));
  var medCampos = [
    {label:'Alergias conocidas',key:'alergias'},
    {label:'Enfermedades o condiciones',key:'enfermedades'},
    {label:'Medicación habitual',key:'medicacion'},
  ];
  medCampos.forEach(function(campo) {
    var card = h('div',{class:'salud-card'});
    var val = user[campo.key]||'';
    card.innerHTML = '<div class="salud-card__label">'+campo.label+'</div>'
      +(val?'<div class="salud-card__value">'+val+'</div>':'<div class="salud-card__empty">No completado</div>');
    var editBtn = h('button',{class:'salud-edit-btn',style:'margin-top:6px;',onclick:function(){
      var wrap = document.createElement('div');
      wrap.className='salud-field-inline';
      var inp = document.createElement('input');
      inp.type='text'; inp.value=val; inp.placeholder=campo.label;
      var saveBtn2 = document.createElement('button');
      saveBtn2.textContent='Guardar';
      saveBtn2.addEventListener('click',function(){
        var u=getUser()||{}; u[campo.key]=inp.value.trim(); saveUser(u);
        showToast('✓ Guardado'); renderRoute();
      });
      wrap.appendChild(inp); wrap.appendChild(saveBtn2);
      card.appendChild(wrap); editBtn.style.display='none';
      setTimeout(function(){inp.focus();},50);
    }},val?'Editar':'+ Agregar');
    card.appendChild(editBtn);
    mc.appendChild(card);
  });

  // ---- Calendario de vacunas ----
  mc.appendChild(h('div',{class:'section-divider',style:'margin:1.5rem 0 1rem;'}));
  mc.appendChild(sectionTitle('Calendario de vacunación',user.edad?'Basado en tu edad ('+user.edad+' años) · Calendario Nacional 2026':'Completá tu edad para ver recomendaciones personalizadas'));
  if (user.edad) {
    var vacunas = getVacunasPorEdad(user.edad);
    vacunas.forEach(function(v){
      var item = h('div',{class:'vacuna-item'});
      item.innerHTML = '<div class="vacuna-dot vacuna-dot--'+v.estado+'"></div>'
        +'<div class="vacuna-info"><div class="vacuna-nombre">'+v.n+'</div><div class="vacuna-desc">'+v.d+'</div></div>'
        +'<span class="vacuna-estado vacuna-estado--'+v.estado+'">'
        +(v.estado==='ok'?'Al día':v.estado==='urgente'?'Prioritaria':'Pendiente')+'</span>';
      mc.appendChild(item);
    });
    var calLink2 = h('a',{href:'https://www.argentina.gob.ar/salud/vacunas',target:'_blank',rel:'noopener',class:'cal-link',style:'margin-top:0.75rem;'});
    calLink2.innerHTML = '<span class="cal-link-icon">📅</span><div><div class="cal-link-title">Ver calendario oficial completo</div><div class="cal-link-desc">Ministerio de Salud de la Nación · 2026</div></div><span class="cal-link-arrow">Ver →</span>';
    mc.appendChild(calLink2);
  } else {
    var noEdad = h('div',{class:'aviso aviso-info'});
    noEdad.innerHTML = '<span>ℹ️</span><div>Agregá tu edad en "Mis datos" para ver las vacunas recomendadas según tu etapa de vida.</div>';
    mc.appendChild(noEdad);
  }

  // ---- Controles preventivos según edad ----
  if (user.edad) {
    var edad = parseInt(user.edad)||0;
    mc.appendChild(h('div',{class:'section-divider',style:'margin:1.5rem 0 1rem;'}));
    mc.appendChild(sectionTitle('Controles preventivos recomendados'));
    var controles = [];
    if (edad >= 40) controles.push({ic:'🫀',t:'Presión arterial',d:'Cada año a partir de los 40'});
    if (edad >= 50) controles.push({ic:'🩸',t:'Glucemia en ayunas',d:'Cada 3 años a partir de los 45'});
    if (edad >= 50) controles.push({ic:'🔬',t:'Colonoscopía',d:'Cada 10 años a partir de los 50'});
    if (edad >= 18) controles.push({ic:'👁',t:'Control oftalmológico',d:'Cada 2 años'});
    if (edad >= 20 && edad <= 65) controles.push({ic:'🦷',t:'Control odontológico',d:'Cada 6 meses'});
    if (edad >= 40 && edad <= 74) controles.push({ic:'🎗',t:'Mamografía',d:'Cada 2 años para mujeres 40-74'});
    if (!controles.length) controles.push({ic:'✅',t:'Sin controles específicos para tu edad',d:'Mantené tus vacunas al día y consultá tu médico anualmente'});
    controles.forEach(function(ctrl){
      var card2 = h('div',{class:'card',style:'display:flex;gap:1rem;align-items:center;margin-bottom:0.6rem;'});
      card2.innerHTML='<span style="font-size:1.5rem;">'+ctrl.ic+'</span><div><div style="font-weight:700;font-size:0.88rem;">'+ctrl.t+'</div><div style="font-size:0.78rem;color:var(--color-text-muted);">'+ctrl.d+'</div></div>';
      mc.appendChild(card2);
    });
  }

  view.appendChild(mc);
  return view;
}

function viewRecursosUtiles() {
  var view = h('div',{class:'view'});
  view.appendChild(h('div',{class:'flow-header'},[
    h('button',{class:'flow-back',onclick:()=>navigate('/')},'← Inicio'),
    h('div',{},[h('div',{class:'flow-title'},'Recursos útiles'),h('div',{class:'flow-subtitle'},'Leyes, derechos, FAQ y trámites')]),
  ]));
  var mc = h('div',{class:'main-content'});

  var tabs = [
    {id:'tab-faq', label:'Preguntas frecuentes'},
    {id:'tab-derechos', label:'Derechos del paciente'},
    {id:'tab-legal', label:'Info legal'},
    {id:'tab-tramites', label:'Trámites'},
    {id:'tab-datos', label:'Datos y estadísticas'},
  ];
  var tabBar = h('div',{class:'tab-bar'});
  tabs.forEach(function(t,i){
    var btn = h('button',{class:'tab-btn'+(i===0?' active':''),onclick:'switchTab("'+t.id+'","ru-tabs",this)'},t.label);
    tabBar.appendChild(btn);
  });
  mc.appendChild(tabBar);
  var tabsWrap = h('div',{id:'ru-tabs'});

  // FAQ
  var tabFaq = h('div',{class:'tab-panel active',id:'tab-faq'});
  tabFaq.appendChild(sectionTitle('Preguntas frecuentes'));
  var faqData = [
    ['¿Cómo saco un turno en un hospital público?',
     '<p>En CABA podés sacar turno por:</p><ul><li><strong>Presencialmente:</strong> acercate al hospital con DNI, sin turno previo para urgencias.</li><li><strong>Por teléfono:</strong> llamá directamente al hospital que necesitás.</li><li><strong>Online:</strong> algunos hospitales tienen sistema de turnos en <a href="https://www.buenosaires.gob.ar/salud" target="_blank">buenosaires.gob.ar/salud</a>.</li></ul>'],
    ['¿Necesito obra social para atenderme en un hospital público?',
     '<p><strong>No.</strong> Los hospitales públicos atienden a todas las personas independientemente de su situación laboral o cobertura de salud. La atención es gratuita.</p>'],
    ['¿Qué hago si me niegan atención en un hospital?',
     '<p>La negación de atención médica de urgencia es ilegal. Podés:</p><ul><li>Pedir hablar con el jefe de guardia.</li><li>Llamar al <strong>0800-222-5321</strong> (Defensoría del Pueblo CABA).</li><li>Hacer una denuncia en el Ministerio de Salud.</li></ul>'],
    ['¿Cómo accedo a medicamentos gratuitos?',
     '<p>A través del <strong>Programa Remediar</strong>: medicamentos esenciales disponibles en CAPS (Centros de Atención Primaria) sin costo. También podés consultar en la farmacia del hospital público más cercano.</p>'],
    ['¿Cómo funciona el SAME?',
     '<p>El SAME (107) es el sistema de emergencias médicas de CABA. Atiende emergencias médicas reales. Llamá si hay riesgo de vida: ACV, infarto, accidente grave, parto, dificultad respiratoria severa.</p>'],
    ['¿Qué es el Plan 1000 días?',
     '<p>Programa del Estado Nacional que brinda apoyo a mujeres embarazadas y a bebés hasta los 3 años: controles gratuitos, suplementos nutricionales, asesoramiento y acompañamiento en salud materno-infantil.</p>'],
  ];
  faqData.forEach(function(faq){ tabFaq.appendChild(accItem(faq[0], faq[1])); });
  tabsWrap.appendChild(tabFaq);

  // Derechos del paciente
  var tabDer = h('div',{class:'tab-panel',id:'tab-derechos'});
  tabDer.appendChild(sectionTitle('Derechos del paciente','Ley 26.529 — Derechos del Paciente en su Relación con los Profesionales e Instituciones de la Salud'));
  var derechos = [
    {icon:'📋', d:'Derecho a la información', t:'Tenés derecho a recibir información completa, adecuada y oportuna sobre tu diagnóstico, tratamiento y alternativas disponibles, en términos comprensibles.'},
    {icon:'✅', d:'Consentimiento informado', t:'Ningún procedimiento médico puede realizarse sin tu consentimiento previo y libre. Podés negarte a un tratamiento aunque esté recomendado por el médico.'},
    {icon:'🔒', d:'Confidencialidad', t:'Toda información sobre tu salud es estrictamente confidencial. No puede compartirse sin tu autorización, salvo excepciones legales específicas.'},
    {icon:'📁', d:'Historia clínica', t:'Tenés derecho a acceder a tu historia clínica en cualquier momento. El médico y la institución están obligados a proporcionarla.'},
    {icon:'🏥', d:'Trato digno', t:'Tenés derecho a ser tratado/a con respeto y dignidad, sin discriminación por razones de género, orientación sexual, nacionalidad, religión o condición económica.'},
    {icon:'🩺', d:'Segunda opinión', t:'Podés consultar a otro profesional sin necesitar autorización de tu médico actual.'},
  ];
  var derGrid = h('div',{style:'display:flex;flex-direction:column;gap:1rem;'});
  derechos.forEach(function(d){
    var card = h('div',{class:'card',style:'display:flex;gap:1rem;align-items:flex-start;'});
    card.innerHTML = '<div style="font-size:1.5rem;flex-shrink:0;">'+d.icon+'</div><div><h3 style="font-size:0.9rem;margin:0 0 4px;">'+d.d+'</h3><p style="font-size:0.82rem;color:var(--color-text-muted);margin:0;">'+d.t+'</p></div>';
    derGrid.appendChild(card);
  });
  tabDer.appendChild(derGrid);
  tabsWrap.appendChild(tabDer);

  // Legal
  var tabLegal = h('div',{class:'tab-panel',id:'tab-legal'});
  tabLegal.appendChild(sectionTitle('Información legal','Leyes y organismos clave'));
  var leyes = [
    ['Ley 26.529 — Derechos del Paciente','Establece los derechos fundamentales de los pacientes en Argentina: información, consentimiento, privacidad, trato digno e historia clínica.'],
    ['Ley 27.610 — IVE','Establece el derecho al acceso a la interrupción voluntaria del embarazo hasta la semana 14, y en cualquier momento en casos de violación o riesgo de salud.'],
    ['Ley 26.743 — Identidad de género','Derecho a la identidad de género autopercibida, cambio registral gratuito y atención de salud acorde a la identidad de género.'],
    ['Ley 22.953 — Vacunación antirrábica','Vacunación antirrábica obligatoria y gratuita para perros y gatos en todo el territorio nacional.'],
    ['Ley 27.447 — Trasplante de órganos','En Argentina toda persona mayor de 18 años es donante de órganos a menos que haya expresado lo contrario. Podés registrar tu voluntad en el INCUCAI.'],
    ['Mala praxis — ¿qué hacer?','Si sufriste mala praxis médica podés hacer una denuncia ante el Ministerio de Salud (0800-222-5321) o ante el Colegio de Médicos de tu provincia. También podés iniciar una demanda civil con un abogado.'],
  ];
  leyes.forEach(function(l){ tabLegal.appendChild(accItem(l[0],'<p style="font-size:0.84rem;color:var(--color-text-muted);">'+l[1]+'</p>')); });
  tabsWrap.appendChild(tabLegal);

  // Trámites
  var tabTram = h('div',{class:'tab-panel',id:'tab-tramites'});
  tabTram.appendChild(sectionTitle('Trámites y gestiones','Cómo acceder a recursos del Estado'));
  var tramites = [
    {t:'SUMAR — Cobertura sin obra social', d:'Registrarse en el programa de cobertura de salud para personas sin obra social. Se hace en el hospital o CAPS más cercano, con DNI.', link:'https://www.argentina.gob.ar/salud/sumarmas'},
    {t:'PAMI — Jubilados y pensionados', d:'Cobertura integral para jubilados/as y pensionados/as. Tramitarse en cualquier delegación PAMI con DNI y recibo de haberes.', link:'https://www.pami.org.ar'},
    {t:'Historia clínica digital', d:'En CABA podés acceder a tu historia clínica digital a través de Mi Argentina o el portal de salud del GCBA.', link:'https://www.buenosaires.gob.ar/salud'},
    {t:'Donación de órganos — INCUCAI', d:'Registrá tu voluntad de donar en incucai.gov.ar o en el Registro Civil. Es gratuito y online.', link:'https://www.argentina.gob.ar/salud/donarorganos'},
    {t:'Plan 1000 días — embarazo', d:'Programa nacional de acompañamiento para embarazadas y bebés. Consultá en tu CAPS o en argentina.gob.ar/salud', link:'https://www.argentina.gob.ar/salud/1000dias'},
  ];
  var tramGrid = h('div',{style:'display:flex;flex-direction:column;gap:0.75rem;'});
  tramites.forEach(function(tr){
    var card = h('div',{class:'card'});
    card.innerHTML = '<h3 style="font-size:0.9rem;margin:0 0 4px;">'+tr.t+'</h3><p style="font-size:0.82rem;color:var(--color-text-muted);margin:0 0 8px;">'+tr.d+'</p>'
      +'<a href="'+tr.link+'" target="_blank" rel="noopener" style="font-size:0.78rem;font-weight:700;color:var(--primario);text-decoration:none;">Más información →</a>';
    tramGrid.appendChild(card);
  });
  tabTram.appendChild(tramGrid);
  tabsWrap.appendChild(tabTram);

  // Datos y estadísticas oficiales
  var tabDatos = h('div',{class:'tab-panel',id:'tab-datos'});
  tabDatos.appendChild(sectionTitle('Datos y estadísticas oficiales','Fuentes públicas verificadas — para información en tiempo real, consultá el sitio oficial'));
  var datosGrid = h('div',{style:'display:flex;flex-direction:column;gap:0.75rem;'});
  var datosOficiales = [
    {t:'Censo Nacional 2022 (INDEC)', d:'Último censo de población, hogares y viviendas de Argentina. Resultados definitivos: 46.234.830 habitantes.', link:'https://censo.gob.ar/'},
    {t:'INDEC — Instituto Nacional de Estadística y Censos', d:'Estadísticas oficiales del país: precios, empleo, pobreza, salud y más.', link:'https://www.indec.gob.ar/'},
    {t:'Argentina.gob.ar — Datos abiertos', d:'Portal de datos públicos del Estado Nacional, incluyendo estadísticas de salud.', link:'https://datos.gob.ar/'},
    {t:'Ministerio de Salud de la Nación', d:'Información oficial sobre programas, campañas y estadísticas sanitarias nacionales.', link:'https://www.argentina.gob.ar/salud'},
    {t:'Estadísticas de salud (GCBA)', d:'Indicadores y reportes de salud pública de la Ciudad de Buenos Aires.', link:'https://buenosaires.gob.ar/salud'},
  ];
  datosOficiales.forEach(function(d){
    var card = h('div',{class:'card'});
    card.innerHTML = '<h3 style="font-size:0.9rem;margin:0 0 4px;">'+d.t+'</h3><p style="font-size:0.82rem;color:var(--color-text-muted);margin:0 0 8px;">'+d.d+'</p>'
      +'<a href="'+d.link+'" target="_blank" rel="noopener" style="font-size:0.78rem;font-weight:700;color:var(--primario);text-decoration:none;">Ver fuente oficial →</a>';
    datosGrid.appendChild(card);
  });
  tabDatos.appendChild(datosGrid);
  tabDatos.appendChild(h('p',{style:'font-size:0.76rem;color:var(--gris-medio);margin-top:0.75rem;'},'Solo incluimos cifras que pudimos verificar en fuentes oficiales. Para datos actualizados, siempre es mejor consultar el sitio fuente.'));
  tabsWrap.appendChild(tabDatos);

  mc.appendChild(tabsWrap);
  view.appendChild(mc);
  return view;
}

function viewSobre() {
  const wrap = h('div',{class:'view'});
  const mc = h('div',{class:'main-content'});
  const hero = h('div',{style:'background:linear-gradient(135deg,#3d0f0f,#7c2d2d,#176353,#1e1b4b);color:white;padding:2rem 1.75rem;border-radius:16px;margin-bottom:2rem;text-align:center;'});
  hero.innerHTML = `<div style="font-size:2.5rem;margin-bottom:0.5rem;">🇦🇷</div><h1 style="font-family:Georgia,serif;font-size:2rem;font-weight:700;margin:0 0 0.35rem;color:white;">Auxili<em style="color:#f9a8a8;font-style:italic;">AR</em></h1><p style="color:rgba(255,255,255,0.8);font-size:0.9rem;margin:0;">Recursos de salud gratuitos para todas las personas en Argentina</p>`;
  mc.appendChild(hero);
  mc.appendChild(h('div',{class:'aviso aviso-warn'},[h('span',{},'⚠️'),h('div',{},'AUXILIAR no sustituye la atención médica ni psicológica profesional. Ante una emergencia, llamá al 911 o al 107 (SAME).')]));
  const infoData = [
    {icon:'🎯',title:'¿Qué es AUXILIAR?',text:'AUXILIAR es una plataforma pensada para acompañar a personas que necesitan ayuda o desean ayudar, orientándolas paso a paso hacia recursos oficiales y gratuitos de salud, asistencia y orientación en Argentina.'},
    {icon:'📍',title:'Cobertura geográfica',text:'Priorizamos recursos de CABA e incluimos información del GBA, la Provincia de Buenos Aires y recursos de alcance nacional. La plataforma está en expansión continua.'},
    {icon:'📋',title:'Fuentes de información',text:'La información proviene de fuentes oficiales: Ministerio de Salud de la Nación, GCBA, INCUCAI, SEDRONAR e INADI. Recomendamos verificar la vigencia antes de trasladarte.'},
    {icon:'🔒',title:'Privacidad y datos',text:'AUXILIAR no recopila datos personales ni utiliza cookies de seguimiento. El perfil de usuario se guarda únicamente en tu dispositivo y nunca se transmite a ningún servidor.'},
    {icon:'🤝',title:'¿Cómo colaborar?',text:'Si sos profesional de la salud, pertenecés a una organización o querés colaborar, podés hacerlo desde la sección "Sumate a Ayudar".'},
  ];
  const block = h('div',{class:'section-block'});
  infoData.forEach(item=>{
    const d = h('div',{style:'display:flex;gap:1rem;align-items:flex-start;margin-bottom:1.5rem;'});
    const ico = h('div',{style:'font-size:1.6rem;flex-shrink:0;margin-top:2px;'},item.icon);
    const txt = h('div',{});
    txt.appendChild(h('h3',{style:'font-size:0.95rem;font-weight:700;margin:0 0 0.3rem;'},item.title));
    txt.appendChild(h('p',{style:'font-size:0.85rem;color:var(--color-text-muted);line-height:1.7;margin:0;'},item.text));
    d.appendChild(ico); d.appendChild(txt); block.appendChild(d);
  });
  const btnWrap = h('div',{style:'display:flex;gap:0.75rem;flex-wrap:wrap;margin-top:0.5rem;'});
  btnWrap.appendChild(h('button',{class:'btn btn--primary',onclick:()=>navigate('/')},'← Volver al inicio'));
  btnWrap.appendChild(h('button',{class:'btn btn--outline',onclick:()=>navigate('/sumate')},'Sumate a ayudar'));
  block.appendChild(btnWrap);
  mc.appendChild(block);
  wrap.appendChild(mc);
  return wrap;
}

/* ============ SEARCH ============ */
const searchIndex = [
  // Emergencias
  {t:'Emergencias médicas · SAME · 107',s:'contactos',tag:'Emergencias'},
  {t:'911 · policía · seguridad',s:'contactos',tag:'Emergencias'},
  {t:'144 · violencia de género · femicidio',s:'contactos',tag:'Emergencias'},
  {t:'135 · crisis emocional · salud mental urgente',s:'contactos',tag:'Emergencias'},
  {t:'102 · niñez · adolescencia · derechos',s:'contactos',tag:'Emergencias'},
  {t:'100 · bomberos · incendio',s:'contactos',tag:'Emergencias'},
  {t:'103 · defensa civil · inundación',s:'contactos',tag:'Emergencias'},
  {t:'137 · violencia familiar · asistencia',s:'contactos',tag:'Emergencias'},
  {t:'Accidente de tráfico · protocolo',s:'protocolos',tag:'Emergencias'},
  {t:'Incendio · evacuación',s:'protocolos',tag:'Emergencias'},
  {t:'Inundación · defensa civil',s:'protocolos',tag:'Emergencias'},
  {t:'Intoxicación · antiponzoñoso · veneno',s:'protocolos',tag:'Emergencias'},
  // Primeros auxilios
  {t:'RCP · reanimación cardiopulmonar',s:'primeros-auxilios',tag:'Primeros auxilios'},
  {t:'Atragantamiento · maniobra de Heimlich',s:'primeros-auxilios',tag:'Primeros auxilios'},
  {t:'ACV · accidente cerebrovascular · FAST',s:'primeros-auxilios',tag:'Primeros auxilios'},
  {t:'Quemaduras · primeros auxilios · agua fría',s:'primeros-auxilios',tag:'Primeros auxilios'},
  {t:'Desmayo · pérdida de consciencia',s:'primeros-auxilios',tag:'Primeros auxilios'},
  {t:'Posición lateral de seguridad · PLS',s:'primeros-auxilios',tag:'Primeros auxilios'},
  {t:'Hemorragia · sangrado · herida',s:'primeros-auxilios',tag:'Primeros auxilios'},
  {t:'Quiz primeros auxilios · práctica',s:'primeros-auxilios',tag:'Primeros auxilios'},
  // Salud Física
  {t:'Hospitales públicos gratuitos CABA',s:'hospitales',tag:'Salud Física'},
  {t:'Hospital Ramos Mejía · guardia',s:'hospitales',tag:'Salud Física'},
  {t:'Hospital Fernández · traumatología',s:'hospitales',tag:'Salud Física'},
  {t:'Hospital Rivadavia · maternidad',s:'hospitales',tag:'Salud Física'},
  {t:'Hospital Santojanni · clínica',s:'hospitales',tag:'Salud Física'},
  {t:'CeSAC · centros de salud barrio',s:'hospitales',tag:'Salud Física'},
  {t:'Vacunación gratuita · calendario nacional nacional',s:'vacunas',tag:'Salud Física'},
  {t:'Vacuna gripal · antigripal',s:'vacunas',tag:'Salud Física'},
  {t:'Vacuna COVID · coronavirus',s:'vacunas',tag:'Salud Física'},
  {t:'HPV · vacuna · adolescentes',s:'vacunas',tag:'Salud Física'},
  {t:'Vacunas · viajes · fiebre amarilla',s:'vacunas',tag:'Salud Física'},
  {t:'Remediar · medicamentos gratuitos',s:'programas',tag:'Salud Física'},
  {t:'PAMI · jubilados · pensionados',s:'programas',tag:'Salud Física'},
  {t:'SUMAR · sin obra social',s:'programas',tag:'Salud Física'},
  {t:'Plan 1000 días · embarazo · maternidad',s:'programas',tag:'Salud Física'},
  {t:'Guardia médica · urgencias · sin turno',s:'hospitales',tag:'Salud Física'},
  // Salud Mental
  {t:'Psicólogos gratuitos · salud mental',s:'salud-mental',tag:'Salud Mental'},
  {t:'Línea 135 · crisis emocional · suicidio',s:'lineas',tag:'Salud Mental'},
  {t:'Hospital Borda · psiquiatría',s:'salud-mental',tag:'Salud Mental'},
  {t:'Hospital Moyano · salud mental mujeres',s:'salud-mental',tag:'Salud Mental'},
  {t:'Ansiedad · angustia · ayuda psicológica',s:'lineas',tag:'Salud Mental'},
  {t:'Depresión · tristeza · apoyo emocional',s:'lineas',tag:'Salud Mental'},
  {t:'SEDRONAR · adicciones · consumo problemático',s:'salud-mental',tag:'Salud Mental'},
  {t:'Respiración · técnica 4-7-8 · calma',s:'salud-mental',tag:'Salud Mental'},
  {t:'Grounding · 5-4-3-2-1 · ansiedad',s:'salud-mental',tag:'Salud Mental'},
  // ESI
  {t:'Anticonceptivos gratuitos · pastillas · DIU',s:'esi',tag:'ESI'},
  {t:'Preservativos gratuitos',s:'esi',tag:'ESI'},
  {t:'Implante anticonceptivo · gratuito',s:'esi',tag:'ESI'},
  {t:'Anticoncepción de emergencia · pastilla del día después',s:'esi',tag:'ESI'},
  {t:'IVE · interrupción voluntaria embarazo · aborto legal',s:'esi',tag:'ESI'},
  {t:'Identidad de género · cambio registral · Ley 26.743',s:'esi',tag:'ESI'},
  {t:'INADI · discriminación · orientación sexual',s:'esi',tag:'ESI'},
  {t:'ESI · educación sexual integral · Ley 26.150',s:'esi',tag:'ESI'},
  // Mascotas
  {t:'Veterinarias gratuitas · mascotas · CABA',s:'veterinarias',tag:'Animales'},
  {t:'Castración gratuita · perros · gatos',s:'veterinarias',tag:'Animales'},
  {t:'Vacunación antirrábica · mascotas',s:'vacunacion-animals',tag:'Animales'},
  {t:'Primeros auxilios para mascotas · atragantamiento',s:'pa-animals',tag:'Animales'},
  {t:'Intoxicación animal · veneno animal',s:'pa-animals',tag:'Animales'},
  {t:'Móviles veterinarios · barrios CABA',s:'veterinarias',tag:'Animales'},
  // Donaciones
  {t:'Donación de sangre · cómo donar · requisitos',s:'donaciones',tag:'Donaciones'},
  {t:'Banco de sangre · hospital · donde donar',s:'donaciones',tag:'Donaciones'},
  {t:'Donación órganos · INCUCAI · Ley 27.447',s:'donaciones',tag:'Donaciones'},
  {t:'Plasma · médula ósea · donantes',s:'donaciones',tag:'Donaciones'},
  {t:'Garrahan · donación sangre pediátrica',s:'donaciones',tag:'Donaciones'},
  // Centros / navegación
  {t:'Centros de atención · mapa hospitales',s:'centros',tag:'Centros'},
  {t:'Sobre AUXILIAR · qué es · cómo funciona',s:'sobre',tag:'AUXILIAR'},
  {t:'Voluntarios · profesionales · ONG · colaborar',s:'sumate',tag:'Sumate'},
];
const SEARCH_NAV = {
  'centros': '/centros',
  'sobre': '/sobre-auxiliar',
  'sumate': '/sumate',
};
const SEARCH_ROUTE_MAP = {
  'contactos':'/categorias/emergencias',
  'protocolos':'/categorias/emergencias',
  'primeros-auxilios':'/categorias/primeros-auxilios',
  'hospitales':'/categorias/salud-fisica',
  'vacunas':'/categorias/salud-fisica',
  'programas':'/categorias/salud-fisica',
  'lineas':'/categorias/salud-mental',
  'salud-mental':'/categorias/salud-mental',
  'esi':'/categorias/esi',
  'veterinarias':'/categorias/animales',
  'vacunacion-animales':'/categorias/animales',
  'pa-animales':'/categorias/animales',
  'donaciones':'/categorias/donaciones',
};
function irA(sec) {
  const hsInput = document.getElementById('headerSearchInput');
  const hsResults = document.getElementById('headerSearchResults');
  if (hsInput) hsInput.value = '';
  if (hsResults) hsResults.classList.remove('open');
  // Special nav routes (not categories)
  if (SEARCH_NAV[sec]) { navigate(SEARCH_NAV[sec]); return; }
  const route = SEARCH_ROUTE_MAP[sec] || '/categorias';
  const currentPath = window.location.hash.replace(/^#/,'')||'/';
  if (currentPath === route) {
    const el = document.getElementById('sec-'+sec);
    if (el) { el.scrollIntoView({behavior:'smooth'}); return; }
  }
  navigate(route + '/' + sec);
}

/* ============ THEME ============ */
let currentTheme = getPrefs('theme','light');
function applyTheme(theme) {
  if (theme==='dark') document.documentElement.setAttribute('data-theme','dark');
  else document.documentElement.removeAttribute('data-theme');
  const btn = document.getElementById('theme-toggle');
  if (btn) {
    btn.setAttribute('aria-pressed', String(theme==='dark'));
    btn.setAttribute('aria-label', theme==='dark'?'Modo claro':'Modo oscuro');
    const sun=btn.querySelector('.icon-sun'); const moon=btn.querySelector('.icon-moon');
    if(sun) sun.hidden=(theme==='dark');
    if(moon) moon.hidden=(theme!=='dark');
  }
  currentTheme = theme;
  syncA11yPanel();
}
function setTheme(theme) {
  applyTheme(theme);
  savePrefs('theme',theme);
  if (theme === 'light' && highContrast) {
    highContrast = false;
    applyContrast(false);
    savePrefs('contrast', false);
    showToast('Alto contraste desactivado — solo disponible en modo oscuro');
  }
  syncA11yPanel();
}
function toggleTheme() { setTheme(currentTheme==='dark'?'light':'dark'); }

/* ============ CONTRAST ============ */
let highContrast = getPrefs('contrast',false);
function applyContrast(hc) {
  document.body.classList.toggle('high-contrast', hc);
  const sw = document.getElementById('a11y-contrast-sw');
  if (sw) { sw.classList.toggle('on',hc); sw.setAttribute('aria-pressed',String(hc)); }
}
function toggleContrast() { highContrast=!highContrast; applyContrast(highContrast); savePrefs('contrast',highContrast); }

/* ============ TEXT SIZE ============ */
let textScale = getPrefs('textscale',1);
function setTextSize(scale) {
  textScale = scale;
  const px = Math.round(16 * scale);
  document.documentElement.style.fontSize = px + 'px';
  savePrefs('textscale', scale);
  syncA11yPanel();
}

/* ============ LINE SPACING ============ */
let lineSpacing = getPrefs('linespacing',1.7);
function setLineSpacing(val) {
  lineSpacing = val;
  document.documentElement.style.setProperty('--line-spacing', val);
  savePrefs('linespacing', val);
  syncA11yPanel();
}

/* ============ A11Y PANEL ============ */
function toggleA11yPanel() {
  const panel = document.getElementById('a11yPanel');
  const tab = document.getElementById('a11yTab');
  const isOpen = panel.classList.contains('open');
  panel.classList.toggle('open', !isOpen);
  tab.setAttribute('aria-expanded', String(!isOpen));
}

/* Gestos táctiles: swipe para abrir/cerrar el panel de accesibilidad en mobile */
(function(){
  function trackSwipe(el, onSwipeLeft, onSwipeRight) {
    var startX = null, startY = null;
    el.addEventListener('touchstart', function(e){
      startX = e.touches[0].clientX; startY = e.touches[0].clientY;
    }, {passive:true});
    el.addEventListener('touchend', function(e){
      if (startX === null) return;
      var endX = e.changedTouches[0].clientX;
      var endY = e.changedTouches[0].clientY;
      var dx = endX - startX, dy = endY - startY;
      // Solo contar como swipe horizontal si el movimiento horizontal domina claramente
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        if (dx < 0 && onSwipeLeft) onSwipeLeft();
        if (dx > 0 && onSwipeRight) onSwipeRight();
      }
      startX = null; startY = null;
    }, {passive:true});
  }
  document.addEventListener('DOMContentLoaded', function(){
    var tab = document.getElementById('a11yTab');
    var panel = document.getElementById('a11yPanel');
    if (tab) trackSwipe(tab, function(){ if(!panel.classList.contains('open')) toggleA11yPanel(); }, null);
    if (panel) trackSwipe(panel, null, function(){ if(panel.classList.contains('open')) toggleA11yPanel(); });
  });
})();

function syncA11yPanel() {
  // Theme buttons
  const lBtn=document.getElementById('a11y-light');
  const dBtn=document.getElementById('a11y-dark');
  if(lBtn) lBtn.classList.toggle('active', currentTheme==='light');
  if(dBtn) dBtn.classList.toggle('active', currentTheme==='dark');
  // Contrast switch
  const sw=document.getElementById('a11y-contrast-sw');
  if(sw){ sw.classList.toggle('on',highContrast); sw.setAttribute('aria-pressed',String(highContrast)); }
  const contrastRow = document.getElementById('a11y-contrast-row');
  const contrastNote = document.getElementById('a11y-contrast-disabled-note');
  if (contrastRow && contrastNote) {
    const disponible = currentTheme === 'dark';
    contrastRow.style.display = disponible ? '' : 'none';
    contrastNote.style.display = disponible ? 'none' : '';
  }
  // Text size and line spacing — mark active by matching onclick value
  document.querySelectorAll('.a11y-opt').forEach(btn => {
    const oc = btn.getAttribute('onclick') || '';
    if (oc.includes('setTextSize')) {
      const m = oc.match(/setTextSize\(([^)]+)\)/);
      if (m) btn.classList.toggle('active', Math.abs(parseFloat(m[1]) - textScale) < 0.01);
    }
    if (oc.includes('setLineSpacing')) {
      const m = oc.match(/setLineSpacing\(([^)]+)\)/);
      if (m) btn.classList.toggle('active', parseFloat(m[1]) === lineSpacing);
    }
    if (oc.includes("setTheme('light')")) btn.classList.toggle('active', currentTheme==='light');
    if (oc.includes("setTheme('dark')")) btn.classList.toggle('active', currentTheme==='dark');
  });
}
function resetA11y() {
  setTheme('light');
  highContrast=false; applyContrast(false); savePrefs('contrast',false);
  setTextSize(1);
  setLineSpacing(1.7);
  showToast('Configuración restablecida');
}

/* ============ TOAST ============ */
function showToast(msg) {
  const t=document.getElementById('auxiToast');
  if(!t)return;
  t.textContent=msg; t.style.opacity='1'; t.style.transform='translateX(-50%) translateY(0)';
  clearTimeout(t._timer);
  t._timer=setTimeout(()=>{ t.style.opacity='0'; t.style.transform='translateX(-50%) translateY(20px)'; },2200);
}

/* ============ HAMBURGER ============ */
// Nav dropdown con delay para no desaparecer al mover cursor
document.querySelectorAll('.has-dropdown').forEach(function(li) {
  var timer;
  var dd = li.querySelector('.nav-dropdown');
  if (!dd) return;
  li.addEventListener('mouseenter', function() {
    clearTimeout(timer);
    dd.style.opacity='1'; dd.style.pointerEvents='all'; dd.style.transform='translateY(0)';
  });
  li.addEventListener('mouseleave', function() {
    timer = setTimeout(function() {
      dd.style.opacity='0'; dd.style.pointerEvents='none'; dd.style.transform='translateY(6px)';
    }, 200);
  });
  dd.addEventListener('mouseenter', function() { clearTimeout(timer); });
  dd.addEventListener('mouseleave', function() {
    timer = setTimeout(function() {
      dd.style.opacity='0'; dd.style.pointerEvents='none'; dd.style.transform='translateY(6px)';
    }, 200);
  });
});

document.getElementById('hamburger')?.addEventListener('click',function(){
  const nl=document.getElementById('navLinks');
  const open=nl.classList.toggle('open');
  this.setAttribute('aria-expanded',open);
  if (!open) {
    // Al cerrar el menú, también colapsamos el desplegable de Categorías
    // para que la próxima vez que se abra el menú arranque siempre cerrado.
    document.querySelectorAll('.has-dropdown').forEach(function(li){ li.classList.remove('dropdown-open'); });
  }
});

const MOBILE_BREAKPOINT = 680;
function handleCategoriasClick(event, linkEl) {
  event.preventDefault();
  if (window.innerWidth <= MOBILE_BREAKPOINT) {
    // En mobile: el link funciona como acordeón (abre/cierra el submenú)
    const li = linkEl.closest('.has-dropdown');
    li.classList.toggle('dropdown-open');
  } else {
    // En escritorio: comportamiento original, navega a la categoría
    navigate('/categorias');
  }
}

/* ============ HEADER SEARCH ============ */
(function(){
  const input = document.getElementById('headerSearchInput');
  const resultsEl = document.getElementById('headerSearchResults');
  if(!input||!resultsEl)return;
  var currentResults = [];
  input.addEventListener('input',function(){
    var q=this.value.toLowerCase().trim();
    if(q.length<2){ resultsEl.classList.remove('open'); currentResults=[]; return; }
    currentResults=searchIndex.filter(function(i){return i.t.toLowerCase().includes(q);}).slice(0,8);
    if(!currentResults.length){
      resultsEl.innerHTML='<div class="sr-item" style="color:var(--gris-medio);font-style:italic;">Sin resultados para "'+q+'"</div>';
      resultsEl.classList.add('open');
      return;
    }
    resultsEl.innerHTML=currentResults.map(function(r){
      var s = r.s;
      return '<div class="sr-item" role="option" tabindex="0" onclick="irA(\'' + s + '\')" onkeydown="if(event.key===\'Enter\')irA(\'' + s + '\')" style="cursor:pointer;"><span class="sr-tag">' + r.tag + '</span>' + r.t.split('·')[0].trim() + '</div>';
    }).join('');
    resultsEl.classList.add('open');
  });
  // Enter key: navega al primer resultado
  input.addEventListener('keydown',function(e){
    if(e.key==='Enter'){
      e.preventDefault();
      if(currentResults.length>0){
        irA(currentResults[0].s);
        input.value='';
        resultsEl.classList.remove('open');
      }
    }
    // Flechas para navegar entre resultados
    if(e.key==='ArrowDown'){
      e.preventDefault();
      var items=resultsEl.querySelectorAll('.sr-item');
      if(items.length) items[0].focus();
    }
  });
  document.addEventListener('click',function(e){ if(!e.target.closest('.header-search')) resultsEl.classList.remove('open'); });
})();

/* ============ INIT ============ */
// Aplicar preferencias inmediatamente
if(currentTheme==='dark') document.documentElement.setAttribute('data-theme','dark');
if(highContrast) document.body.classList.add('high-contrast');
document.documentElement.style.fontSize = Math.round(16 * textScale) + 'px';
document.documentElement.style.setProperty('--line-spacing', lineSpacing);


/* ===================== TTS — LECTURA EN VOZ ALTA ===================== */
var ttsSpeaking = false;
var ttsVoice = null;

function ttsSupported() { return 'speechSynthesis' in window; }

// Seleccionar la mejor voz disponible: masculina, español, suave
function ttsSelectVoice() {
  if (!ttsSupported()) return;
  var voices = window.speechSynthesis.getVoices();
  if (!voices.length) return;
  // Prioridad: español AR masculina > español masculina > español cualquiera > primera disponible
  var priorities = [
    // Google voices sound most natural on Android/Chrome
    function(v){ return v.name.match(/Google.*[Ee]sp|Google.*[Ss]pan/i) && v.lang.startsWith('es'); },
    // Named male voices in Spanish
    function(v){ return v.lang==='es-AR' && v.name.match(/[Jj]orge|[Mm]iguel|[Cc]arlos|[Aa]ntonio|[Mm]arcos|[Ll]ucas/i); },
    function(v){ return v.lang.startsWith('es') && v.name.match(/[Jj]orge|[Mm]iguel|[Cc]arlos|[Aa]ntonio|[Ee]nrique|[Rr]afa/i); },
    // Any es-AR non-female
    function(v){ return v.lang==='es-AR' && !v.name.match(/[Ff]emale|[Mm]onica|[Cc]armen|[Ll]uisa|[Vv]aleria/i); },
    // Any Spanish
    function(v){ return v.lang.startsWith('es'); },
  ];
  for (var i=0; i<priorities.length; i++) {
    var match = voices.filter(priorities[i]);
    if (match.length) { ttsVoice = match[0]; break; }
  }
  if (!ttsVoice && voices.length) ttsVoice = voices[0];
}

// Cargar voces (puede ser async en algunos navegadores)
if (ttsSupported()) {
  ttsSelectVoice();
  window.speechSynthesis.onvoiceschanged = ttsSelectVoice;
}

function ttsSpeak(text) {
  if (!ttsSupported()) { showToast('Tu navegador no soporta lectura en voz alta'); return; }
  if (ttsSpeaking) {
    window.speechSynthesis.cancel();
    ttsSpeaking = false;
    document.querySelectorAll('.tts-btn').forEach(function(b){ b.textContent='🔊 Escuchar'; b.classList.remove('speaking'); });
    return;
  }
  // Limpiar texto de HTML y emojis para lectura más limpia
  var clean = text
    .replace(/<[^>]*>/g,'')
    .replace(/[😊🙂💙⚠️🎉🤔←→★☆📋📞📍🗺🔊⏹]/gu,'')
    .replace(/\s+/g,' ').trim();
  var utt = new SpeechSynthesisUtterance(clean);
  utt.lang = 'es-AR';
  utt.rate = 0.95;   // ritmo más natural y dinámico
  utt.pitch = 1.1;   // más agudo = más cálido y amable, menos robótico
  utt.volume = 1;
  utt.volume = 1;
  if (ttsVoice) utt.voice = ttsVoice;
  utt.onend = function(){
    ttsSpeaking = false;
    document.querySelectorAll('.tts-btn').forEach(function(b){ b.textContent='🔊 Escuchar'; b.classList.remove('speaking'); });
  };
  utt.onerror = function(){ ttsSpeaking = false; };
  ttsSpeaking = true;
  document.querySelectorAll('.tts-btn').forEach(function(b){ b.textContent='⏹ Detener'; b.classList.add('speaking'); });
  window.speechSynthesis.speak(utt);
}

function ttsPageContent() {
  // Lee el contenido principal de la página actual
  var btn = document.getElementById('globalTtsBtn');
  if (ttsSpeaking) {
    ttsSpeak(''); // toggles off
    if (btn) btn.textContent = '🔊 Leer esta página';
    return;
  }
  // Extraer texto del main content o auxi-bubble
  var main = document.getElementById('main-content') || document.getElementById('app-outlet');
  if (!main) { showToast('No hay contenido para leer'); return; }
  var text = main.innerText || main.textContent || '';
  // Quitar las etiquetas de los propios botones de lectura para que no se lean a sí mismos
  text = text.replace(/🔊\s*Escuchar/g,'').replace(/⏹\s*Detener(\s*lectura)?/g,'').replace(/🔊\s*Leer esta página/g,'');
  // Limitar para no generar audios excesivamente largos, con margen sobre el contenido más extenso del sitio
  text = text.slice(0,4000).trim();
  if (!text) { showToast('No hay contenido para leer'); return; }
  ttsSpeak(text);
  if (btn) btn.textContent = '⏹ Detener lectura';
}

window.addEventListener('hashchange', renderRoute);
renderRoute();

// Post-render
applyTheme(currentTheme);
if (currentTheme === 'light' && highContrast) {
  highContrast = false;
  savePrefs('contrast', false);
}
applyContrast(highContrast);
syncA11yPanel();
