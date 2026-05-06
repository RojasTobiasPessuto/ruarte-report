'use client';

import React, { useEffect, useRef, useMemo, Suspense } from 'react';
import './styles.css';
import { useSearchParams } from 'next/navigation';

const LOGO_URL = 'https://assets.cdn.filesafe.space/52BA1ANBkC1zh16RV6WV/media/69e2c5cdaa2fdcccf64c3d65.png';
const BASE_CALENDLY_LINK = 'https://ruartereports.org/calendario-3986';

const TESTIMONIALS = [
  {
    video: 'https://assets.cdn.filesafe.space/KtUHW6Xfym4HTBF8Ujq8/media/69d6812e3d9f7a33e41ce234.mp4',
    quote: 'Opero en mercados hace años pero con la metodología de Ruarte entendí los ciclos de una manera completamente diferente. Hoy tengo <strong>un sistema claro para anticipar movimientos</strong> y posicionar a mis clientes.',
    name: 'Corredor de Bolsa',
    role: 'ALYC (broker) en Argentina',
    initials: 'CB',
  },
  {
    video: 'https://assets.cdn.filesafe.space/KtUHW6Xfym4HTBF8Ujq8/media/69d680a43d829c73b2df3f99.mp4',
    quote: 'Como economista enseñaba teoría, pero Ruarte me mostró cómo leer los mercados en tiempo real. <strong>El análisis de ciclos y Elliott Waves cambió completamente mi perspectiva</strong> tanto personal como profesional.',
    name: 'Docente Universitario y Economista',
    role: 'Profesional independiente',
    initials: 'DE',
    delay: 'd1',
  },
  {
    video: 'https://assets.cdn.filesafe.space/KtUHW6Xfym4HTBF8Ujq8/media/69d57a533d829c73b2b7aa70.mp4',
    quote: 'Como contador y gerente agropecuario entendía los números, pero no el timing del mercado. Con Ruarte Reports <strong>pude estructurar el portafolio de mi empresa</strong> ante la rotación de ciclos.',
    name: 'Juan P.',
    role: 'Gerente agropecuario y contador público',
    initials: 'JP',
  },
  {
    video: 'https://assets.cdn.filesafe.space/KtUHW6Xfym4HTBF8Ujq8/media/69d57185cc3e8e01b2b5ce0b.mp4',
    quote: 'En la industria petrolera manejamos capitales importantes. Roberto nos ayudó a entender <strong>cómo proteger el patrimonio frente a ciclos de dólar débil</strong> y reposicionarnos a tiempo.',
    name: 'Andrés V.',
    role: 'Industria petrolera',
    initials: 'AV',
    delay: 'd1',
  },
  {
    video: 'https://assets.cdn.filesafe.space/KtUHW6Xfym4HTBF8Ujq8/media/69d57c15ad0e3e3270605fdc.mp4',
    quote: 'Importamos artículos de iluminación y estamos constantemente expuestos al dólar. Gracias al análisis de ciclos de Ruarte <strong>pudimos anticipar movimientos cambiarios</strong> y proteger nuestra operación.',
    name: 'Ricardo L.',
    role: 'Empresa importadora de artículos de iluminación',
    initials: 'RL',
  },
  {
    video: 'https://assets.cdn.filesafe.space/KtUHW6Xfym4HTBF8Ujq8/media/69d57b44ad0e3e3270602af2.mp4',
    quote: 'La metodología de Ruarte me dio el <strong>criterio que me faltaba</strong> para saber cuándo entrar y cuándo esperar. Dejé de operar por intuición y empecé a estructurar mis decisiones con análisis real.',
    name: 'Mauricio C.',
    role: 'Comercio minorista y mayorista de Commodities',
    initials: 'MC',
    delay: 'd1',
  },
];

