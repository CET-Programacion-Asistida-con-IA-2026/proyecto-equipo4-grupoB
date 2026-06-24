/* ===================== DATOS ===================== */
const searchIndex = [
  {t:'Emergencias médicas · SAME · 107',s:'contactos',tag:'Emergencias'},
  {t:'RCP · reanimación cardiopulmonar',s:'primeros-auxilios',tag:'Primeros auxilios'},
  {t:'Atragantamiento · Heimlich',s:'primeros-auxilios',tag:'Primeros auxilios'},
  {t:'ACV · accidente cerebrovascular · FAST',s:'primeros-auxilios',tag:'Primeros auxilios'},
  {t:'Quemaduras · cómo tratar',s:'primeros-auxilios',tag:'Primeros auxilios'},
  {t:'Hemorragias · heridas · sangrado',s:'primeros-auxilios',tag:'Primeros auxilios'},
  {t:'Hospital Garrahan · pediatría · niños',s:'hospitales',tag:'Hospitales'},
  {t:'Hospital Muñiz · infecciosas',s:'hospitales',tag:'Hospitales'},
  {t:'Hospital Posadas · alta complejidad · GBA',s:'hospitales',tag:'Hospitales'},
  {t:'Hospital Roffo · oncología · cáncer',s:'hospitales',tag:'Hospitales'},
  {t:'Hospital Borda · salud mental',s:'hospitales',tag:'Hospitales'},
  {t:'Hospital Fernández · urgencias',s:'hospitales',tag:'Hospitales'},
  {t:'Hospital Álvarez · guardia · adultos',s:'hospitales',tag:'Hospitales'},
  {t:'Vacunas gratuitas · calendario nacional',s:'vacunas',tag:'Vacunas'},
  {t:'Vacuna antigripal · gripe',s:'vacunas',tag:'Vacunas'},
  {t:'VPH · papiloma · vacuna',s:'vacunas',tag:'Vacunas'},
  {t:'Programa Sumar · embarazo · niños sin obra social',s:'programas',tag:'Programas'},
  {t:'REMEDIAR · medicamentos gratuitos · crónicos',s:'programas',tag:'Programas'},
  {t:'Diabetes · insulina · PRODIM',s:'programas',tag:'Programas'},
  {t:'Salud mental gratuita · Ley 26.657',s:'programas',tag:'Programas'},
  {t:'Línea 135 · crisis emocional · suicidio',s:'salud-mental',tag:'Salud Mental'},
  {t:'Psicólogos gratuitos · CABA',s:'salud-mental',tag:'Salud Mental'},
  {t:'Ansiedad · depresión · ayuda',s:'salud-mental',tag:'Salud Mental'},
  {t:'Violencia de género · 144',s:'ongs',tag:'ONGs'},
  {t:'SEDRONAR · adicciones · 141',s:'ongs',tag:'ONGs'},
  {t:'Cruz Roja · emergencias',s:'ongs',tag:'ONGs'},
  {t:'Animal herido · SAME veterinario · 4613-3399',s:'mascotas',tag:'Mascotas'},
  {t:'Vacuna antirrábica · mascotas · gratuita',s:'mascotas',tag:'Mascotas'},
  {t:'Castración gratuita · mascotas',s:'mascotas',tag:'Mascotas'},
  {t:'Derechos del paciente · Ley 26.529',s:'derechos',tag:'Derechos'},
  {t:'Anticonceptivos gratuitos · ESI · métodos',s:'esi',tag:'ESI'},
  {t:'Situación de calle · 108',s:'ongs',tag:'ONGs'},
  {t:'Trata de personas · 145',s:'contactos',tag:'Emergencias'},
];

/* ===================== STORAGE / PREFERENCIAS ===================== */
function savePrefs(key, val) {
  try { localStorage.setItem('aux_'+key, JSON.stringify(val)); } catch(e){}
}
function getPrefs(key, def) {
  try { const v = localStorage.getItem('aux_'+key); return v ? JSON.parse(v) : def; } catch(e){ return def; }
}

/* ===================== ROUTER ===================== */
const outlet = document.getElementById('app-outlet');
const searchSection = document.getElementById('searchSection');

const PAGE_TITLES = {
  '/': 'AUXILIAR',
  '/busco-ayuda': 'Busco Ayuda — AUXILIAR',
  '/busco-ayuda/emergencia': 'Situación de emergencia — AUXILIAR',
  '/quiero-ayudar': 'Quiero Ayudar — AUXILIAR',
  '/quiero-ayudar/mascota': 'Ayuda para mascota — AUXILIAR',
  '/sumate': 'Sumate a Ayudar — AUXILIAR',
  '/categorias': 'Categorías — AUXILIAR',
  '/sobre-auxiliar': 'Sobre AUXILIAR',
  '/favoritos': 'Mis favoritos — AUXILIAR',
};

const CATEGORY_VIEWS = {
  'salud-fisica': viewSaludFisica,
  'salud-mental': viewSaludMental,
  'esi': viewESI,
  'mascotas': viewMascotas,
  'primeros-auxilios': viewPrimerosAuxilios,
  'emergencias': viewEmergencias,
  'donaciones': viewDonaciones,
};

function navigate(path) {
  window.location.hash = '#' + path;
  savePrefs('lastPath', path);
}

