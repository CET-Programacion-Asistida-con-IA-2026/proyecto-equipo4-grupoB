[README_1.md](https://github.com/user-attachments/files/29005001/README_1.md)
# AUXILIAR

Plataforma web que acompaña a las personas, paso a paso, para que encuentren rápidamente recursos de salud, asistencia y orientación en Argentina — o para que puedan sumarse como voluntarios/as y ayudar a otros.

## Problema

Falta de acceso a información sanitaria y de salud mental en los sectores más vulnerables. Muchas personas no cuentan con obra social, y si quieren acceder a ella, el costo puede ser elevado. Encontrar un recurso público adecuado (un hospital, una línea de ayuda, un centro de salud) suele ser complicado justo en el momento en que más se necesita.

## Solución

Un sitio web responsive donde las personas puedan encontrar fácilmente la ayuda o el asesoramiento que necesitan: salud mental, ESI, atención veterinaria, emergencias, primeros auxilios, entre otros. En lugar de mostrar toda la información de golpe, AUXILIAR guía al usuario con preguntas simples hasta llevarlo al recurso correcto. También, incluirá un formulario de inscripción apto para cualquier profesional graduado, o en camino a graduarse, de los ámbitos de salud física, mental y veterinaria, que deseen ofrecer su acompañamiento, servicio y asesoramiento de manera voluntaria y gratuita.

## Público objetivo

- Adolescentes
- Adultez temprana
- Tercera edad

La navegación está pensada para ser simple incluso en momentos de estrés, ansiedad o urgencia, o para personas con poca experiencia tecnológica.

## Funcionalidades clave

- Portal de inscripción para profesionales y voluntarios.
- Mapa de hospitales públicos y de guardias gratuitas.
- Espacio para donaciones, con información de transparencia.
- Flujo guiado de preguntas ("¿es para vos o para otra persona?", "¿cómo te sentís hoy?") que deriva automáticamente al recurso adecuado.
- Categorías de acceso directo: Salud Física, Salud Mental, ESI, Mascotas, Primeros Auxilios, Emergencias, Centros de Atención y Donaciones.
- Modo claro/oscuro y modo de lectura simple (texto más grande), con persistencia de preferencias.
- Botón de acceso rápido a emergencias visible en toda la plataforma.

## Alcance geográfico

Información enfocada en Argentina, priorizando la Ciudad Autónoma de Buenos Aires (CABA) y recursos públicos, gratuitos y oficiales (hospitales, programas estatales, líneas de asistencia del Gobierno Nacional y del Gobierno de la Ciudad). La plataforma está preparada para incorporar otras provincias a futuro.

## Tecnologías utilizadas

Este proyecto está desarrollado únicamente con tecnologías web nativas, sin frameworks ni librerías externas:

- **HTML5** — estructura semántica y accesible.
- **CSS3** — estilos, diseño responsive (mobile first), temas claro/oscuro mediante variables CSS.
- **JavaScript (Vanilla)** — lógica de la aplicación, enrutamiento (SPA con hash routing), renderizado dinámico de contenido y manejo de formularios. Sin frameworks (sin React, Vue, jQuery, etc.).

El código está organizado de forma modular (un archivo por componente o módulo funcional) para facilitar el mantenimiento y la escalabilidad a futuras funcionalidades.

## Estructura del proyecto

```
auxiliar/
├── index.html
├── assets/              → imágenes e íconos
├── css/
│   ├── variables.css    → colores, tipografías y temas
│   ├── base.css         → reset y accesibilidad
│   ├── layout.css       → header, grillas, footer
│   ├── components.css   → botones, tarjetas, formularios
│   └── pages/           → estilos específicos por pantalla
└── js/
    ├── main.js          → punto de entrada de la app
    ├── router.js        → enrutamiento (SPA)
    ├── theme.js         → modo claro/oscuro y modo lectura
    ├── data/             → recursos oficiales, preguntas guiadas, hospitales
    ├── views/            → pantallas (inicio, flujo guiado, formulario)
    ├── modules/           → categorías (salud mental, ESI, mascotas, etc.)
    ├── components/        → piezas reutilizables (tarjetas, banners, validador)
    └── utils/             → funciones auxiliares (DOM, accesibilidad)
```

## Objetivo de Desarrollo Sostenible (ODS)

Este proyecto toma como motivación principal el **ODS 3 — Salud y Bienestar**, de la Agenda 2030 de Naciones Unidas, que busca garantizar una vida sana y promover el bienestar para todas las personas. AUXILIAR contribuye a este objetivo facilitando el acceso a información sanitaria, de salud mental y de primeros auxilios, especialmente para quienes no cuentan con cobertura médica privada.

De forma secundaria, el proyecto también se vincula con el **ODS 10 — Reducción de las desigualdades**, ya que busca achicar la brecha de acceso a la salud para los sectores más vulnerables, priorizando siempre recursos públicos y gratuitos por sobre los privados.