const TRACK_RECORDS = [
  { year: '1989 — Techo del Nikkei (Japón)', text: 'Predijimos el colapso del mercado japonés mediante Elliott Waves. <strong>El Nikkei tardaría décadas en recuperarse.</strong>' },
  { year: '1994–95 — Crisis del Tequila', text: 'Marcamos el fin de la fase correctiva en LATAM y el punto de reposicionamiento para inversores regionales.' },
  { year: '2000 — Burbuja Punto Com', text: 'Alertamos el techo del Nasdaq meses antes del colapso. <strong>El índice cayó más del 75% en los siguientes dos años.</strong>' },
  { year: '2001 — Crisis Argentina', text: 'Anunciamos en vivo en Crónica TV el <strong>piso del mercado</strong> cuando todos hablaban de colapso total.' },
  { year: '2008 — Crisis Subprime', text: 'Publicamos la alerta antes del colapso de Lehman Brothers. Nuestros clientes estaban posicionados en consecuencia.' },
  { year: '2009 — Fondo de Wall Street', text: 'Publicamos en Ámbito Financiero que <strong>Wall Street tocó piso</strong> en pleno pánico post-Lehman.' },
  { year: '2011 — Techo del Oro', text: 'Detectamos la quinta onda terminal en el oro. <strong>El metal cayó más del 40% en los años siguientes.</strong>' },
  { year: '2020 — Ciclo Alcista Commodities', text: 'Identificamos el inicio del ciclo alcista en commodities. Co-fundamos un fondo con resultado de <strong>+600% de rendimiento</strong>.' },
  { year: '2022 — Mercado Bajista', text: 'Anticipamos el mercado bajista en acciones tecnológicas. El Nasdaq llegó a caer <strong>más del 33% ese año.</strong>' },
];

const LOGOS = [
  { src: 'https://storage.googleapis.com/msgsndr/KtUHW6Xfym4HTBF8Ujq8/media/691e7dde59e47b677e5eaaf7.png', alt: 'Tecnológico de Monterrey' },
  { src: 'https://storage.googleapis.com/msgsndr/KtUHW6Xfym4HTBF8Ujq8/media/691e7dde59e47b12a75eaaf8.png', alt: 'Ámbito' },
  { src: 'https://storage.googleapis.com/msgsndr/KtUHW6Xfym4HTBF8Ujq8/media/691e7dde59e47b83fd5eaaf6.png', alt: 'Santander' },
  { src: 'https://storage.googleapis.com/msgsndr/KtUHW6Xfym4HTBF8Ujq8/media/691e7ddf88e1e61e82a0b5d4.png', alt: 'Banco Hipotecario' },
  { src: 'https://storage.googleapis.com/msgsndr/KtUHW6Xfym4HTBF8Ujq8/media/691e7dde5e13ec4738182031.png', alt: 'Banco Patagonia' },
  { src: 'https://storage.googleapis.com/msgsndr/KtUHW6Xfym4HTBF8Ujq8/media/69125919b0326a9a7a5bbe29.png', alt: '' },
  { src: 'https://storage.googleapis.com/msgsndr/KtUHW6Xfym4HTBF8Ujq8/media/6912591940d0247fbff1e23c.png', alt: '' },
  { src: 'https://storage.googleapis.com/msgsndr/KtUHW6Xfym4HTBF8Ujq8/media/6912591940d0246c7af1e23b.png', alt: '' },
  { src: 'https://storage.googleapis.com/msgsndr/KtUHW6Xfym4HTBF8Ujq8/media/691e7dde8273687f9dd740b5.webp', alt: '' },
];