function h(tag, attrs, children) {
  const el = document.createElement(tag);
  if (attrs) Object.entries(attrs).forEach(([k,v]) => {
    if (k === 'class') el.className = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v !== null && v !== undefined) el.setAttribute(k, v);
  });
  if (children) {
    (Array.isArray(children) ? children : [children]).forEach(c => {
      if (c == null) return;
      el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
  }
  return el;
}

function renderInto(container, node) {
  container.innerHTML = '';
  if (node) container.appendChild(node);
}

function renderRoute() {
  const path = (window.location.hash.replace(/^#/,'') || '/');
  let node;
  const showSearch = path !== '/' && path !== '/busco-ayuda' && path !== '/quiero-ayudar' && path !== '/sumate';
  searchSection.style.display = showSearch ? 'block' : 'none';

  if (path === '/') node = viewInicio();
  else if (path === '/busco-ayuda') node = viewBuscoAyuda();
  else if (path === '/busco-ayuda/emergencia') node = viewEmergenciaUrgente();
  else if (path === '/quiero-ayudar') node = viewQuieroAyudar();
  else if (path === '/quiero-ayudar/persona') node = viewAyudarPersona();
  else if (path === '/quiero-ayudar/mascota') node = viewMascotas();
  else if (path === '/sumate') node = viewSumate();
  else if (path === '/categorias') node = viewCategorias();
  else if (path === '/sobre-auxiliar') node = viewSobre();
  else if (path === '/favoritos') node = viewFavoritos();
  else if (path.startsWith('/categorias/')) {
    const slug = path.split('/')[2];
    // Handle sub-section scroll
    const parts = path.split('/');
    const subSection = parts[3];
    const fn = CATEGORY_VIEWS[slug];
    node = fn ? fn() : render404();
    if (subSection) {
      setTimeout(() => {
        const el = document.getElementById('sec-'+subSection);
        if (el) el.scrollIntoView({behavior:'smooth'});
      }, 100);
    }
  } else node = render404();

  renderInto(outlet, node);
  document.title = PAGE_TITLES[path] || 'AUXILIAR';
  window.scrollTo({top:0,behavior:'auto'});
}

function render404() {
  return h('div',{class:'container view',style:'text-align:center;padding-top:3rem;'},[
    h('p',{style:'font-size:3rem;'},'🔍'),
    h('h1',{},'Página no encontrada'),
    h('p',{},'La sección que buscás no existe o fue movida.'),
    h('button',{class:'btn btn--primary',onclick:()=>navigate('/')},'Volver al inicio'),
  ]);
}

/* ===================== VIEW: INICIO ===================== */
function viewInicio() {
  const wrap = h('div',{class:'onboarding'});
  const inner = h('div',{class:'onboarding-inner'},[
    h('h1',{},['Auxili',h('em',{class:'ar-highlight'},'AR')]),
    h('p',{class:'onboarding-subtitle'},'Encontrá recursos de salud, ayuda y emergencias en Argentina'),
    h('div',{class:'choice-buttons'},[
      makeChoiceBtn('🤝','BUSCO AYUDA','Encontrá recursos de salud y ayuda','choice-btn--highlight',()=>navigate('/busco-ayuda')),
      makeChoiceBtn('💚','QUIERO AYUDAR','Ayudar a otra persona o a una mascota','',()=>navigate('/quiero-ayudar')),
    ]),
    h('div',{style:'margin-top:0.5rem;'},[
      h('p',{style:'color:rgba(255,255,255,0.5);font-size:0.8rem;margin-bottom:0.4rem;'},'¿Sos profesional, pertenecés a una organización o querés colaborar?'),
      h('button',{class:'contrib-link',onclick:()=>navigate('/sumate')},'→ SUMATE A AYUDAR'),
    ]),
  ]);
  wrap.appendChild(inner);
  return wrap;
}

function makeChoiceBtn(icon, title, desc, extraClass, cb) {
  const btn = h('button',{class:'choice-btn '+(extraClass||''),onclick:cb});
  btn.innerHTML = `<div class="choice-icon">${icon}</div><div><div class="choice-title">${title}</div><div class="choice-desc">${desc}</div></div>`;
  return btn;
}

/* ===================== VIEW: BUSCO AYUDA ===================== */
function viewBuscoAyuda() {
  return h('div',{class:'view'},[
    flowHeader('← Volver','BUSCO AYUDA','¿Qué tipo de ayuda necesitás?',()=>navigate('/')),
    h('div',{class:'question-screen'},[
      h('div',{class:'options-list'},[
        makeOptionBtn('❤️','Salud Física','Médicos, guardias, hospitales',()=>navigate('/categorias/salud-fisica')),
        makeOptionBtn('🧠','Salud Mental','Apoyo emocional, psicólogos gratuitos',()=>navigate('/categorias/salud-mental')),
        makeOptionBtn('📚','ESI','Métodos anticonceptivos, derechos sexuales',()=>navigate('/categorias/esi')),
        makeOptionBtn('🚨','Emergencias','Situación urgente ahora mismo',()=>navigate('/busco-ayuda/emergencia')),
        makeOptionBtn('🩹','Primeros Auxilios','Guías para actuar en el momento',()=>navigate('/categorias/primeros-auxilios')),
        makeOptionBtn('🐾','Mascotas','Veterinarias, vacunas, primeros auxilios',()=>navigate('/categorias/mascotas')),
      ]),
    ]),
  ]);
}

function viewEmergenciaUrgente() {
  return h('div',{class:'view'},[
    flowHeader('← Volver','EMERGENCIA','Situación urgente',()=>navigate('/busco-ayuda')),
    h('div',{class:'question-screen'},[
      h('div',{class:'emergency-panel'},[
        h('h3',{},'📞 Llamá ahora'),
        h('div',{class:'emg-numbers'},[
          makeEmgNum('911','Policía / Emergencias generales'),
          makeEmgNum('107','SAME — Ambulancias (CABA)'),
          makeEmgNum('144','Violencia de género'),
          makeEmgNum('102','Niñez y adolescencia'),
          makeEmgNum('135','Crisis emocional / Suicidio'),
          makeEmgNum('145','Trata de personas'),
          makeEmgNum('141','Drogas / SEDRONAR'),
          makeEmgNum('108','Situación de calle'),
        ]),
      ]),
      h('h2',{style:'font-size:1.1rem;margin-top:1.5rem;margin-bottom:0.9rem;'},'También podés acceder a:'),
      h('div',{class:'options-list'},[
        makeOptionBtn('🏥','Primeros Auxilios','Guías paso a paso para actuar',()=>navigate('/categorias/primeros-auxilios')),
        makeOptionBtn('🏥','Hospitales públicos','Guardia gratuita más cercana',()=>navigate('/categorias/salud-fisica')),
        makeOptionBtn('🧠','Salud Mental urgente','Apoyo inmediato',()=>navigate('/categorias/salud-mental')),
      ]),
    ]),
  ]);
}

function makeEmgNum(num, label) {
  const telNum = num.replace(/[^0-9+]/g,'');
  const a = h('a',{href:'tel:'+telNum,class:'emg-number'});
  a.innerHTML = `<div><span class="emg-code">${num}</span></div><div class="emg-label">${label}</div>`;
  return a;
}

/* ===================== VIEW: QUIERO AYUDAR ===================== */
function viewQuieroAyudar() {
  return h('div',{class:'view'},[
    flowHeader('← Volver','QUIERO AYUDAR','¿A quién querés ayudar?',()=>navigate('/')),
    h('div',{class:'question-screen'},[
      h('div',{class:'options-list'},[
        makeOptionBtn('👤','A una persona','Guía para ayudar a alguien',()=>navigate('/quiero-ayudar/persona')),
        makeOptionBtn('🐾','A una mascota','Veterinarias, vacunas, primeros auxilios',()=>navigate('/quiero-ayudar/mascota')),
      ]),
    ]),
  ]);
}

function viewAyudarPersona() {
  return h('div',{class:'view'},[
    flowHeader('← Volver','AYUDAR A UNA PERSONA','Evaluá la situación',()=>navigate('/quiero-ayudar')),
    h('div',{class:'question-screen'},[
      h('h2',{style:'font-size:1.1rem;'},'¿Qué está ocurriendo?'),
      h('div',{class:'options-list'},[
        makeOptionBtn('🚨','Es una emergencia o peligro inmediato','Llamá al 911 o 107 ahora',()=>navigate('/busco-ayuda/emergencia')),
        makeOptionBtn('🏥','Necesita atención médica urgente','Llevarla a una guardia gratuita',()=>navigate('/categorias/salud-fisica')),
        makeOptionBtn('🧠','Está pasando por una crisis emocional','Línea 135 · apoyo inmediato',()=>navigate('/categorias/salud-mental')),
        makeOptionBtn('💜','Es víctima de violencia','Línea 144 · Recursos de ayuda',()=>navigate('/categorias/esi')),
        makeOptionBtn('🩹','Necesita primeros auxilios','Guías paso a paso',()=>navigate('/categorias/primeros-auxilios')),
        makeOptionBtn('📋','Busca recursos generales','Ver todas las categorías',()=>navigate('/categorias')),
      ]),
    ]),
  ]);
}

/* ===================== VIEW: SUMATE ===================== */
function viewSumate() {
  return h('div',{class:'view'},[
    catBanner('Sumate a Ayudar','Para profesionales, organizaciones y voluntarios',
      '#1fa97a, #1a6b4a, #0a2e1f',
      `<svg viewBox="0 0 200 200" width="180" height="180" xmlns="http://www.w3.org/2000/svg">
        <!-- Dos personas + corazón -->
        <circle cx="72" cy="70" r="26" fill="rgba(255,255,255,0.5)"/>
        <path d="M38 155 C38 125 55 112 72 112 C89 112 106 125 106 155Z" fill="rgba(255,255,255,0.5)"/>
        <circle cx="130" cy="70" r="26" fill="rgba(255,255,255,0.35)"/>
        <path d="M96 155 C96 125 113 112 130 112 C147 112 164 125 164 155Z" fill="rgba(255,255,255,0.35)"/>
        <!-- corazón entre ellos -->
        <path d="M101 48 C101 48 92 58 92 64 C92 69 96 72 101 72 C106 72 110 69 110 64 C110 58 101 48 101 48Z" fill="rgba(255,150,150,0.8)"/>
      </svg>`
    ),
    formView(),
  ]);
}

/* ===================== FORM VIEW ===================== */
function formView() {
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const PHONE_REGEX = /^[\d\s+()\-]{6,20}$/;

  function fieldEl(name, label, type, required, hint) {
    const children = [
      h('label',{for:name}, required ? label+' *' : label),
      h('input',{type:type||'text',id:name,name,required:required?'required':null}),
    ];
    if (hint) children.push(h('p',{class:'form-field__hint'},hint));
    return h('div',{class:'form-field'},children);
  }
  function selectEl(name, label, options, required) {
    const opts = [h('option',{value:''},'Seleccioná una opción'), ...options.map(o=>h('option',{value:o.v},o.l))];
    return h('div',{class:'form-field'},[
      h('label',{for:name},required ? label+' *' : label),
      h('select',{id:name,name,required:required?'required':null},opts),
    ]);
  }
  function textareaEl(name, label) {
    return h('div',{class:'form-field'},[h('label',{for:name},label),h('textarea',{id:name,name})]);
  }

  const form = h('form',{id:'form-voluntarios',novalidate:'novalidate'});
  const statusDiv = h('div',{id:'form-status'});

  form.appendChild(h('div',{class:'form-grid-2'},[
    fieldEl('nombre','Nombre','text',true),
    fieldEl('apellido','Apellido','text',true),
  ]));
  form.appendChild(h('div',{class:'form-grid-2'},[
    fieldEl('edad','Edad','number',true),
    fieldEl('email','Correo electrónico','email',true),
  ]));
  form.appendChild(h('div',{class:'form-grid-2'},[
    fieldEl('telefono','Teléfono','tel',true),
    fieldEl('provincia','Provincia','text',true,'Ej: Ciudad Autónoma de Buenos Aires'),
  ]));
  form.appendChild(h('div',{class:'form-grid-2'},[
    fieldEl('localidad','Localidad','text',true),
    selectEl('modalidad','Modalidad de ayuda',[{v:'presencial',l:'Presencial'},{v:'virtual',l:'Virtual'},{v:'ambas',l:'Ambas'}],true),
  ]));
  form.appendChild(h('div',{class:'form-grid-2'},[
    fieldEl('profesion','Profesión u oficio','text',false),
    fieldEl('especialidad','Especialidad','text',false),
  ]));
  form.appendChild(textareaEl('experiencia','Experiencia'));
  form.appendChild(fieldEl('disponibilidad','Disponibilidad horaria','text',false,'Ej: lunes a viernes por la tarde'));
  form.appendChild(textareaEl('colaboracion','¿Cómo le gustaría colaborar?'));
  form.appendChild(textareaEl('comentarios','Comentarios adicionales'));
  form.appendChild(h('button',{type:'submit',class:'btn btn--primary btn--block'},'Enviar inscripción'));

  form.addEventListener('submit', e => {
    e.preventDefault();
    const data = new FormData(form);
    const errors = {};
    ['nombre','apellido','edad','email','telefono','provincia','localidad','modalidad'].forEach(f => {
      const v = (data.get(f)||'').trim();
      if (!v) { errors[f] = 'Este campo es obligatorio.'; return; }
      if (f === 'email' && !EMAIL_REGEX.test(v)) errors[f] = 'Ingresá un correo válido.';
      if (f === 'telefono' && !PHONE_REGEX.test(v)) errors[f] = 'Ingresá un teléfono válido.';
    });
    form.querySelectorAll('.form-field--error').forEach(el => {
      el.classList.remove('form-field--error');
      const msg = el.querySelector('.form-field__error');
      if (msg) msg.remove();
    });
    Object.entries(errors).forEach(([name,msg]) => {
      const inp = form.elements.namedItem(name);
      if (!inp) return;
      const fieldEl = inp.closest('.form-field');
      if (!fieldEl) return;
      fieldEl.classList.add('form-field--error');
      fieldEl.appendChild(h('p',{class:'form-field__error',role:'alert'},msg));
    });
    statusDiv.innerHTML = '';
    if (Object.keys(errors).length > 0) {
      statusDiv.appendChild(h('div',{class:'form-status form-status--error',role:'alert'},'Revisá los campos marcados antes de enviar.'));
      form.querySelector('.form-field--error input, .form-field--error select')?.focus();
      return;
    }
    statusDiv.appendChild(h('div',{class:'form-status form-status--success',role:'alert'},'¡Gracias por sumarte! Tu inscripción fue recibida. El equipo de AUXILIAR se va a poner en contacto con vos pronto.'));
    form.reset();
  });

  return h('div',{class:'main-content'},[
    h('div',{class:'section-block'},[
      h('p',{},'Completá este formulario para sumarte como voluntario/a, profesional u organización. Toda la información es confidencial.'),
      form, statusDiv,
      h('p',{style:'font-size:0.8rem;color:var(--color-text-muted);margin-top:0.5rem;'},'Los campos marcados con * son obligatorios.'),
    ]),
  ]);
}

/* ===================== VIEW: CATEGORIAS ===================== */
const CAT_DATA = [
  {
    icon:'❤️', emoji:'🏥', title:'Salud Física', slug:'salud-fisica',
    bg:'linear-gradient(135deg,#e63946,#b5172b)',
    items:['Hospitales públicos gratuitos','Guardias de urgencia','Vacunación · Programas del Estado','Médicos especialistas sin obra social'],
  },
  {
    icon:'🧠', emoji:'🧠', title:'Salud Mental', slug:'salud-mental',
    bg:'linear-gradient(135deg,#4361ee,#1a2a8c)',
    items:['Línea 135 · crisis emocional','Psicólogos gratuitos · CABA','Hospitales especializados','Herramientas de bienestar'],
  },
  {
    icon:'📚', emoji:'💜', title:'ESI', slug:'esi',
    bg:'linear-gradient(135deg,#00b894,#007d5a)',
    items:['Anticonceptivos gratuitos','Derechos sexuales y reproductivos','IVE · Ley 27.610','Consentimiento e identidad'],
  },
  {
    icon:'🩹', emoji:'🚑', title:'Primeros Auxilios', slug:'primeros-auxilios',
    bg:'linear-gradient(135deg,#f77f00,#d45a1a)',
    items:['RCP paso a paso','Atragantamiento · Heimlich','ACV · Quemaduras · Heridas','Quiz interactivo'],
  },
  {
    icon:'🚨', emoji:'🆘', title:'Emergencias', slug:'emergencias',
    bg:'linear-gradient(135deg,#d00000,#7d0000)',
    items:['911 · 107 (SAME) · 144','Protocolos de actuación','Recursos por región','Intoxicaciones · Accidentes'],
  },
  {
    icon:'🐾', emoji:'🐕', title:'Mascotas', slug:'mascotas',
    bg:'linear-gradient(135deg,#f4a200,#c97c00)',
    items:['Guardias veterinarias gratuitas','Vacunación antirrábica','Castración gratuita','Primeros auxilios para mascotas'],
  },
  {
    icon:'🤲', emoji:'🩸', title:'Donaciones', slug:'donaciones',
    bg:'linear-gradient(135deg,#0096c7,#023e8a)',
    items:['Donación de sangre','Donación de órganos · INCUCAI','Plasma y médula ósea','Recursos materiales'],
  },
];

function viewCategorias() {
  const grid = h('div',{class:'cat-grid'},CAT_DATA.map(c => {
    const card = h('button',{class:'cat-card',onclick:()=>navigate('/categorias/'+c.slug),'aria-label':'Ver '+c.title});
    card.innerHTML = `
      <div class="cat-card__img" style="background:${c.bg}">
        <span class="cat-card__emoji">${c.emoji}</span>
        <span class="cat-card__icon-sm">${c.icon}</span>
      </div>
      <div class="cat-card__body">
        <h3 class="cat-card__title">${c.title}</h3>
        <ul class="cat-card__list">
          ${c.items.map(i=>`<li>${i}</li>`).join('')}
        </ul>
      </div>`;
    return card;
  }));
  return h('div',{class:'view'},[
    h('div',{class:'main-content'},[
      h('div',{class:'section-block'},[
        h('div',{class:'section-divider'}),
        h('h2',{class:'section-title'},'Categorías de ayuda'),
        h('p',{class:'section-sub'},'Encontrá recursos gratuitos en CABA, GBA y todo el país'),
        grid,
      ]),
    ]),
  ]);
}

/* ===================== VIEW: SALUD FÍSICA ===================== */
function viewSaludFisica() {
  return h('div',{class:'view'},[
    catBanner('Salud Física','Hospitales públicos, guardias gratuitas y programas del Estado',
      '#e63946, #b5172b, #7a0e1a',
      `<svg viewBox="0 0 200 200" width="180" height="180" xmlns="http://www.w3.org/2000/svg">
        <rect x="70" y="30" width="60" height="140" rx="8" fill="rgba(255,255,255,0.18)"/>
        <rect x="30" y="70" width="140" height="60" rx="8" fill="rgba(255,255,255,0.18)"/>
        <rect x="82" y="42" width="36" height="116" rx="5" fill="rgba(255,255,255,0.55)"/>
        <rect x="42" y="82" width="116" height="36" rx="5" fill="rgba(255,255,255,0.55)"/>
        <circle cx="100" cy="100" r="70" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="18"/>
      </svg>`
    ),
    h('div',{class:'main-content'},[
      /* HOSPITALES */
      h('div',{class:'section-block',id:'sec-hospitales'},[
        sectionTitle('🏥 Hospitales públicos','Atención gratuita para todos · sin obra social'),
        mapaLink(
          'Mapa oficial de Hospitales y Centros de Salud CABA',
          'https://buenosaires.gob.ar/salud/establecimientos-hospitales-y-centros-de-salud',
          'Gobierno de la Ciudad · 35 hospitales + 50 CeSAC · Buscador interactivo'
        ),
        h('div',{class:'tabs',id:'hospTabs'},[
          tabBtn('CABA','hospCABA','hospTabs',true),
          tabBtn('GBA / Provincia','hospGBA','hospTabs'),
          tabBtn('Nación','hospNacion','hospTabs'),
        ]),
        h('div',{id:'hospCABA',class:'tab-panel active'},[
          h('div',{class:'hosp-grid'},[
            hospCard('Hosp. Fernández','Urgencias · Adultos · Alta complejidad','Bulnes 2600, CABA','📞 4808-2600'),
            hospCard('Hosp. Álvarez','Guardia General · Adultos','Pedro Goyena 370, CABA','📞 4982-0091'),
            hospCard('Hosp. Garrahan','Pediatría · Alta complejidad','Combate de los Pozos 1881','📞 4122-6000'),
            hospCard('Hosp. Rivadavia','Maternidad · Obstetricia','Las Heras 2670, CABA','📞 4809-2000'),
            hospCard('Hosp. Muñiz','Enfermedades infecciosas','Uspallata 2272, CABA','📞 4304-3113'),
            hospCard('Hosp. Borda','Salud Mental · Adultos','Ramón Carrillo 375, CABA','📞 4305-1087'),
          ]),
        ]),
        h('div',{id:'hospGBA',class:'tab-panel'},[
          h('div',{class:'hosp-grid'},[
            hospCard('Hosp. Posadas','Alta complejidad · GBA','Av. Marconi s/n, El Palomar','📞 4469-9300'),
            hospCard('Hosp. Evita (Lanús)','Guardia · Adultos · GBA','Av. Belgrano 3100, Lanús','📞 4241-2500'),
            hospCard('Hosp. San Martín (La Plata)','Adultos · La Plata','Calle 1 y 70, La Plata','📞 0221-484-3310'),
            hospCard('Hosp. Prof. Alejandro Posadas','Alta complejidad','Marconi s/n, El Palomar','📞 4469-9300'),
            hospCard('Hosp. Mercante','GBA Norte','Dr. Ballerini 3200, José C. Paz','📞 02320-435600'),
          ]),
        ]),
        h('div',{id:'hospNacion',class:'tab-panel'},[
          h('div',{class:'hosp-grid'},[
            hospCard('Hosp. Roffo (Oncología)','Cáncer · Gratuito','Av. San Martín 5480, CABA','📞 4580-2800'),
            hospCard('Hosp. Udaondo','Gastroenterología','Av. Caseros 2061, CABA','📞 4307-2110'),
            hospCard('Hosp. de Clínicas UBA','Adultos · Alta complejidad','Av. Córdoba 2351, CABA','📞 5950-8000'),
            hospCard('FLENI','Neurología','Montañeses 2325, CABA','📞 5777-3200'),
          ]),
        ]),
      ]),
      /* PROGRAMAS */
      h('div',{class:'section-block',id:'sec-programas'},[
        sectionTitle('📋 Programas de salud pública','Servicios estatales gratuitos'),
        h('div',{class:'grid-2'},[
          cardEl('ic-verde','📋','Programa SUMAR','Cobertura para embarazadas, niños y adultos sin obra social.',null),
          cardEl('ic-azul','💊','REMEDIAR','Medicamentos gratuitos para enfermedades crónicas en centros de salud.',null),
          cardEl('ic-verde','🩸','Banco de Sangre','Donación voluntaria. Llamá al hospital más cercano.',null),
          cardEl('ic-amarillo','🍎','PRODIM — Diabetes','Insulina y material gratuito para personas con diabetes. Ley 23.753.',null),
          cardEl('ic-rojo','🩺','Programa DETECTAR','Detección temprana de cáncer, VIH, tuberculosis y otras enfermedades.',null),
          cardEl('ic-naranja','🤰','Plan Nacer','Cobertura completa de parto y control prenatal gratuito.',null),
        ]),
      ]),
      /* VACUNAS */
      h('div',{class:'section-block',id:'sec-vacunas'},[
        sectionTitle('💉 Vacunas gratuitas','Calendario Nacional de Vacunación · Obligatorio y gratuito'),
        calLink(
          'Calendario Nacional de Vacunación 2026',
          'https://www.argentina.gob.ar/salud/vacunas',
          'Ministerio de Salud de la Nación · Gratuito · Sin orden médica · Todas las edades'
        ),
        calLink(
          'Vacunatorios y horarios CABA',
          'https://buenosaires.gob.ar/salud/vacunas/calendario-de-vacunacion',
          'Gobierno de la Ciudad · Descargá el calendario 2026 y consultá los vacunatorios'
        ),
        h('div',{class:'vacuna-wrap'},[
          h('table',[
            h('thead',[h('tr',[th('Vacuna'),th('Para quiénes'),th('Dónde'),th('Tipo')])]),
            h('tbody',[
              vacRow('Antigripal','Embarazadas, mayores, niños, docentes','CAPS y hospitales',true),
              vacRow('VPH (Papiloma)','Niñas y niños 11 años','Centros de salud',true),
              vacRow('Meningococo','Niños hasta 2 años','CAPS',true),
              vacRow('COVID-19','Toda la población','Hospitales y vacunatorios',true),
              vacRow('Antirrábica (mascotas)','Perros y gatos','Vacunatorios municipales',false),
              vacRow('Triple viral','Niños 1 y 5-6 años','CAPS',true),
              vacRow('Hepatitis B','Recién nacidos + adultos en riesgo','CAPS',true),
              vacRow('Neumococo','Menores de 2 y mayores de 65','CAPS',true),
            ]),
          ]),
        ]),
      ]),
      /* HÁBITOS */
      h('div',{class:'section-block'},[
        sectionTitle('🌱 Salud preventiva','Controles y estudios gratuitos'),
        h('div',{class:'grid-3'},[
          cardEl('ic-rojo','♀️','PAP y Mamografía','Control preventivo para mujeres. Gratuito en hospitales públicos.',null),
          cardEl('ic-azul','🩺','Control médico periódico','Plan Argentina Saludable · centros de salud gratuitos.',null),
          cardEl('ic-verde','🦷','Salud bucal','Odontología gratuita en hospitales públicos y CAPS.',null),
          cardEl('ic-amarillo','👁️','Salud visual','Controles oftalmológicos gratuitos en hospitales públicos.',null),
          cardEl('ic-naranja','🏃','Actividad física','Programas municipales gratuitos · Plaza y Deporte (CABA).',null),
          cardEl('ic-verde','🩸','VIH/ITS','Test anónimo y gratuito. CEDT (CABA) y hospitales.',null),
        ]),
      ]),
    ]),
  ]);
}

/* ===================== VIEW: SALUD MENTAL ===================== */
function viewSaludMental() {
  return h('div',{class:'view'},[
    catBanner('Salud Mental','Ayuda gratuita, confidencial y disponible las 24 horas',
      '#4361ee, #1a2a8c, #0a1050',
      `<svg viewBox="0 0 200 200" width="180" height="180" xmlns="http://www.w3.org/2000/svg">
        <circle cx="100" cy="85" r="55" fill="rgba(255,255,255,0.18)"/>
        <path d="M65 85 Q65 45 100 45 Q135 45 135 85 Q135 110 115 125 L115 145 Q115 150 110 150 L90 150 Q85 150 85 145 L85 125 Q65 110 65 85Z" fill="rgba(255,255,255,0.55)"/>
        <rect x="90" y="155" width="20" height="14" rx="3" fill="rgba(255,255,255,0.55)"/>
        <circle cx="82" cy="78" r="5" fill="rgba(255,255,255,0.9)"/>
        <circle cx="118" cy="78" r="5" fill="rgba(255,255,255,0.9)"/>
        <path d="M88 97 Q100 108 112 97" stroke="rgba(255,255,255,0.9)" stroke-width="4" fill="none" stroke-linecap="round"/>
      </svg>`
    ),
    h('div',{class:'main-content'},[
      h('div',{class:'aviso aviso-danger'},[
        h('span',{},'🆘'),
        h('div',{},'Si estás pensando en hacerte daño o en quitarte la vida, llamá ahora al 135 (gratuito, 24 hs). No estás solo/a.'),
      ]),
      /* LÍNEAS */
      h('div',{class:'section-block',id:'sec-lineas'},[
        sectionTitle('📞 Líneas de ayuda gratuitas','Disponibles 24 horas · Confidenciales'),
        h('div',{class:'grid-4'},[
          contactoCard('135','Crisis emocional · Suicidio','24 hs · Gratuito · Confidencial'),
          contactoCard('0800-999-3425','Salud Mental Provincia BA','Lun–Vie 8–22 hs'),
          contactoCard('0800-222-0042','ACEP · Apoyo psicológico','Urgencias psiquiátricas'),
          contactoCard('4122-6339','Hosp. Garrahan · Salud Mental','Pediatría · CABA'),
        ]),
      ]),
      /* HOSPITALES SM */
      h('div',{class:'section-block',id:'sec-salud-mental'},[
        sectionTitle('🏥 Hospitales especializados en Salud Mental'),
        h('div',{class:'hosp-grid'},[
          hospCard('Hosp. Borda','Psiquiatría · Adultos','Ramón Carrillo 375, CABA','📞 4305-1087'),
          hospCard('Hosp. Moyano','Salud Mental · Mujeres','Brandsen 2570, CABA','📞 4308-3900'),
          hospCard('Hosp. Tobar García','Psiquiatría infanto-juvenil','Ramón Carrillo 315, CABA','📞 4305-1054'),
          hospCard('CENARESO','Adicciones · Gratuito','Av. Warnes 2630, CABA','📞 4580-3500'),
        ]),
      ]),
      /* RECURSOS */
      h('div',{class:'section-block'},[
        sectionTitle('🧘 Recursos de bienestar','Herramientas gratuitas de apoyo'),
        h('div',{class:'accordion'},[
          accItem('💨 Ejercicio de respiración 4-7-8','<p>Inhalá contando hasta 4 · Retené el aire contando hasta 7 · Exhalá contando hasta 8. Repetí 3 veces. Ayuda a calmar el sistema nervioso en momentos de ansiedad.</p>'),
          accItem('🌿 Técnica 5-4-3-2-1 (grounding)','<p>Nombrá: 5 cosas que ves · 4 que podés tocar · 3 que escuchás · 2 que olés · 1 que probás. Ayuda a volver al presente cuando la ansiedad te abruma.</p>'),
          accItem('📓 Diario emocional','<p>Escribir lo que sentís puede ayudar a procesar emociones difíciles. No tiene que ser perfecto. Solo unas líneas al día hacen una diferencia a largo plazo.</p>'),
          accItem('🤝 Redes de apoyo','<p>Hablá con alguien de confianza. No tenés que atravesar esto solo/a. Si no tenés a quién recurrir, la línea 135 está disponible siempre.</p>'),
          accItem('🚶 Actividad física y bienestar','<p>Caminar 30 minutos al día tiene impacto comprobado en la salud mental. Muchos parques y clubes de barrio ofrecen actividades gratuitas.</p>'),
        ]),
      ]),
      /* PSICÓLOGOS */
      h('div',{class:'section-block'},[
        sectionTitle('👩‍⚕️ Psicólogos gratuitos — CABA'),
        h('div',{class:'aviso aviso-info'},[h('span',{},'ℹ️'),h('div',{},'La Ley 26.657 (Salud Mental) garantiza el derecho a recibir atención psicológica gratuita en hospitales públicos. Pedí turno en el servicio de Salud Mental de tu hospital más cercano.')]),
        h('div',{class:'grid-2'},[
          cardEl('ic-verde','🏥','Hospitales públicos','Servicio de Salud Mental gratuito. Pedí turno presencialmente o en turnos.buenosaires.gob.ar',null),
          cardEl('ic-azul','🌐','PPSICO (UBA)','Atención psicológica gratuita ofrecida por la Universidad de Buenos Aires. Buenos Aires.',null),
          cardEl('ic-naranja','💙','CPAAAS','Centro de Psicoanálisis para Adultos y Adolescentes. Atención a bajo costo.',null),
          cardEl('ic-verde','📱','Centro Dra. Eva Giberti','Violencia familiar y abuso sexual. Gratuito. 4300-2115',null),
        ]),
      ]),
    ]),
  ]);
}

/* ===================== VIEW: ESI ===================== */
function viewESI() {
  return h('div',{class:'view'},[
    catBanner('ESI','Educación Sexual Integral · Derechos y acceso gratuito',
      '#00b894, #007d5a, #00462f',
      `<svg viewBox="0 0 200 200" width="180" height="180" xmlns="http://www.w3.org/2000/svg">
        <circle cx="100" cy="100" r="65" fill="rgba(255,255,255,0.15)"/>
        <path d="M100 45 C70 45 50 65 50 90 C50 130 100 160 100 160 C100 160 150 130 150 90 C150 65 130 45 100 45Z" fill="rgba(255,255,255,0.5)"/>
        <path d="M100 62 C78 62 62 76 62 92 C62 122 100 145 100 145 C100 145 138 122 138 92 C138 76 122 62 100 62Z" fill="rgba(255,255,255,0.25)"/>
        <circle cx="100" cy="96" r="18" fill="rgba(255,255,255,0.8)"/>
        <circle cx="100" cy="96" r="9" fill="rgba(26,107,74,0.6)"/>
      </svg>`
    ),
    h('div',{class:'main-content'},[
      h('div',{class:'aviso aviso-info'},[h('span',{},'ℹ️'),h('div',{},'La ESI (Ley 26.150) y el Programa de Salud Sexual (Ley 25.673) garantizan acceso gratuito a métodos anticonceptivos, información y atención en todo el país.')]),
      h('div',{class:'section-block'},[
        sectionTitle('💊 Métodos anticonceptivos gratuitos','Disponibles en hospitales y CAPS sin receta médica obligatoria'),
        h('div',{class:'grid-3'},[
          cardEl('ic-verde','💊','Pastillas anticonceptivas','Gratuitas en hospitales públicos y CAPS. Pedí en farmacia hospitalaria.',null),
          cardEl('ic-azul','🔵','Inyectable','Anticonceptivo inyectable mensual o trimestral. Gratuito en CAPS.',null),
          cardEl('ic-rojo','🔴','DIU / Implante','Colocación gratuita en hospitales públicos. Muy efectivos.',null),
          cardEl('ic-verde','🌿','Preservativos','Gratuitos en hospitales, CAPS y centros de salud de todo el país.',null),
          cardEl('ic-naranja','🆘','Anticoncepción de Emergencia','La pastilla del día después es gratuita en hospitales. Disponible 72 hs después de la relación.',null),
          cardEl('ic-azul','✂️','Ligadura / Vasectomía','Gratuitas en hospitales públicos para adultos que lo soliciten. No hace falta autorización.',null),
        ]),
      ]),
      h('div',{class:'section-block'},[
        sectionTitle('📚 Consentimiento y derechos'),
        h('div',{class:'accordion'},[
          accItem('✅ ¿Qué es el consentimiento?','<p>El consentimiento es un acuerdo claro, entusiasta y continuo entre todas las personas involucradas. Puede retirarse en cualquier momento. La ausencia de "no" no es un "sí".</p>'),
          accItem('🚫 Violencia sexual y dónde pedir ayuda','<p>La violencia sexual es un delito. Podés llamar al <strong>144</strong> (violencia de género) o ir a cualquier guardia hospitalaria. Hay asistencia gratuita las 24 horas.</p>'),
          accItem('🌈 Diversidad e identidad','<p>La Ley de Identidad de Género (26.743) permite rectificar el género en documentos sin cirugías. El DNI actualizado garantiza acceso igualitario a servicios.</p>'),
          accItem('👶 Derechos en el embarazo','<p>Tenés derecho a parto respetado, lactancia, licencia y acompañamiento. El maltrato obstétrico está prohibido por ley. Si lo sufrís, podés hacer una denuncia formal.</p>'),
          accItem('🔬 ITS: Infecciones de transmisión sexual','<p>Muchas ITS no tienen síntomas. El test de VIH y sífilis es gratuito y anónimo en hospitales públicos y CEDT (CABA). El tratamiento del VIH es gratuito (Ley 23.798).</p>'),
          accItem('⚖️ Interrupción Voluntaria del Embarazo (IVE)','<p>La IVE es legal y gratuita en Argentina hasta la semana 14 (Ley 27.610). Podés solicitarla en hospitales públicos sin dar explicaciones. Línea de orientación: 0800-222-3444.</p>'),
        ]),
      ]),
      h('div',{class:'section-block'},[
        sectionTitle('📞 Dónde pedir ayuda'),
        h('div',{class:'grid-4'},[
          contactoCard('144','Violencia de género y sexual','24 hs · Gratuito'),
          contactoCard('0800-222-3444','IVE / Interrupción del Embarazo','Asesoramiento gratuito'),
          contactoCard('0800-333-8444','INADI · Discriminación','Denuncias de discriminación'),
          contactoCard('137','Violencia familiar','Asistencia inmediata'),
        ]),
      ]),
    ]),
  ]);
}

/* ===================== VIEW: MASCOTAS ===================== */
function viewMascotas() {
  return h('div',{class:'view'},[
    catBanner('Mascotas','Veterinarias gratuitas, vacunas y primeros auxilios',
      '#f4a200, #c97c00, #7a4900',
      `<svg viewBox="0 0 200 200" width="180" height="180" xmlns="http://www.w3.org/2000/svg">
        <!-- Perro simplificado -->
        <ellipse cx="100" cy="120" rx="45" ry="38" fill="rgba(255,255,255,0.5)"/>
        <circle cx="100" cy="78" r="28" fill="rgba(255,255,255,0.5)"/>
        <!-- orejas -->
        <ellipse cx="76" cy="60" rx="14" ry="22" fill="rgba(255,255,255,0.35)" transform="rotate(-15 76 60)"/>
        <ellipse cx="124" cy="60" rx="14" ry="22" fill="rgba(255,255,255,0.35)" transform="rotate(15 124 60)"/>
        <!-- ojos -->
        <circle cx="90" cy="75" r="5" fill="rgba(255,255,255,0.9)"/>
        <circle cx="110" cy="75" r="5" fill="rgba(255,255,255,0.9)"/>
        <circle cx="91" cy="74" r="2.5" fill="rgba(140,70,0,0.7)"/>
        <circle cx="111" cy="74" r="2.5" fill="rgba(140,70,0,0.7)"/>
        <!-- nariz -->
        <ellipse cx="100" cy="88" rx="8" ry="5" fill="rgba(255,255,255,0.8)"/>
        <!-- cola -->
        <path d="M145 118 Q168 100 162 128" stroke="rgba(255,255,255,0.5)" stroke-width="10" fill="none" stroke-linecap="round"/>
        <!-- patas -->
        <rect x="68" y="148" width="16" height="18" rx="8" fill="rgba(255,255,255,0.4)"/>
        <rect x="90" y="150" width="16" height="16" rx="8" fill="rgba(255,255,255,0.4)"/>
        <rect x="112" y="150" width="16" height="16" rx="8" fill="rgba(255,255,255,0.4)"/>
      </svg>`
    ),
    h('div',{class:'main-content'},[
      h('div',{class:'section-block',id:'sec-veterinarias'},[
        sectionTitle('🐾 Guardias y veterinarias gratuitas','CABA y Gran Buenos Aires'),
        mapaLink(
          'Centros veterinarios y cronograma semanal CABA',
          'https://buenosaires.gob.ar/agenciaambiental/mascotas/atencion-veterinaria-y-castraciones-gratuitas',
          'Gobierno de la Ciudad · 8 móviles + 2 centros fijos · Castración y vacunación gratuita'
        ),
        h('div',{class:'aviso aviso-danger'},[h('span',{},'🚨'),h('div',{},'Animal herido o en peligro en CABA: llamá al SAME Veterinario: 📞 4613-3399')]),
        h('div',{class:'hosp-grid'},[
          hospCard('SAME Veterinario CABA','Emergencias · 24 hs','Palermo, CABA','📞 4613-3399'),
          hospCard('Centro Antirrábico CABA','Vacunación · Consultas','Murillo 120, CABA','📞 4855-3399'),
          hospCard('Zoonosis CABA','Animales en vía pública','Warnes 1010, CABA','📞 147 (guardia)'),
          hospCard('Org. Protectora (Lanús)','GBA · Rescate','Lanús','📞 15-5555-4040'),
        ]),
      ]),
      h('div',{class:'section-block',id:'sec-vacunacion-mascotas'},[
        sectionTitle('💉 Vacunación gratuita','Para perros y gatos'),
        calLink(
          'Cronograma vacunación antirrábica gratuita CABA',
          'https://buenosaires.gob.ar/agenciaambiental/mascotas/atencion-veterinaria-y-castraciones-gratuitas',
          'Sin turno previo · Perros y gatos · Obligatoria por ley (Ley 22.953) · Se actualiza cada viernes'
        ),
        calLink(
          'Turno online castración gratuita (MiBA)',
          'https://buenosaires.gob.ar/agenciaambiental/mascotas/atencion-veterinaria-y-castraciones-gratuitas',
          'Turnos disponibles cada viernes a las 10 hs · Centros fijos: Villa Soldati y Costanera Sur'
        ),
        h('div',{class:'grid-2'},[
          cardEl('ic-verde','🐕','Vacuna antirrábica','Gratuita para perros y gatos en vacunatorios municipales. Obligatoria por ley.',null),
          cardEl('ic-azul','✂️','Castración gratuita','CABA ofrece castración quirúrgica gratuita. Inscribite en: buenosaires.gob.ar',null),
          cardEl('ic-naranja','🐈','Chip de identificación','Microchip gratuito para mascotas en centros de zoonosis. Obligatorio en CABA.',null),
          cardEl('ic-verde','📋','Registro de mascota','Obligatorio en CABA. Gratuito en centros de zoonosis. Tenés que renovarlo anualmente.',null),
        ]),
      ]),
      h('div',{class:'section-block',id:'sec-pa-mascotas'},[
        sectionTitle('🩹 Primeros auxilios para mascotas'),
        h('div',{class:'accordion'},[
          accItem('🐕 Atragantamiento en perros o gatos','<ul><li>Si el animal está consciente: abrí la boca con cuidado y buscá el objeto con dos dedos.</li><li>Realizá compresiones abdominales suaves si no podés verlo.</li><li>Llevalo urgente al veterinario.</li></ul>'),
          accItem('🩸 Heridas y sangrado','<ul><li>Aplicá presión con gasa limpia.</li><li>No uses alcohol puro ni agua oxigenada (dañan el tejido).</li><li>Si el sangrado no cede en 5 minutos, es urgencia veterinaria.</li></ul>'),
          accItem('🔥 Golpe de calor','<ul><li>Movelo a un lugar fresco y con sombra.</li><li>Aplicá paños húmedos (no helados) en axilas y cuello.</li><li>Ofrecé agua fresca en pequeñas cantidades.</li><li>Veterinario urgente si no mejora en 10 minutos.</li></ul>'),
          accItem('☠️ Intoxicación o ingesta de tóxicos','<ul><li>No lo hagas vomitar sin indicación veterinaria (puede empeorar).</li><li>Identificá qué ingirió y llevá el envase al veterinario.</li><li>Llamá urgente al SAME Veterinario: 4613-3399</li></ul>'),
          accItem('🦴 Fracturas y traumatismos','<ul><li>Inmovilizá al animal con cuidado, sin forzar.</li><li>Usá una tabla o cartón como camilla improvisada.</li><li>Cubrilo con una manta para evitar el shock.</li><li>Veterinario urgente.</li></ul>'),
        ]),
      ]),
    ]),
  ]);
}

/* ===================== VIEW: PRIMEROS AUXILIOS ===================== */
const preguntas = [
  {q:'¿Cuál es el primer paso ante una persona inconsciente?',opts:['Empezar RCP de inmediato','Llamar al 107 y verificar si responde','Darle agua','Ponerla de lado'],ok:1,ex:'Primero verificás si responde y llamás al 107. La RCP empieza si no hay respiración normal después de esa verificación.'},
  {q:'¿A qué ritmo deben hacerse las compresiones en RCP?',opts:['50–60 por minuto','100–120 por minuto','150 por minuto','El ritmo no importa'],ok:1,ex:'El ritmo correcto es 100–120 compresiones por minuto, con una profundidad de al menos 5 cm.'},
  {q:'¿La maniobra de Heimlich se aplica en bebés menores de 1 año?',opts:['Sí, igual que adultos','Sí, pero más suave','No: 5 golpes en espalda + 5 compresiones torácicas','No, se aplica RCP directamente'],ok:2,ex:'En bebés menores de 1 año nunca se usa Heimlich. La técnica correcta es 5 golpes interescapulares + 5 compresiones torácicas, alternando.'},
  {q:'¿Qué NO hay que aplicar sobre una quemadura?',opts:['Agua fría corriente','Gasa limpia','Pasta dental o manteca','Ninguna, todas son correctas'],ok:2,ex:'La pasta dental, manteca y aceite pueden empeorar la quemadura e infectarla. Solo agua fría corriente por 20 minutos y gasa limpia.'},
  {q:'¿Qué significa la F en el método FAST para detectar un ACV?',opts:['Fiebre alta','Cara: verificar si un lado cae','Frecuencia cardíaca','Fatiga extrema'],ok:1,ex:'FAST: Face (cara), Arms (brazos), Speech (habla), Time (tiempo). La "F" es verificar si un lado de la cara cae al pedir que sonría.'},
  {q:'¿Ante un animal atropellado, qué es lo primero que hay que hacer?',opts:['Moverlo rápido','No moverlo bruscamente y llamar al SAME Veterinario','Darle agua','Dejarlo quieto sin hacer nada'],ok:1,ex:'Moverlo bruscamente puede agravar lesiones internas. Lo correcto es no moverlo sin necesidad, cubrirlo y llamar al SAME Veterinario (4613-3399).'},
];
let testIdx = 0, testScore = 0, testAnswered = false;

function viewPrimerosAuxilios() {
  const view = h('div',{class:'view'});
  view.appendChild(catBanner('Primeros Auxilios','Guías paso a paso para actuar en emergencias',
    '#f77f00, #d45a1a, #8a3200',
    `<svg viewBox="0 0 200 200" width="180" height="180" xmlns="http://www.w3.org/2000/svg">
      <!-- Cruz de primeros auxilios -->
      <rect x="60" y="30" width="80" height="140" rx="12" fill="rgba(255,255,255,0.18)"/>
      <rect x="30" y="60" width="140" height="80" rx="12" fill="rgba(255,255,255,0.18)"/>
      <rect x="72" y="42" width="56" height="116" rx="8" fill="rgba(255,255,255,0.6)"/>
      <rect x="42" y="72" width="116" height="56" rx="8" fill="rgba(255,255,255,0.6)"/>
      <rect x="84" y="54" width="32" height="92" rx="4" fill="rgba(255,255,255,0.4)"/>
      <rect x="54" y="84" width="92" height="32" rx="4" fill="rgba(255,255,255,0.4)"/>
    </svg>`
  ));
  const content = h('div',{class:'main-content'});

  /* CATEGORÍAS */
  content.appendChild(h('div',{class:'section-block'},[
    sectionTitle('📚 Guías de actuación','Qué hacer en situaciones de emergencia'),
    h('div',{class:'pa-category'},[
      h('div',{class:'pa-category-header',onclick:'toggleAcc(this)'},[
        h('span',{style:'font-size:1.5rem;'},'❤️'),
        h('h3',{},'RCP — Reanimación Cardiopulmonar'),
        h('span',{class:'pa-tag badge-rojo',style:'background:var(--rojo-claro);color:var(--rojo);'},'URGENTE'),
      ]),
      h('div',{class:'acc-content'},[
        paStep('1','Verificá si respira','Llamá al 107. Abrí la vía aérea inclinando la cabeza. Fijate si hay respiración normal.'),
        paStep('2','Posicioná las manos','Entrelazá los dedos, poné las manos en el centro del pecho (entre los pezones).'),
        paStep('3','Comprimí fuerte','100–120 compresiones por minuto, al menos 5 cm de profundidad. Dejá que el pecho vuelva a su posición.'),
        paStep('4','Respiraciones de rescate','Si sabés: 30 compresiones y 2 respiraciones. Si no: solo compresiones hasta que llegue la ayuda.'),
        paStep('5','Continuá hasta...','Que el paciente respire · Que llegue la ambulancia · O hasta 30 minutos si estás solo/a.'),
      ]),
    ]),
    h('div',{class:'pa-category'},[
      h('div',{class:'pa-category-header',onclick:'toggleAcc(this)'},[
        h('span',{style:'font-size:1.5rem;'},'😮'),
        h('h3',{},'Atragantamiento · Maniobra de Heimlich'),
        h('span',{class:'pa-tag badge-rojo',style:'background:var(--rojo-claro);color:var(--rojo);'},'URGENTE'),
      ]),
      h('div',{class:'acc-content'},[
        paStep('1','¿Puede hablar o toser?','Si SÍ: animalo a toser fuerte. Si NO: actuá inmediatamente.'),
        paStep('2','Posición','Párate detrás, rodeá la cintura con los brazos. Puño justo arriba del ombligo.'),
        paStep('3','Compresiones abdominales','5 compresiones rápidas hacia adentro y arriba. Repetí hasta que el objeto salga.'),
        paStep('4','Bebés menores de 1 año','Nunca Heimlich. Usar 5 golpes en la espalda + 5 compresiones torácicas alternadas.'),
        paStep('5','Inconsciente','Llamá al 107 e iniciá RCP inmediatamente.'),
      ]),
    ]),
    h('div',{class:'pa-category'},[
      h('div',{class:'pa-category-header',onclick:'toggleAcc(this)'},[
        h('span',{style:'font-size:1.5rem;'},'🧠'),
        h('h3',{},'ACV — Accidente Cerebrovascular'),
        h('span',{class:'pa-tag badge-azul',style:'background:var(--azul-claro);color:var(--azul);'},'FAST'),
      ]),
      h('div',{class:'acc-content'},[
        paStep('F','Cara','¿Un lado de la cara cae al pedir que sonría?'),
        paStep('A','Brazos','¿No puede mantener ambos brazos en alto?'),
        paStep('S','Speech (Habla)','¿El habla es incomprensible o confusa?'),
        paStep('T','Tiempo','Si hay 1 o más síntomas: llamá al 107 INMEDIATAMENTE. Cada minuto cuenta.'),
      ]),
    ]),
    h('div',{class:'pa-category'},[
      h('div',{class:'pa-category-header',onclick:'toggleAcc(this)'},[
        h('span',{style:'font-size:1.5rem;'},'🔥'),
        h('h3',{},'Quemaduras'),
        h('span',{class:'pa-tag',style:'background:var(--naranja-claro);color:var(--naranja);'},'IMPORTANTE'),
      ]),
      h('div',{class:'acc-content'},[
        paStep('1','Enfriá la quemadura','Agua corriente fría (no helada) durante 15–20 minutos. Sin hielo.'),
        paStep('2','Cubrí','Gasa estéril o tela limpia. No rompas las ampollas.'),
        paStep('3','No aplicar','❌ Pasta dental · manteca · aceite · alcohol · remedios caseros.'),
        paStep('4','Cuándo ir a la guardia','Quemaduras en cara, manos, articulaciones o genitales · más del 10% del cuerpo · quemaduras eléctricas.'),
      ]),
    ]),
    h('div',{class:'pa-category'},[
      h('div',{class:'pa-category-header',onclick:'toggleAcc(this)'},[
        h('span',{style:'font-size:1.5rem;'},'🩸'),
        h('h3',{},'Hemorragias'),
        h('span',{class:'pa-tag badge-rojo',style:'background:var(--rojo-claro);color:var(--rojo);'},'URGENTE'),
      ]),
      h('div',{class:'acc-content'},[
        paStep('1','Presión directa','Apretá con gasa o tela limpia. Mantené la presión continua.'),
        paStep('2','Elevá la zona','Levantá el miembro lesionado por encima del corazón si es posible.'),
        paStep('3','Si no cede','Si no para en 10 minutos o la herida es profunda: guardia urgente o llamá al 107.'),
        paStep('4','No retires el material','Si la gasa se empapa, agregá más encima. No retires la que está en contacto.'),
      ]),
    ]),
  ]));

  /* QUIZ */
  const quizSection = h('div',{class:'section-block',id:'quiz-section'},[
    sectionTitle('🧪 Quiz de Primeros Auxilios','Poné a prueba tu conocimiento'),
    h('div',{id:'testCard',class:'test-card'}),
  ]);
  content.appendChild(quizSection);
  view.appendChild(content);

  // Init quiz after render
  setTimeout(() => { initTest(); }, 50);
  return view;
}

function initTest() {
  testIdx = 0; testScore = 0; testAnswered = false;
  renderQuestion();
}
function renderQuestion() {
  const card = document.getElementById('testCard');
  if (!card) return;
  if (testIdx >= preguntas.length) { showResult(); return; }
  const p = preguntas[testIdx];
  card.innerHTML = `
    <div class="test-progress"><div class="test-progress-bar" id="testBar" style="width:${testIdx/preguntas.length*100}%"></div></div>
    <p style="font-size:0.78rem;color:var(--gris-medio);margin-bottom:0.5rem;">Pregunta ${testIdx+1} de ${preguntas.length}</p>
    <div class="test-q" id="testQ">${p.q}</div>
    <div class="test-options" id="testOpts">${p.opts.map((o,i)=>`<button class="test-opt" onclick="responder(${i})">${o}</button>`).join('')}</div>
    <div class="test-feedback" id="testFeedback" style="display:none;"></div>
    <div class="test-nav"><button class="btn-next" id="testNext" style="display:none;" onclick="nextQuestion()">Siguiente →</button></div>
  `;
  testAnswered = false;
}
function responder(idx) {
  if (testAnswered) return;
  testAnswered = true;
  const p = preguntas[testIdx];
  const opts = document.querySelectorAll('.test-opt');
  opts.forEach(o => o.disabled = true);
  const fb = document.getElementById('testFeedback');
  if (idx === p.ok) { opts[idx].classList.add('correct'); fb.className='test-feedback ok'; fb.textContent='✓ Correcto. '+p.ex; testScore++; }
  else { opts[idx].classList.add('wrong'); opts[p.ok].classList.add('correct'); fb.className='test-feedback nok'; fb.textContent='✗ Incorrecto. '+p.ex; }
  fb.style.display='block';
  const nxt = document.getElementById('testNext');
  nxt.style.display='block';
  nxt.textContent = testIdx < preguntas.length-1 ? 'Siguiente →' : 'Ver resultados';
}
function nextQuestion() { testIdx++; renderQuestion(); }
function showResult() {
  const pct = Math.round(testScore/preguntas.length*100);
  const msg = pct>=80 ? '¡Muy bien! Tenés buenos conocimientos de primeros auxilios.' : pct>=50 ? 'Bien. Repasá las secciones donde te equivocaste.' : 'Te recomendamos releer las guías de arriba. Puede marcar la diferencia.';
  const card = document.getElementById('testCard');
  if (!card) return;
  card.innerHTML = `<div style="text-align:center;padding:1rem 0;"><div style="font-size:3rem;font-weight:800;font-family:var(--font-heading);color:var(--verde);">${testScore}/${preguntas.length}</div><div style="font-size:0.95rem;color:var(--gris);margin:0.5rem 0 1rem;">${pct}% correcto</div><p style="font-size:0.86rem;color:var(--gris-oscuro);max-width:340px;margin:0 auto 1.5rem;">${msg}</p><button class="btn-next" onclick="initTest()">Reiniciar quiz</button></div>`;
}

/* ===================== VIEW: EMERGENCIAS ===================== */
function viewEmergencias() {
  return h('div',{class:'view'},[
    catBanner('Emergencias','Números de emergencia y protocolos de actuación',
      '#d00000, #8b1a12, #3d0000',
      `<svg viewBox="0 0 200 200" width="190" height="190" xmlns="http://www.w3.org/2000/svg">
        <!-- Ambulancia -->
        <!-- cuerpo -->
        <rect x="20" y="90" width="130" height="65" rx="8" fill="rgba(255,255,255,0.55)"/>
        <!-- cabina -->
        <rect x="120" y="75" width="50" height="80" rx="8" fill="rgba(255,255,255,0.45)"/>
        <!-- ventana cabina -->
        <rect x="128" y="82" width="34" height="30" rx="4" fill="rgba(255,255,255,0.7)"/>
        <!-- franja roja -->
        <rect x="20" y="110" width="130" height="12" rx="0" fill="rgba(255,255,255,0.2)"/>
        <!-- cruz en lateral -->
        <rect x="55" y="96" width="8" height="24" rx="2" fill="rgba(192,57,43,0.7)"/>
        <rect x="47" y="104" width="24" height="8" rx="2" fill="rgba(192,57,43,0.7)"/>
        <!-- ruedas -->
        <circle cx="60" cy="158" r="20" fill="rgba(255,255,255,0.3)"/>
        <circle cx="60" cy="158" r="12" fill="rgba(255,255,255,0.5)"/>
        <circle cx="60" cy="158" r="5" fill="rgba(150,50,30,0.5)"/>
        <circle cx="148" cy="158" r="20" fill="rgba(255,255,255,0.3)"/>
        <circle cx="148" cy="158" r="12" fill="rgba(255,255,255,0.5)"/>
        <circle cx="148" cy="158" r="5" fill="rgba(150,50,30,0.5)"/>
        <!-- sirena / luces -->
        <rect x="122" y="68" width="18" height="10" rx="4" fill="rgba(255,80,80,0.8)"/>
        <rect x="143" y="68" width="18" height="10" rx="4" fill="rgba(80,80,255,0.6)"/>
        <!-- líneas de movimiento -->
        <line x1="8" y1="108" x2="18" y2="108" stroke="rgba(255,255,255,0.4)" stroke-width="4" stroke-linecap="round"/>
        <line x1="5" y1="118" x2="18" y2="118" stroke="rgba(255,255,255,0.3)" stroke-width="3" stroke-linecap="round"/>
        <line x1="8" y1="128" x2="18" y2="128" stroke="rgba(255,255,255,0.2)" stroke-width="3" stroke-linecap="round"/>
      </svg>`
    ),
    h('div',{class:'main-content'},[
      h('div',{class:'section-block',id:'sec-contactos'},[
        sectionTitle('📞 Números de emergencia','Todos gratuitos · 24 horas'),
        h('div',{class:'grid-4'},[
          contactoCard('911','Policía · Emergencias generales','24 hs'),
          contactoCard('107','SAME · Ambulancias CABA','24 hs · Gratuito'),
          contactoCard('100','Bomberos','Nacional · Gratuito'),
          contactoCard('103','Defensa Civil','Desastres · inundaciones'),
          contactoCard('144','Violencia de género','24 hs · Gratuito'),
          contactoCard('137','Violencia familiar','Asistencia inmediata'),
          contactoCard('135','Crisis emocional','24 hs · Gratuito'),
          contactoCard('102','Niñez y adolescencia','UNICEF/SENNAF'),
          contactoCard('145','Trata de personas','Denuncia anónima'),
          contactoCard('141','Drogas / SEDRONAR','Orientación y ayuda'),
          contactoCard('108','Situación de calle','GCBA'),
          contactoCard('0800-345-3365','Inundaciones CABA','Gratuito'),
        ]),
      ]),
      h('div',{class:'section-block',id:'sec-protocolos'},[
        sectionTitle('📋 Protocolos de actuación'),
        h('div',{class:'accordion'},[
          accItem('🚗 Accidente de tráfico','<p><strong>No moviente a los heridos</strong> a menos que haya peligro inmediato. Llamá al 107 y al 911. Señalizá el área. Prestá primeros auxilios básicos si sabés.</p>'),
          accItem('🔥 Incendio','<p>Llamá al 100 (bomberos). Evacuá por escaleras, nunca ascensor. Si hay humo, agachate. Si la ropa se prende, detente, tirarte al suelo y rodá.</p>'),
          accItem('🌊 Inundación','<p>No camines por agua en movimiento. 30 cm pueden tumbarte. Subí a zonas altas. Llamá al 103 (Defensa Civil) o al 0800-345-3365 en CABA.</p>'),
          accItem('⚡ Accidente eléctrico','<p>No toques a la persona sin cortar la corriente primero. Cortá el suministro desde la llave termomagnética. Llamá al 107. Iniciá RCP si es necesario.</p>'),
          accItem('💊 Intoxicación','<p>Llamá al Centro Antiponzoñoso: 4923-1051 (CABA) o al 107. No inducir vómito sin indicación médica. Llevar el envase del producto si es posible.</p>'),
        ]),
      ]),
      h('div',{class:'section-block'},[
        sectionTitle('🗺️ Recursos por región','CABA, GBA y resto del país'),
        h('div',{class:'region-grid'},[
          regionCard('CABA','SAME: 107 · Policía: 911 · Salud Mental: 135 · Defensa Civil: 103'),
          regionCard('Gran Buenos Aires','Emergencias: 911 · SAME GBA: 911 · Municipal: según municipio'),
          regionCard('Córdoba','Same: (351) 428-5000 · Emergencias: 911'),
          regionCard('Rosario','SIES: (0341) 480-4545 · Emergencias: 911'),
          regionCard('Mendoza','SAME: (0261) 428-0000 · Emergencias: 911'),
          regionCard('Resto del país','Llamá al 911 desde cualquier lugar de Argentina'),
        ]),
      ]),
    ]),
  ]);
}

/* ===================== VIEW: DONACIONES ===================== */
function viewDonaciones() {
  return h('div',{class:'view'},[
    catBanner('Donaciones','Donaciones de sangre, órganos y recursos materiales',
      '#0096c7, #2979d4, #023e8a',
      `<svg viewBox="0 0 200 200" width="180" height="180" xmlns="http://www.w3.org/2000/svg">
        <!-- Corazón con gota de sangre -->
        <path d="M100 160 C60 130 30 110 30 75 C30 52 50 40 70 40 C83 40 94 47 100 56 C106 47 117 40 130 40 C150 40 170 52 170 75 C170 110 140 130 100 160Z" fill="rgba(255,255,255,0.55)"/>
        <path d="M100 148 C70 124 46 107 46 78 C46 60 58 50 72 50 C82 50 91 56 96 63" fill="rgba(255,255,255,0.25)"/>
        <!-- gota de sangre sobre el corazón -->
        <path d="M100 30 C100 30 84 52 84 64 C84 73 91 80 100 80 C109 80 116 73 116 64 C116 52 100 30 100 30Z" fill="rgba(255,80,80,0.7)"/>
        <ellipse cx="93" cy="60" rx="4" ry="6" fill="rgba(255,255,255,0.4)" transform="rotate(-20 93 60)"/>
      </svg>`
    ),
    h('div',{class:'main-content'},[
      h('div',{class:'section-block'},[
        sectionTitle('🩸 Donación de sangre','Gratuita · Anónima · Voluntaria'),
        h('div',{class:'aviso aviso-info'},[h('span',{},'💡'),h('div',{},'Una donación de sangre puede salvar hasta 3 vidas. No tiene costo y dura menos de una hora.')]),
        h('div',{class:'grid-3'},[
          cardEl('ic-rojo','🩸','¿Cómo donar?','Podés donar en cualquier hospital público. Tenés que estar en buen estado de salud, pesar más de 50 kg y tener entre 18 y 65 años.',null),
          cardEl('ic-verde','📋','Requisitos','Identificación con foto. Ayuno de 4 hs para donación de plaquetas. No se puede donar si tomaste antibióticos o aspirina recientemente.',null),
          cardEl('ic-azul','📍','Dónde donar','Hospital Garrahan, Fernández, Rivadavia y cualquier hospital público de CABA y GBA. Sin turno previo.',null),
        ]),
        h('div',{class:'accordion',style:'margin-top:1rem;'},[
          accItem('💡 Mitos sobre la donación de sangre','<ul><li>❌ No engorda ni te debilita permanentemente.</li><li>❌ No es doloroso más allá del pinchazo.</li><li>✅ El cuerpo repone el volumen en 24 hs.</li><li>✅ Podés donar cada 2 meses si sos hombre, cada 3 si sos mujer.</li></ul>'),
        ]),
      ]),
      h('div',{class:'section-block'},[
        sectionTitle('🫀 Donación de órganos'),
        h('div',{class:'aviso aviso-success'},[h('span',{},'✅'),h('div',{},'En Argentina, la Ley Justina (27.447) establece que todas las personas mayores de 18 años son donantes de órganos, a menos que hayan expresado lo contrario en el INCUCAI.')]),
        h('div',{class:'grid-2'},[
          cardEl('ic-verde','🌐','INCUCAI','incucai.gov.ar · 0800-222-0101 · Para manifestar tu voluntad de NO donar o para consultar listas de espera.',null),
          cardEl('ic-azul','💙','Donar en vida','Es posible donar un riñón, parte del hígado o médula ósea en vida a familiares. Consultá con tu médico.',null),
        ]),
      ]),
      h('div',{class:'section-block'},[
        sectionTitle('🤝 Donación de recursos materiales'),
        h('div',{class:'grid-3'},[
          cardEl('ic-verde','👕','Ropa y alimentos','Organizaciones como Caritas, Cruz Roja y centros comunitarios aceptan donaciones en todo el país.',null),
          cardEl('ic-azul','💊','Medicamentos','No dones medicamentos sin fecha vigente o sin indicación. Consultá a tu médico o farmacéutico.',null),
          cardEl('ic-naranja','🐾','Para mascotas','Alimento, medicamentos y materiales para ONG de protección animal. Contactá a protectoras locales.',null),
        ]),
      ]),
    ]),
  ]);
}

/* ===================== VIEW: SOBRE ===================== */
function viewSobre() {
  const wrap = h('div',{class:'view'});
  const mc = h('div',{class:'main-content'});

  // Hero banner
  const hero = h('div',{style:'background:linear-gradient(135deg,#1a6b4a,#1a4b8c);color:white;padding:2.5rem 1.75rem;border-radius:16px;margin-bottom:2rem;text-align:center;'});
  hero.innerHTML = `
    <div style="font-size:3rem;margin-bottom:0.5rem;">🇦🇷</div>
    <h1 style="font-family:Georgia,serif;font-size:2.2rem;font-weight:700;margin:0 0 0.4rem;color:white;">Auxili<em style="color:#6fffc8;font-style:italic;">AR</em></h1>
    <p style="color:rgba(255,255,255,0.82);font-size:1rem;margin:0;">Recursos de salud gratuitos para todas las personas en Argentina</p>`;
  mc.appendChild(hero);

  mc.appendChild(h('div',{class:'aviso aviso-warn'},[
    h('span',{},'⚠️'),
    h('div',{},'AUXILIAR no sustituye la atención médica ni psicológica profesional. Ante una emergencia, llamá al 911 o al 107 (SAME).'),
  ]));

  // Info blocks
  const infoData = [
    {icon:'🎯', title:'¿Qué es AUXILIAR?',
     text:'AUXILIAR es una plataforma pensada para acompañar a personas que necesitan ayuda o desean ayudar, orientándolas paso a paso hacia recursos oficiales y gratuitos de salud, asistencia y orientación en Argentina. No reemplaza la atención profesional, pero ayuda a saber adónde ir y a quién llamar.'},
    {icon:'📍', title:'Cobertura geográfica',
     text:'AUXILIAR prioriza recursos de la Ciudad de Buenos Aires (CABA), e incluye información del GBA, la Provincia de Buenos Aires y recursos de alcance nacional. La plataforma está en expansión continua y aspira a cubrir todas las provincias.'},
    {icon:'📋', title:'Fuentes de información',
     text:'La información proviene de fuentes oficiales: Ministerio de Salud de la Nación, GCBA, INCUCAI, SEDRONAR, INADI y organismos del Estado Nacional y provincial. Recomendamos siempre verificar la vigencia antes de trasladarte o llamar.'},
    {icon:'🔒', title:'Privacidad y datos',
     text:'AUXILIAR no recopila datos personales ni utiliza cookies de seguimiento. El perfil de usuario opcional se guarda únicamente en tu dispositivo (localStorage) y nunca se transmite a ningún servidor.'},
    {icon:'🤝', title:'¿Cómo colaborar?',
     text:'AUXILIAR es un proyecto en desarrollo. Si sos profesional de la salud, pertenecés a una organización o querés colaborar actualizando información o sumándote como voluntario, podés hacerlo desde la sección "Sumate a Ayudar".'},
  ];

  const block = h('div',{class:'section-block'});
  infoData.forEach(item => {
    const d = h('div',{style:'display:flex;gap:1rem;align-items:flex-start;margin-bottom:1.5rem;'});
    const ico = h('div',{style:'font-size:1.8rem;flex-shrink:0;margin-top:2px;'},item.icon);
    const txt = h('div');
    txt.appendChild(h('h3',{style:'font-size:1rem;font-weight:700;margin:0 0 0.35rem;color:var(--color-text);'},item.title));
    txt.appendChild(h('p',{style:'font-size:0.88rem;color:var(--color-text-muted);line-height:1.65;margin:0;'},item.text));
    d.appendChild(ico); d.appendChild(txt);
    block.appendChild(d);
  });

  // Categorías rápidas
  block.appendChild(h('div',{class:'section-divider',style:'margin:1.5rem 0 1rem;'}));
  block.appendChild(h('h3',{style:'font-size:1rem;font-weight:700;margin-bottom:0.75rem;color:var(--color-text);'},'Categorías disponibles'));
  const cats = h('div',{style:'display:flex;flex-wrap:wrap;gap:0.5rem;margin-bottom:1.5rem;'});
  ['Salud Física','Salud Mental','ESI','Primeros Auxilios','Emergencias','Mascotas','Donaciones'].forEach(c => {
    const b = h('button',{style:'background:var(--verde-claro);color:var(--verde);border:1px solid var(--verde-medio);border-radius:20px;padding:5px 14px;font-size:0.8rem;font-weight:600;cursor:pointer;font-family:var(--font-body);transition:background 0.14s;',onmouseover:"this.style.background='var(--verde)';this.style.color='white'",onmouseout:"this.style.background='var(--verde-claro)';this.style.color='var(--verde)'",onclick:()=>navigate('/categorias')},c);
    cats.appendChild(b);
  });
  block.appendChild(cats);

  const btnWrap = h('div',{style:'display:flex;gap:0.75rem;flex-wrap:wrap;'});
  btnWrap.appendChild(h('button',{class:'btn btn--primary',onclick:()=>navigate('/')},'← Volver al inicio'));
  btnWrap.appendChild(h('button',{class:'btn btn--outline',onclick:()=>navigate('/sumate')},'🤝 Sumate a ayudar'));
  block.appendChild(btnWrap);

  mc.appendChild(block);
  wrap.appendChild(mc);
  return wrap;
}

/* ===================== HELPERS ===================== */
function catBanner(title, subtitle, bgColors, svgContent) {
  const stops = bgColors.split(',').map(s=>s.trim());
  const gradient = stops.length === 3
    ? `linear-gradient(135deg, ${stops[0]} 0%, ${stops[1]} 55%, ${stops[2]} 100%)`
    : `linear-gradient(135deg, ${stops[0]}, ${stops[1]})`;
  const wrap = h('div',{class:'cat-banner',style:`background: ${gradient};`});
  // background decorative circle
  const bg = h('div',{class:'cat-banner__bg'});
  bg.innerHTML = `<div style="width:320px;height:320px;border-radius:50%;background:rgba(255,255,255,0.07);position:absolute;right:-80px;top:-100px;"></div>`;
  wrap.appendChild(bg);
  const content = h('div',{class:'cat-banner__content'},[
    h('h1',{class:'cat-banner__title'},title),
    h('p',{class:'cat-banner__sub'},subtitle),
    h('button',{style:'margin-top:0.85rem;background:rgba(255,255,255,0.18);border:1.5px solid rgba(255,255,255,0.4);color:white;border-radius:8px;padding:6px 14px;font-size:0.82rem;font-weight:600;cursor:pointer;font-family:var(--font-body);',onclick:'navigate("/categorias")'},'← Todas las categorías'),
  ]);
  wrap.appendChild(content);
  const iconWrap = h('div',{class:'cat-banner__icon'});
  iconWrap.innerHTML = svgContent;
  wrap.appendChild(iconWrap);
  return wrap;
}

function flowHeader(backLabel, title, subtitle, onBack) {
  return h('div',{class:'flow-header'},[
    h('button',{class:'flow-back',onclick:onBack},backLabel),
    h('div',{},[
      h('div',{class:'flow-title'},title),
      subtitle ? h('div',{class:'flow-subtitle'},subtitle) : null,
    ]),
  ]);
}

function sectionTitle(title, sub) {
  const el = h('div',{});
  el.appendChild(h('div',{class:'section-divider'}));
  el.appendChild(h('h2',{class:'section-title'},title));
  if (sub) el.appendChild(h('p',{class:'section-sub'},sub));
  return el;
}
function mapaLink(label, url, desc) {
  const wrap = h('a',{
    href: url, target:'_blank', rel:'noopener',
    style:'display:flex;align-items:center;gap:0.75rem;background:var(--azul-claro);border:1.5px solid var(--celeste);border-radius:10px;padding:0.85rem 1rem;text-decoration:none;margin-bottom:0.6rem;transition:background 0.14s;',
    onmouseover:"this.style.background='var(--celeste)';this.querySelectorAll('*').forEach(el=>el.style.color='white')",
    onmouseout:"this.style.background='var(--azul-claro)';this.querySelectorAll('*').forEach(el=>el.style.color='')",
  });
  wrap.innerHTML = `<span style="font-size:1.5rem;flex-shrink:0;">🗺️</span><div><div style="font-weight:700;font-size:0.9rem;color:var(--azul);">${label}</div><div style="font-size:0.78rem;color:var(--gris);margin-top:2px;">${desc}</div></div><span style="margin-left:auto;font-size:0.8rem;color:var(--celeste);font-weight:600;">Abrir →</span>`;
  return wrap;
}
function calLink(label, url, desc) {
  const wrap = h('a',{
    href: url, target:'_blank', rel:'noopener',
    style:'display:flex;align-items:center;gap:0.75rem;background:var(--verde-claro);border:1.5px solid var(--verde-medio);border-radius:10px;padding:0.85rem 1rem;text-decoration:none;margin-bottom:0.6rem;transition:background 0.14s;',
    onmouseover:"this.style.background='var(--verde-medio)';this.querySelectorAll('*').forEach(el=>el.style.color='white')",
    onmouseout:"this.style.background='var(--verde-claro)';this.querySelectorAll('*').forEach(el=>el.style.color='')",
  });
  wrap.innerHTML = `<span style="font-size:1.5rem;flex-shrink:0;">📅</span><div><div style="font-weight:700;font-size:0.9rem;color:var(--verde);">${label}</div><div style="font-size:0.78rem;color:var(--gris);margin-top:2px;">${desc}</div></div><span style="margin-left:auto;font-size:0.8rem;color:var(--verde);font-weight:600;">Ver →</span>`;
  return wrap;
}

function cardEl(ic, icon, title, desc, link) {
  const c = h('div',{class:'card'});
  c.innerHTML = `<div class="card-icon ${ic}">${icon}</div><h3>${title}</h3><p>${desc}</p>${link?`<a href="${link}" target="_blank" rel="noopener">Ver más →</a>`:''}`;
  return c;
}
function hospCard(name, esp, addr, tel) {
  const id = 'hosp-' + name.replace(/[^a-zA-Z0-9]/g,'-').toLowerCase();
  const saved = isFav(id);
  const c = h('div',{class:'hosp-card',style:'position:relative;'});
  c.innerHTML = `
    <div style="display:flex;align-items:flex-start;justify-content:space-between;">
      <p class="hosp-esp">${esp}</p>
      <button class="fav-btn${saved?' saved':''}" data-fav-id="${id}"
        aria-label="${saved?'Quitar de':'Guardar en'} favoritos"
        onclick="toggleFav('${id}','${name}','${esp} · ${addr}','${tel}')"
        style="margin-top:-2px;">${saved?'★':'☆'}</button>
    </div>
    <h4>${name}</h4><p>${addr}</p>
    <span style="font-size:0.78rem;color:var(--verde);font-weight:700;">${tel}</span>`;
  return c;
}
function contactoCard(num, label, desc) {
  const telNum = num.replace(/[^0-9+]/g,'');
  const id = 'tel-' + telNum;
  const c = h('div',{class:'contacto-card'});
  const saved = isFav(id);
  c.innerHTML = `
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:4px;">
      <a href="tel:${telNum}" class="cnum" aria-label="Llamar al ${num}">${num}</a>
      <button class="fav-btn${saved?' saved':''}" data-fav-id="${id}"
        aria-label="${saved?'Quitar de':'Guardar en'} favoritos"
        title="${saved?'Quitar de':'Guardar en'} favoritos"
        onclick="toggleFav('${id}','${label}','${desc}','${telNum}')"
        >${saved?'★':'☆'}</button>
    </div>
    <h4>${label}</h4>
    <p>${desc}</p>
    <a href="tel:${telNum}" class="contacto-call-btn">📞 Llamar ahora</a>`;
  return c;
}
function regionCard(region, info) {
  return h('div',{class:'region-card'},[h('h4',{},region),h('p',{},info)]);
}
function paStep(num, title, desc) {
  return h('div',{class:'pa-step'},[
    h('div',{class:'pa-num'},String(num)),
    h('div',{},[h('h4',{},title),h('p',{},desc)]),
  ]);
}
function accItem(title, htmlContent) {
  const item = h('div',{class:'acc-item'});
  const btn = h('button',{class:'acc-btn',onclick:'toggleAcc(this)'},[
    h('span',{},title),
    h('span',{class:'arrow'},'▾'),
  ]);
  const content = h('div',{class:'acc-content'});
  content.innerHTML = htmlContent;
  item.appendChild(btn);
  item.appendChild(content);
  return item;
}
function th(text) { return h('th',{},text); }
function vacRow(vacuna, para, donde, gratuita) {
  return h('tr',[
    h('td',{},vacuna),
    h('td',{},para),
    h('td',{},donde),
    h('td',{},[h('span',{class:gratuita?'badge badge-verde':'badge badge-naranja'},gratuita?'Gratuita':'Costo')]),
  ]);
}
function tabBtn(label, targetId, groupId, active) {
  return h('button',{class:'tab-btn'+(active?' active':''),onclick:`switchTab('${targetId}','${groupId}',this)`},label);
}
function makeOptionBtn(icon, title, desc, cb) {
  const btn = h('button',{class:'option-btn',onclick:cb});
  btn.innerHTML = `<span class="option-icon">${icon}</span><div><div style="font-weight:700;">${title}</div><div style="font-size:0.78rem;color:var(--color-text-muted);font-weight:400;">${desc}</div></div>`;
  return btn;
}

/* ===================== SEARCH ===================== */
const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');
if (searchInput) {
  searchInput.addEventListener('input', function() {
    const q = this.value.toLowerCase().trim();
    if (q.length < 2) { searchResults.classList.remove('open'); return; }
    const res = searchIndex.filter(i => i.t.toLowerCase().includes(q)).slice(0,8);
    if (!res.length) { searchResults.classList.remove('open'); return; }
    searchResults.innerHTML = res.map(r =>
      `<div class="sr-item" role="option" tabindex="0" onclick="irA('${r.s}')" onkeydown="if(event.key==='Enter')irA('${r.s}')"><span class="sr-tag">${r.tag}</span>${r.t.split('·')[0].trim()}</div>`
    ).join('');
    searchResults.classList.add('open');
  });
  document.addEventListener('click', e => {
    if (!e.target.closest('.search-wrap')) searchResults.classList.remove('open');
  });
}
const SEARCH_ROUTE_MAP = {
  'contactos': '/categorias/emergencias',
  'primeros-auxilios': '/categorias/primeros-auxilios',
  'hospitales': '/categorias/salud-fisica',
  'vacunas': '/categorias/salud-fisica',
  'programas': '/categorias/salud-fisica',
  'salud-mental': '/categorias/salud-mental',
  'ongs': '/categorias/emergencias',
  'mascotas': '/categorias/mascotas',
  'derechos': '/categorias/salud-fisica',
  'esi': '/categorias/esi',
};
function irA(sec) {
  searchResults.classList.remove('open');
  if (searchInput) searchInput.value = '';
  const route = SEARCH_ROUTE_MAP[sec] || '/categorias';
  const currentPath = window.location.hash.replace(/^#/,'') || '/';
  // If already on the right category, just scroll
  if (currentPath === route) {
    const el = document.getElementById('sec-'+sec);
    if (el) { el.scrollIntoView({behavior:'smooth'}); return; }
  }
  // Navigate to the route, then scroll after render
  navigate(route + '/' + sec);
}

/* ===================== THEME ===================== */
let currentTheme = getPrefs('theme','light');
function applyTheme(theme) {
  if (theme === 'dark') document.documentElement.setAttribute('data-theme','dark');
  else document.documentElement.removeAttribute('data-theme');
  const btn = document.getElementById('theme-toggle');
  if (btn) {
    btn.setAttribute('aria-pressed', String(theme==='dark'));
    btn.setAttribute('aria-label', theme==='dark'?'Modo claro':'Modo oscuro');
    const sun = btn.querySelector('.icon-sun');
    const moon = btn.querySelector('.icon-moon');
    if (sun) sun.hidden = (theme==='dark');
    if (moon) moon.hidden = (theme!=='dark');
  }
}
function toggleTheme() {
  currentTheme = currentTheme==='dark'?'light':'dark';
  applyTheme(currentTheme);
  savePrefs('theme',currentTheme);
}

/* ===================== READ MODE / TEXT SIZE ===================== */
// Text size controlled by ts-btn (A / A / A buttons in a11y-bar)
let currentReadMode = getPrefs('readmode','normal');
function applyReadMode(mode) {
  if (mode==='simple') document.documentElement.setAttribute('data-readmode','simple');
  else document.documentElement.removeAttribute('data-readmode');
  // sync active state on ts-btn if any correspond
}
function toggleReadMode() {
  currentReadMode = currentReadMode==='simple'?'normal':'simple';
  applyReadMode(currentReadMode);
  savePrefs('readmode',currentReadMode);
}

/* ===================== CONTRAST ===================== */
let highContrast = getPrefs('contrast',false);
function applyContrast(hc) {
  document.body.classList.toggle('high-contrast',hc);
  const btn = document.getElementById('contrastBtn');
  if (btn) { btn.setAttribute('aria-pressed',hc); btn.classList.toggle('active',hc); }
}
function toggleContrast() {
  highContrast = !highContrast;
  applyContrast(highContrast);
  savePrefs('contrast',highContrast);
}

/* ===================== TEXT SIZE ===================== */
let textScale = getPrefs('textscale',1);
function setTextSize(scale) {
  textScale = scale;
  document.documentElement.style.setProperty('--text-scale',scale);
  document.querySelectorAll('.ts-btn').forEach(b => b.classList.remove('active'));
  const idx = [1,1.15,1.3].indexOf(scale);
  const btns = document.querySelectorAll('.ts-btn');
  if (btns[idx]) btns[idx].classList.add('active');
  savePrefs('textscale',scale);
}

/* ===================== ACCORDION ===================== */
function toggleAcc(btn) {
  const content = btn.nextElementSibling;
  const isOpen = btn.classList.contains('open');
  const container = btn.closest('.pa-category') || btn.closest('.accordion');
  if (container) {
    container.querySelectorAll('.acc-btn.open').forEach(b => {
      b.classList.remove('open');
      if (b.nextElementSibling) b.nextElementSibling.classList.remove('open');
    });
  }
  if (!isOpen) { btn.classList.add('open'); content.classList.add('open'); }
}

/* ===================== TABS ===================== */
function switchTab(targetId, groupId, clickedBtn) {
  const parent = clickedBtn.closest('.section-block') || document;
  parent.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  parent.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  clickedBtn.classList.add('active');
  const panel = document.getElementById(targetId);
  if (panel) panel.classList.add('active');
}

/* ===================== HAMBURGER ===================== */
document.getElementById('hamburger')?.addEventListener('click', function() {
  const nl = document.getElementById('navLinks');
  const open = nl.classList.toggle('open');
  this.setAttribute('aria-expanded', open);
});


/* ===================== USER PROFILE ===================== */
function getCurrentUser() { return getPrefs('user', null); }
function saveUser(user) { savePrefs('user', user); }
function clearUser() { try { localStorage.removeItem('aux_user'); } catch(e){} }

function openProfile() {
  const overlay = document.getElementById('profileOverlay');
  overlay.classList.add('open');
  renderProfileModal();
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.remove('open'); }, {once:true});
}

function renderProfileModal() {
  const container = document.getElementById('profileModalContent');
  const user = getCurrentUser();
  if (user) {
    container.innerHTML = `
      <h3>👤 Hola, ${user.nombre}!</h3>
      <p class="modal-sub">Tus datos guardados en este dispositivo.</p>
      <div class="profile-welcome">✅ Perfil activo · ${user.provincia || 'Argentina'}</div>
      <div class="form-field"><label>Nombre</label><input type="text" id="pf-nombre" value="${user.nombre||''}" placeholder="Tu nombre"></div>
      <div class="form-field"><label>Apellido</label><input type="text" id="pf-apellido" value="${user.apellido||''}" placeholder="Tu apellido"></div>
      <div class="form-grid-2">
        <div class="form-field"><label>Provincia</label><input type="text" id="pf-provincia" value="${user.provincia||''}" placeholder="Ej: CABA"></div>
        <div class="form-field"><label>Localidad</label><input type="text" id="pf-localidad" value="${user.localidad||''}" placeholder="Tu ciudad"></div>
      </div>
      <div class="form-field"><label>Teléfono (opcional)</label><input type="tel" id="pf-telefono" value="${user.telefono||''}" placeholder="+54 11 ..."></div>
      <div class="profile-actions">
        <button class="btn-modal-logout" onclick="logoutUser()">🚪 Salir</button>
        <button class="btn-modal-cancel" onclick="document.getElementById('profileOverlay').classList.remove('open')">Cancelar</button>
        <button class="btn-modal-save" onclick="updateUser()">Guardar</button>
      </div>`;
  } else {
    container.innerHTML = `
      <h3>Crear perfil</h3>
      <p class="modal-sub">Tus datos se guardan solo en este dispositivo. No se envían a ningún servidor.</p>
      <div class="form-field"><label>Nombre *</label><input type="text" id="pf-nombre" placeholder="Tu nombre"></div>
      <div class="form-field"><label>Apellido</label><input type="text" id="pf-apellido" placeholder="Tu apellido"></div>
      <div class="form-grid-2">
        <div class="form-field"><label>Provincia</label><input type="text" id="pf-provincia" placeholder="Ej: CABA"></div>
        <div class="form-field"><label>Localidad</label><input type="text" id="pf-localidad" placeholder="Tu ciudad"></div>
      </div>
      <div class="form-field"><label>Teléfono (opcional)</label><input type="tel" id="pf-telefono" placeholder="+54 11 ..."></div>
      <div class="profile-actions">
        <button class="btn-modal-cancel" onclick="document.getElementById('profileOverlay').classList.remove('open')">Cancelar</button>
        <button class="btn-modal-save" onclick="registerUser()">Guardar perfil</button>
      </div>`;
  }
}

function registerUser() {
  const nombre = document.getElementById('pf-nombre')?.value.trim();
  if (!nombre) { alert('Por favor ingresá tu nombre.'); return; }
  const user = {
    nombre, 
    apellido: document.getElementById('pf-apellido')?.value.trim(),
    provincia: document.getElementById('pf-provincia')?.value.trim(),
    localidad: document.getElementById('pf-localidad')?.value.trim(),
    telefono: document.getElementById('pf-telefono')?.value.trim(),
    createdAt: new Date().toISOString(),
  };
  saveUser(user);
  updateProfileFab();
  document.getElementById('profileOverlay').classList.remove('open');
}

function updateUser() {
  const nombre = document.getElementById('pf-nombre')?.value.trim();
  if (!nombre) { alert('Por favor ingresá tu nombre.'); return; }
  const existing = getCurrentUser() || {};
  const user = {
    ...existing,
    nombre,
    apellido: document.getElementById('pf-apellido')?.value.trim(),
    provincia: document.getElementById('pf-provincia')?.value.trim(),
    localidad: document.getElementById('pf-localidad')?.value.trim(),
    telefono: document.getElementById('pf-telefono')?.value.trim(),
    updatedAt: new Date().toISOString(),
  };
  saveUser(user);
  updateProfileFab();
  document.getElementById('profileOverlay').classList.remove('open');
}

function logoutUser() {
  if (confirm('¿Querés borrar tu perfil de este dispositivo?')) {
    clearUser();
    updateProfileFab();
    document.getElementById('profileOverlay').classList.remove('open');
  }
}

function updateProfileFab() {
  const user = getCurrentUser();
  const lbl = document.getElementById('profileBtnLabel');
  const btn = document.getElementById('profileBtnA11y');
  if (lbl) lbl.textContent = user ? user.nombre : 'Mi perfil';
  if (btn) btn.classList.toggle('logged-in', !!user);
}

function toggleA11yPanel() {
  const panel = document.getElementById('a11yPanel');
  const toggle = document.getElementById('a11yToggle');
  if (!panel || !toggle) return;
  const isOpen = !panel.classList.contains('collapsed');
  panel.classList.toggle('collapsed', isOpen);
  toggle.classList.toggle('open', !isOpen);
  toggle.setAttribute('aria-expanded', String(!isOpen));
  // Persist state
  savePrefs('a11yOpen', !isOpen);
}


/* ===================== FAVORITOS ===================== */
function getFavs() { return getPrefs('favs', []); }
function saveFavs(favs) { savePrefs('favs', favs); }

function toggleFav(id, title, subtitle, tel) {
  let favs = getFavs();
  const idx = favs.findIndex(f => f.id === id);
  let saved;
  if (idx >= 0) {
    favs.splice(idx, 1);
    saved = false;
  } else {
    favs.unshift({ id, title, subtitle: subtitle||'', tel: tel||'' });
    saved = true;
  }
  saveFavs(favs);
  // Update all buttons with this id
  document.querySelectorAll(`.fav-btn[data-fav-id="${id}"]`).forEach(btn => {
    btn.textContent = saved ? '★' : '☆';
    btn.classList.toggle('saved', saved);
    btn.setAttribute('aria-label', saved ? 'Quitar de favoritos' : 'Guardar en favoritos');
  });
  showFavToast(saved ? '★ Guardado en favoritos' : 'Eliminado de favoritos');
}

function isFav(id) { return getFavs().some(f => f.id === id); }

function showFavToast(msg) {
  const t = document.getElementById('favToast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 2200);
}

function makeFavBtn(id, title, subtitle, tel) {
  const saved = isFav(id);
  const btn = h('button', {
    class: 'fav-btn' + (saved ? ' saved' : ''),
    'data-fav-id': id,
    'aria-label': saved ? 'Quitar de favoritos' : 'Guardar en favoritos',
    title: saved ? 'Quitar de favoritos' : 'Guardar en favoritos',
    onclick: () => toggleFav(id, title, subtitle, tel),
  }, saved ? '★' : '☆');
  return btn;
}

function viewFavoritos() {
  const favs = getFavs();
  const list = h('div', {});
  if (!favs.length) {
    list.appendChild(h('div', {class:'fav-empty'}, [
      h('span', {class:'fav-empty-icon'}, '☆'),
      h('p', {style:'font-weight:700;margin-bottom:0.3rem;'}, 'No tenés favoritos guardados'),
      h('p', {style:'font-size:0.84rem;'}, 'Usá el ★ en cualquier número o recurso para guardarlo acá.'),
    ]));
  } else {
    favs.forEach(fav => {
      const item = h('div', {class:'fav-item'});
      const info = h('div', {class:'fav-item-info'}, [
        h('div', {class:'fav-item-title'}, fav.title),
        fav.subtitle ? h('div', {class:'fav-item-sub'}, fav.subtitle) : null,
      ]);
      const actions = h('div', {class:'fav-item-actions'});
      if (fav.tel) {
        const callBtn = h('a', {
          href: 'tel:' + fav.tel.replace(/[^0-9+]/g,''),
          class: 'fav-call-btn',
        }, '📞 Llamar');
        actions.appendChild(callBtn);
      }
      const removeBtn = h('button', {
        class: 'fav-remove-btn',
        onclick: () => { toggleFav(fav.id, fav.title, fav.subtitle, fav.tel); renderRoute(); }
      }, '✕');
      actions.appendChild(removeBtn);
      item.appendChild(info);
      item.appendChild(actions);
      list.appendChild(item);
    });
  }

  return h('div', {class:'view'}, [
    h('div', {class:'main-content'}, [
      h('div', {class:'section-block'}, [
        h('div', {class:'section-divider'}),
        h('h2', {class:'section-title'}, '★ Mis favoritos'),
        h('p', {class:'section-sub'}, favs.length
          ? `${favs.length} recurso${favs.length>1?'s':''} guardado${favs.length>1?'s':''} en este dispositivo`
          : 'Guardá números y recursos para acceder rápido'),
        list,
      ]),
    ]),
  ]);
}

/* ===================== INIT ===================== */
// Apply data-theme to <html> immediately (before render) so CSS vars work
if (currentTheme === 'dark') document.documentElement.setAttribute('data-theme','dark');
if (highContrast) document.body.classList.add('high-contrast');
if (currentReadMode === 'simple') document.documentElement.setAttribute('data-readmode','simple');
document.documentElement.style.setProperty('--text-scale', textScale);

window.addEventListener('hashchange', renderRoute);
renderRoute();

// Now update button states (buttons exist after renderRoute)
applyTheme(currentTheme);
applyReadMode(currentReadMode);
applyContrast(highContrast);
updateProfileFab();
// Restore a11y panel state (default: closed)
(function() {
  const wasOpen = getPrefs('a11yOpen', false);
  if (wasOpen) {
    const panel = document.getElementById('a11yPanel');
    const toggle = document.getElementById('a11yToggle');
    if (panel) panel.classList.remove('collapsed');
    if (toggle) { toggle.classList.add('open'); toggle.setAttribute('aria-expanded','true'); }
  }
})();