const FAQ_ITEMS = [
  { q: '¿Con quiénes han trabajado?', a: 'Durante los últimos 40 años hemos capacitado a más de 20.000 personas en análisis técnico, macroeconomía, trading e inversiones. Hemos asesorado instituciones financieras, empresas públicas y privadas, y universidades en Argentina, México, Perú, Colombia y Estados Unidos.' },
  { q: '¿A quién está dirigida la consultoría?', a: 'A traders, inversores o empresarios con capital y experiencia que buscan resultados estables, o que desean estructurar su operativa con mentalidad profesional. No es un curso para principiantes absolutos — trabajamos con personas que ya tienen skin in the game.' },
  { q: '¿Necesito experiencia previa en mercados?', a: 'No necesariamente. El programa ofrece diferentes niveles: desde la profesionalización de operadores experimentados hasta la construcción de bases sólidas para quienes recién se inician con capital real. La primera sesión es para entender tu situación y definir el punto de partida.' },
  { q: '¿En qué consiste la consultoría?', a: 'Acompañamiento personalizado en tres áreas: <strong>estrategia</strong> (lectura de ciclos, timing de entrada/salida, selección de activos), <strong>gestión</strong> (capital, riesgo y métricas) y <strong>mentalidad</strong> (emociones, disciplina y toma de decisiones bajo presión). Todo basado en un sistema de 40 años con track record real.' },
];

function toggleVideo(container: HTMLDivElement) {
  const video = container.querySelector('video');
  const overlay = container.querySelector('.play-overlay') as HTMLElement;
  if (!video || !overlay) return;
  if (video.paused) {
    document.querySelectorAll('.testimonial-video video').forEach(v => {
      (v as HTMLVideoElement).pause();
      const o = v.parentElement?.querySelector('.play-overlay') as HTMLElement;
      if (o) o.style.opacity = '1';
    });
    video.play();
    overlay.style.opacity = '0';
  } else {
    video.pause();
    overlay.style.opacity = '1';
  }
}

function EmpiezaAquiContent() {
  const trackRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();

  const calendlyLink = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    const queryString = params.toString();
    return queryString ? `${BASE_CALENDLY_LINK}?${queryString}` : BASE_CALENDLY_LINK;
  }, [searchParams]);

  useEffect(() => {
    // Scroll animations
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); obs.unobserve(e.target); } });
    }, { threshold: 0.12 });
    document.querySelectorAll('.fade').forEach(el => obs.observe(el));

    // Sticky bar
    const sticky = document.getElementById('sticky');
    const onScroll = () => sticky?.classList.toggle('on', window.scrollY > 500);
    window.addEventListener('scroll', onScroll);

    // Track record carousel — duplicate for infinite loop
    if (trackRef.current) {
      const originals = Array.from(trackRef.current.children);
      originals.forEach(card => trackRef.current!.appendChild(card.cloneNode(true)));
    }

    // FAQ accordion
    const faqElements = document.querySelectorAll('.faq-q');
    const faqHandlers = Array.from(faqElements).map(q => {
      const handler = () => {
        const item = q.closest('.faq-item');
        const isOpen = item?.classList.contains('open');
        document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
        if (!isOpen) item?.classList.add('open');
      };
      q.addEventListener('click', handler);
      return { q, handler };
    });

    return () => {
      window.removeEventListener('scroll', onScroll);
      faqHandlers.forEach(({ q, handler }) => q.removeEventListener('click', handler));
    };
  }, []);

  return (
    <>
      {/* HEADER */}
      <header className="header" data-block="header" style={{ textAlign: 'center' }}>
        <img src={LOGO_URL} alt="Ruarte Reports" className="logo-img" style={{ display: 'inline-block' }} />
      </header>

      {/* HERO */}
      <section className="hero" data-block="hero">
        <div className="container">
          <div className="hero-tag fade in">
            <div className="hero-tag-dot"></div>
            Solo para Empresarios / Profesionales / Emprendedores
          </div>

          <h1 className="fade in d1">
            <span id="hero-line1" style={{ fontSize: '29px' }}>
              <span className="hero-frase-1"><span style={{ color: 'rgb(183,150,88)' }}>Arma tu portafolio</span> en menos de <span style={{ color: 'rgb(187,152,92)' }}>7 dias</span></span>
              <span className="hero-frase-2"> aprovechando las siguientes oportunidades historicas</span>
            </span>
          </h1>

          <p className="fade in d2" id="hero-sub">
            <span className="sub-l1">Aplicaras el sistema que utilizamos</span>
            <span className="sub-l2">con instituciones y fondos de inversion,</span>
            <span className="sub-l3">con tan solo <b><span style={{ color: 'rgb(255,255,255)' }}>30 minutos de tu tiempo a la semana</span></b></span>
          </p>
        </div>
      </section>

      {/* VSL */}
      <section data-block="vsl" style={{ background: 'var(--bg)', padding: '0 0 20px' }}>
        <div className="container">
          <div style={{ maxWidth: '780px', margin: '0 auto', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border)', boxShadow: '0 8px 40px rgba(0,0,0,0.5)' }}>
            <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, background: '#0a0a0f' }}>
              <video controls playsInline preload="metadata"
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
              >
                <source src="https://assets.cdn.filesafe.space/52BA1ANBkC1zh16RV6WV/media/69fa69525facc6ea31519500.mp4" type="video/mp4" />
              </video>
            </div>
          </div>
        </div>
      </section>

      {/* CTA BAJO VSL */}
      <div style={{ background: 'var(--bg)', padding: '0 20px 36px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <a href={calendlyLink} className="btn btn--lg btn--gold" id="hero-cta" rel="noopener noreferrer">
          Agendá tu sesión <span className="arrow">→</span>
        </a>
        <p className="hero-note" style={{ marginTop: '14px' }}>Sin costo. Sin compromiso. Solo para inversores serios.</p>
      </div>

      {/* TESTIMONIOS VIDEO */}
      <section className="testimonios-video" data-block="testimonios-video">
        <div className="container">
          <div className="sec-header fade">
            <div className="sec-tag">Testimonios reales</div>
            <h2>Opiniones de <span className="gold-text">nuestros clientes</span></h2>
            <p>Profesionales de distintos rubros que decidieron trabajar con Roberto.</p>
          </div>

          <div className="testimonials-grid">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className={`testimonial-card-v fade ${t.delay || ''}`}>
                <div className="testimonial-video" onClick={(e) => toggleVideo(e.currentTarget)}>
                  <video preload="metadata">
                    <source src={t.video} type="video/mp4" />
                  </video>
                  <div className="play-overlay">
                    <div className="play-icon"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg></div>
                  </div>
                </div>
                <div className="testimonial-review">
                  <div className="testimonial-stars">★★★★★</div>
                  <p className="testimonial-quote" dangerouslySetInnerHTML={{ __html: `"${t.quote}"` }} />
                  <div className="testimonial-author">
                    <div className="testimonial-avatar">{t.initials}</div>
                    <div>
                      <div className="testimonial-name">{t.name}</div>
                      <div className="testimonial-role-v">{t.role}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA TESTIMONIOS */}
      <div style={{ background: 'var(--bg2)', padding: '0 0 36px', display: 'flex', justifyContent: 'center' }}>
        <a href={calendlyLink} className="btn btn--lg btn--gold" rel="noopener noreferrer">
          Agendá tu sesión <span className="arrow">→</span>
        </a>
      </div>

      {/* CREDENCIALES */}
      <section data-block="creds" style={{ background: 'var(--bg)', paddingTop: '36px', paddingBottom: '24px' }}>
        <div className="container">
          <div className="sec-header fade">
            <img src={LOGO_URL} alt="Ruarte Reports" className="logo-img" style={{ marginBottom: '16px', display: 'inline-block' }} />
            <h2 style={{ fontSize: 'clamp(16px,2.4vw,26px)', whiteSpace: 'nowrap' }}>Nuestros fundamentos son respaldados por historial real</h2>
            <p>Somos la firma de análisis técnico con más trayectoria de Latinoamérica.</p>
          </div>

          <div className="creds-grid">
            {[
              { num: '+40', desc: 'Años de trayectoria operando mercados reales' },
              { num: '+20K', desc: 'Personas formadas en toda Latinoamérica', delay: 'd1' },
              { num: '+1B', desc: 'USD en fondos gestionados', delay: 'd2' },
              { num: '+10', desc: 'Aciertos históricos documentados', delay: 'd3' },
            ].map((c, i) => (
              <div key={i} className={`cred-num-card fade ${c.delay || ''}`}>
                <div className="cred-big">{c.num}</div>
                <div className="cred-desc">{c.desc}</div>
              </div>
            ))}
          </div>

          <div className="cred-intro fade">
            <div className="cred-photo-wrap">
              <img src="https://assets.cdn.filesafe.space/52BA1ANBkC1zh16RV6WV/media/69e2c5cdc87cb8c801853e2f.png" alt="Roberto Ruarte" />
            </div>
            <ul className="cred-list">
              <li><span className="dot"></span><div>Metodología basada en <strong>Ondas de Elliott</strong> y <strong>Ciclos Económicos de Mercado</strong></div></li>
              <li><span className="dot"></span><div><strong>Assets Consultor</strong> del Fondo Toronto Trust —<br /><strong>Top 4</strong> fondos más rentables de Argentina</div></li>
              <li><span className="dot"></span><div><strong>Roberto A. Ruarte</strong> — <strong>Dr. Honoris Causa</strong>. Precursor del Análisis Técnico en Latinoamérica</div></li>
              <li><span className="dot"></span><div>Gestión de patrimonios de <strong>family offices</strong> en Argentina, México, Colombia, Perú y Estados Unidos</div></li>
            </ul>
            <div className="cred-photo-wrap">
              <img src="https://assets.cdn.filesafe.space/52BA1ANBkC1zh16RV6WV/media/69e2c5cd8696a78b8dbff264.png" alt="Roberto Ruarte Jr." />
            </div>
          </div>
        </div>
      </section>

      {/* TRACK RECORD */}
      <div style={{ background: 'var(--bg)', padding: '0 0 36px' }}>
        <div className="container">
          <div className="track-carousel-wrap fade">
            <div className="track-track" id="trackTrack" ref={trackRef}>
              {TRACK_RECORDS.map((t, i) => (
                <div key={i} className="track-card">
                  <div className="track-year">{t.year}</div>
                  <p dangerouslySetInnerHTML={{ __html: t.text }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* PILARES */}
      <section className="pilares" data-block="pilares">
        <div className="container">
          <div className="sec-header fade">
            <h2 id="pilares-h2"><span className="gold-text">Metodología</span></h2>
          </div>

          <div className="pilares-grid">
            {[
              {
                num: 'Pilar 01', title: 'Reestructuración de Portfolio', items: [
                  'Tu cartera actual es el resultado de decisiones aisladas, sin un criterio que las una',
                  'En menos de 2 semanas reestructuramos tu portfolio según tu perfil de riesgo y el ciclo actual',
                  'Basado en Ondas de Elliott y ciclos económicos, apuntando a un 30–40% anual',
                  'Vas a saber exactamente qué tenés, por qué lo tenés y qué esperar de cada posición',
                ]
              },
              {
                num: 'Pilar 02', title: 'Criterio de Inversión', delay: 'd1', items: [
                  'Reestructurar el portfolio es el punto de partida — lo que importa es entender el criterio detrás',
                  'Aprendés la metodología aplicada a tu situación real: Elliott Waves, ciclos y gestión de riesgo',
                  'Cada decisión que tomamos juntos es práctica real, no teoría ni casos hipotéticos',
                  'Al terminar sabés gestionar tu capital solo, sin depender de nadie ni dedicarle el día',
                ]
              },
              {
                num: 'Pilar 03', title: 'Acompañamiento 1 a 1', delay: 'd2', items: [
                  'La mayoría de programas te dan contenido y te dejan solo con las dudas — nosotros no',
                  'Arrancamos con una auditoría de tu cartera actual y un plan de acción claro',
                  'Acompañamiento personalizado durante todo el proceso: tus preguntas tienen respuesta a tiempo',
                  'Porque una duda sin respuesta con capital real en el mercado te cuesta dinero',
                ]
              },
            ].map((p, i) => (
              <div key={i} className={`pilar-card fade ${p.delay || ''}`}>
                <div className="pilar-num">{p.num}</div>
                <h3>{p.title}</h3>
                <ul className="pilar-list">
                  {p.items.map((item, j) => (
                    <li key={j}><span className="pilar-dot"></span>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA PILARES */}
      <div style={{ background: 'var(--bg2)', padding: '0 0 36px', display: 'flex', justifyContent: 'center' }}>
        <a href={calendlyLink} className="btn btn--lg btn--gold" rel="noopener noreferrer">
          Agendá tu sesión <span className="arrow">→</span>
        </a>
      </div>

      {/* CLIENTES */}
      <section className="clientes" data-block="clientes">
        <div className="container">
          <div className="sec-header fade">
            <div className="sec-tag">Confianza institucional</div>
            <h2 id="clientes-h2">Ayudamos a las Principales Instituciones Financieras del <span className="gold-text">MUNDO</span></h2>
            <p>Hemos asesorado a <strong>bancos, brokers, universidades y empresas líderes</strong> en América, consolidando una reputación de excelencia y confiabilidad.</p>
          </div>

          <div className="logo-carousel-wrap fade">
            <div className="logo-track">
              {[...LOGOS, ...LOGOS].map((logo, i) => (
                <div key={i} className="logo-item">
                  <img src={logo.src} alt={logo.alt} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="faq" data-block="faq">
        <div className="container">
          <div className="sec-header fade">
            <div className="sec-tag">Preguntas frecuentes</div>
            <h2>Todo lo que necesitás<br /><span className="gold-text">saber antes de comenzar</span></h2>
          </div>

          <div className="faq-list fade">
            {FAQ_ITEMS.map((item, i) => (
              <div key={i} className="faq-item">
                <div className="faq-q">
                  {item.q}
                  <span className="faq-chevron">+</span>
                </div>
                <div className="faq-a">
                  <p className="faq-a-inner" dangerouslySetInnerHTML={{ __html: item.a }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="cta-final" data-block="cta-final" style={{ paddingBottom: '60px' }}>
        <div className="container">
          <div className="cta-final-card fade">
            <div className="sec-tag" style={{ marginBottom: '20px' }}>El próximo paso</div>
            <h2 id="cta-final-h2">¿Estás listo para estructurar<br /><span className="gold-text">tu capital con criterio profesional?</span></h2>
            <p>
              Una sesión. Sin compromiso. Te mostramos exactamente cómo podés posicionarte
              en los activos que van a liderar el próximo ciclo.
            </p>
            <a href={calendlyLink} className="btn btn--lg btn--gold" rel="noopener noreferrer">
              Agendá tu sesión gratuita <span className="arrow">→</span>
            </a>
            <p className="hero-note" style={{ marginTop: '16px' }}>Solo para inversores con capital activo. Cupos limitados.</p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer data-block="footer">
        <img src={LOGO_URL} alt="Ruarte Reports" style={{ display: 'inline-block' }} />
        <p style={{ marginTop: '-6px' }}>© 2026 Ruarte Reports. Todos los derechos reservados.</p>
        <p style={{ maxWidth: '500px', margin: '9px auto 0' }}>
          Este contenido es de carácter educativo e informativo. No constituye asesoramiento financiero
          ni recomendación de inversión. Los resultados pasados no garantizan rendimientos futuros.
        </p>
      </footer>

      {/* STICKY BAR */}
      <div className="sticky" id="sticky">
        <p><strong>Ruarte Reports</strong> — Agendá tu sesión sin costo</p>
        <a href={calendlyLink} className="btn" rel="noopener noreferrer">Agendar ahora <span className="arrow">→</span></a>
      </div>
    </>
  );
}

export default function EmpiezaAquiLanding() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center text-white">Cargando...</div>}>
      <EmpiezaAquiContent />
    </Suspense>
  );
}
