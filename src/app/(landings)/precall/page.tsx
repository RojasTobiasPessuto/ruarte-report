'use client';

import React, { useEffect, useState } from 'react';
import './styles.css';

const LOGO_URL = 'https://assets.cdn.filesafe.space/52BA1ANBkC1zh16RV6WV/media/69e2c5cdaa2fdcccf64c3d65.png';
const ROBERTO_PHOTO = 'https://assets.cdn.filesafe.space/52BA1ANBkC1zh16RV6WV/media/69e2c5cdc87cb8c801853e2f.png';
const ROBERTO_JR_PHOTO = 'https://assets.cdn.filesafe.space/52BA1ANBkC1zh16RV6WV/media/69e2c5cd8696a78b8dbff264.png';
const MAIN_VIDEO = 'https://assets.cdn.filesafe.space/KtUHW6Xfym4HTBF8Ujq8/media/690a821d97a5933b65f921fe.mp4';

const TRACK_RECORDS = [
  { year: '1987 — Crash de Wall Street', text: 'Anticipamos el mayor desplome en un solo día de la historia. <strong>El mercado cayó 22% en horas.</strong>' },
  { year: '1997 — Crisis Asiática', text: 'Identificamos el contagio antes de que se extendiera a América Latina y posicionamos a nuestros clientes en consecuencia.' },
  { year: '2000 — Burbuja Punto Com', text: 'Alertamos el techo del Nasdaq meses antes del colapso. <strong>El índice cayó más del 75% en los siguientes dos años.</strong>' },
  { year: '2001 — Crisis Argentina', text: 'Anunciamos en vivo en Crónica TV el <strong>piso del mercado</strong> cuando todos hablaban de colapso total.' },
  { year: '2008 — Crisis Subprime', text: 'Publicamos la alerta de quiebre del mercado inmobiliario americano antes del colapso de Lehman Brothers.' },
  { year: '2009 — Fondo de Wall Street', text: 'Publicamos en Ámbito Financiero que <strong>Wall Street tocó piso</strong> en pleno pánico post-Lehman.' },
  { year: '2020 — Crash COVID', text: 'Señalamos el piso del S&P500 en marzo 2020 cuando el mercado caía en picada. <strong>El índice rebotó +80% desde ese nivel.</strong>' },
  { year: '2021 — Ciclo Commodities', text: 'Co-fundamos un fondo sobre la tesis de Argentina y commodities. Resultado: <strong>+600% de rendimiento</strong>.' },
  { year: '2022 — Mercado Bajista', text: 'Anticipamos el mercado bajista en acciones tecnológicas. El Nasdaq llegó a caer <strong>más del 33% ese año.</strong>' },
];

const YEAR_HIGHLIGHTS = [
  { year: '2022', value: '+68.17%', sign: 'pc-pos' as const },
  { year: '2023', value: '+342.80%', sign: 'pc-pos' as const },
  { year: '2024', value: '+131.34%', sign: 'pc-pos' as const },
  { year: '2025', value: '+26.04%', sign: 'pc-pos' as const },
];

type Cell = { text: string; cls?: 'pc-pos' | 'pc-neg' | 'pc-ytd pc-pos' | 'pc-ytd pc-neg' };

const MONTHLY_TABLE: { year: string; cells: Cell[]; ytd: Cell }[] = [
  { year: '2022', cells: [
      { text: '—' }, { text: '0.00%', cls: 'pc-pos' }, { text: '2.57%', cls: 'pc-pos' }, { text: '-0.08%', cls: 'pc-neg' },
      { text: '2.48%', cls: 'pc-pos' }, { text: '-10.59%', cls: 'pc-neg' }, { text: '32.29%', cls: 'pc-pos' }, { text: '2.39%', cls: 'pc-pos' },
      { text: '0.27%', cls: 'pc-pos' }, { text: '2.63%', cls: 'pc-pos' }, { text: '11.24%', cls: 'pc-pos' }, { text: '15.50%', cls: 'pc-pos' },
    ], ytd: { text: '68.17%', cls: 'pc-ytd pc-pos' } },
  { year: '2023', cells: [
      { text: '22.50%', cls: 'pc-pos' }, { text: '-2.07%', cls: 'pc-neg' }, { text: '0.35%', cls: 'pc-pos' }, { text: '9.54%', cls: 'pc-pos' },
      { text: '14.51%', cls: 'pc-pos' }, { text: '29.61%', cls: 'pc-pos' }, { text: '9.25%', cls: 'pc-pos' }, { text: '34.14%', cls: 'pc-pos' },
      { text: '-7.74%', cls: 'pc-neg' }, { text: '6.90%', cls: 'pc-pos' }, { text: '36.36%', cls: 'pc-pos' }, { text: '14.80%', cls: 'pc-pos' },
    ], ytd: { text: '342.80%', cls: 'pc-ytd pc-pos' } },
  { year: '2024', cells: [
      { text: '28.49%', cls: 'pc-pos' }, { text: '-15.47%', cls: 'pc-neg' }, { text: '14.03%', cls: 'pc-pos' }, { text: '5.13%', cls: 'pc-pos' },
      { text: '19.00%', cls: 'pc-pos' }, { text: '-4.27%', cls: 'pc-neg' }, { text: '-2.33%', cls: 'pc-neg' }, { text: '10.38%', cls: 'pc-pos' },
      { text: '1.56%', cls: 'pc-pos' }, { text: '7.30%', cls: 'pc-pos' }, { text: '22.30%', cls: 'pc-pos' }, { text: '8.55%', cls: 'pc-pos' },
    ], ytd: { text: '131.34%', cls: 'pc-ytd pc-pos' } },
  { year: '2025', cells: [
      { text: '-0.69%', cls: 'pc-neg' }, { text: '-9.70%', cls: 'pc-neg' }, { text: '7.68%', cls: 'pc-pos' }, { text: '-12.87%', cls: 'pc-neg' },
      { text: '11.44%', cls: 'pc-pos' }, { text: '-7.82%', cls: 'pc-neg' }, { text: '15.79%', cls: 'pc-pos' }, { text: '-9.39%', cls: 'pc-neg' },
      { text: '-5.58%', cls: 'pc-neg' }, { text: '37.13%', cls: 'pc-pos' }, { text: '6.27%', cls: 'pc-pos' }, { text: '1.02%', cls: 'pc-pos' },
    ], ytd: { text: '26.04%', cls: 'pc-ytd pc-pos' } },
  { year: '2026', cells: [
      { text: '2.96%', cls: 'pc-pos' }, { text: '-13.28%', cls: 'pc-neg' }, { text: '11.77%', cls: 'pc-pos' }, { text: '-0.25%', cls: 'pc-neg' },
      { text: '—' }, { text: '—' }, { text: '—' }, { text: '—' }, { text: '—' }, { text: '—' }, { text: '—' }, { text: '—' },
    ], ytd: { text: '-0.45%', cls: 'pc-ytd pc-neg' } },
];

const TESTIMONIALS = [
  { video: 'https://assets.cdn.filesafe.space/KtUHW6Xfym4HTBF8Ujq8/media/69d6812e3d9f7a33e41ce234.mp4', role: 'Corredor de Bolsa', desc: 'ALYC (broker) en Argentina' },
  { video: 'https://assets.cdn.filesafe.space/KtUHW6Xfym4HTBF8Ujq8/media/69d680a43d829c73b2df3f99.mp4', role: 'Docente Universitario y Economista', desc: 'Profesional', delay: 'pc-animate-delay-1' },
  { video: 'https://assets.cdn.filesafe.space/KtUHW6Xfym4HTBF8Ujq8/media/69d57a533d829c73b2b7aa70.mp4', role: 'Gerente Agropecuario y Contador Público', desc: 'Profesional Independiente' },
  { video: 'https://assets.cdn.filesafe.space/KtUHW6Xfym4HTBF8Ujq8/media/69d57185cc3e8e01b2b5ce0b.mp4', role: 'Ingeniero', desc: 'Industria petrolera', delay: 'pc-animate-delay-1' },
  { video: 'https://assets.cdn.filesafe.space/KtUHW6Xfym4HTBF8Ujq8/media/69d57c15ad0e3e3270605fdc.mp4', role: 'Importador', desc: 'Empresa importadora de artículos de iluminación' },
  { video: 'https://assets.cdn.filesafe.space/KtUHW6Xfym4HTBF8Ujq8/media/69d57b44ad0e3e3270602af2.mp4', role: 'Comerciante', desc: 'Comercio minorista y mayorista de Commodities', delay: 'pc-animate-delay-1' },
];

const FAQ_ITEMS = [
  { q: '¿A quién está dirigido este programa?', a: 'Está dirigido a traders, inversores o empresarios con capital y/o experiencia que buscan resultados estables y profesionalizar su operativa. No es para quienes buscan "hacerse ricos rápido" — es para quienes quieren construir criterio real de inversión a largo plazo.' },
  { q: '¿En qué consiste exactamente la consultoría?', a: 'Es un proceso personalizado basado en tres pilares: <strong>Estrategia</strong> (lectura de ciclos y análisis técnico), <strong>Gestión</strong> (armado de portafolio y gestión de riesgo) y <strong>Mentalidad</strong> (disciplina operativa y proceso de toma de decisiones).' },
  { q: '¿Necesito experiencia previa en trading o inversión?', a: 'No necesariamente. El programa tiene diferentes niveles según tu punto de partida. Lo importante es que tengas capital para invertir y la seriedad de querer hacerlo con criterio profesional.' },
  { q: '¿Cuánto tiempo necesito dedicarle?', a: 'Nuestros alumnos operan pocas horas a la semana. El sistema está diseñado para que no necesites estar pegado a la pantalla ni seguir noticias todos los días. Se trata de calidad, no de cantidad de horas frente al mercado.' },
  { q: '¿Es solo para gente con mucho capital?', a: 'Tenemos programas para distintos perfiles. Lo importante no es el monto exacto, sino la intención de invertir con un sistema profesional. En la llamada evaluamos cuál es el mejor camino según tu situación.' },
  { q: '¿Qué resultados puedo esperar de forma realista?', a: 'Los resultados dependen de tu capital, perfil de riesgo y disciplina. Lo que sí podemos garantizar es que vas a tener un sistema claro, acompañamiento real y acceso a 40 años de experiencia en mercados reales — no teoría.' },
];

function toggleTestimonialVideo(container: HTMLDivElement) {
  const video = container.querySelector('video');
  const overlay = container.querySelector('.pc-play-overlay') as HTMLElement;
  if (!video || !overlay) return;
  if (video.paused) {
    document.querySelectorAll('.pc-testimonial-video video').forEach(v => {
      (v as HTMLVideoElement).pause();
      const o = v.parentElement?.querySelector('.pc-play-overlay') as HTMLElement;
      if (o) o.style.opacity = '1';
    });
    video.play();
    overlay.style.opacity = '0';
  } else {
    video.pause();
    overlay.style.opacity = '1';
  }
}

export default function PrecallLanding() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('pc-visible'); obs.unobserve(e.target); } });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
    document.querySelectorAll('.pc-animate').forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  // Duplica los track-cards para infinite scroll loop
  const trackRecordsLoop = [...TRACK_RECORDS, ...TRACK_RECORDS];

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;900&family=Inter:wght@400;500;600&family=Montserrat:wght@400;700;800;900&display=swap" rel="stylesheet" />

      <header className="pc-header" data-block="header">
        <div className="pc-container">
          <img src={LOGO_URL} alt="Ruarte Reports" className="pc-logo-img" />
        </div>
      </header>

      <section className="pc-hero" data-block="hero">
        <div className="pc-container">
          <div className="pc-animate">
            <div className="pc-hero-badge" id="hero-badge">Video obligatorio antes de tu llamada</div>
          </div>

          <div className="pc-video-wrapper pc-animate pc-animate-delay-1">
            <div className="pc-video-glow"></div>
            <video controls preload="metadata" poster="">
              <source src={MAIN_VIDEO} type="video/mp4" />
            </video>
          </div>
        </div>
      </section>

      <section data-block="credentials" style={{ paddingTop: '0px', paddingBottom: '35px' }}>
        <div className="pc-container">
          <div className="pc-sec-header pc-animate">
            <img src={LOGO_URL} alt="Ruarte Reports" style={{ height: '85px', width: 'auto', marginBottom: '16px' }} />
            <h2 id="creds-h2" style={{ fontSize: '25px' }}>Nuestros fundamentos son respaldados por historial real</h2>
            <p>Somos la firma de análisis técnico con más trayectoria de Latinoamérica.</p>
          </div>
          <div className="pc-creds-grid">
            {[
              { num: '+40', desc: 'Años de trayectoria operando mercados reales' },
              { num: '+1K', desc: 'Inversores formados en toda Latinoamérica', delay: 'pc-animate-delay-1' },
              { num: '+1B', desc: 'En fondos gestionados', delay: 'pc-animate-delay-2' },
              { num: '+10', desc: 'Aciertos históricos documentados', delay: 'pc-animate-delay-3' },
            ].map((c, i) => (
              <div key={i} className={`pc-cred-num-card pc-animate ${c.delay || ''}`}>
                <div className="pc-cred-big">{c.num}</div>
                <div className="pc-cred-desc">{c.desc}</div>
              </div>
            ))}
          </div>
          <div className="pc-cred-intro pc-animate">
            <div className="pc-cred-photo-wrap"><img src={ROBERTO_PHOTO} alt="Roberto Ruarte" /></div>
            <ul className="pc-cred-list">
              <li><span className="pc-dot"></span><div id="cred-item1">Metodología basada en <strong>Ondas de Elliott</strong> y <b>Ciclos económicos de Mercado</b></div></li>
              <li><span className="pc-dot"></span><div id="cred-item2"><b><span style={{ color: 'rgb(255, 255, 255)' }}>Assets Consultor</span></b> del Fondo Toronto Trust — <b>Top 4</b> fondos más rentables de Argentina</div></li>
              <li><span className="pc-dot"></span><div id="cred-item3"><b>Roberto A. Ruarte</b> - <strong>Dr. Honoris Causa</strong> Precursor del Análisis Técnico en Latinoamérica</div></li>
              <li><span className="pc-dot"></span><div id="cred-item4"><b><span style={{ color: 'rgb(255, 255, 255)' }}>Gestión de Patrimonios de family office</span></b> en Argentina, México, Colombia, Perú y Estados Unidos</div></li>
            </ul>
            <div className="pc-cred-photo-wrap"><img src={ROBERTO_JR_PHOTO} alt="Roberto Ruarte Jr." /></div>
          </div>
          <div className="pc-track-carousel-wrap pc-animate">
            <div className="pc-track-track">
              {trackRecordsLoop.map((t, i) => (
                <div key={i} className="pc-track-card">
                  <div className="pc-track-year">{t.year}</div>
                  <p dangerouslySetInnerHTML={{ __html: t.text }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="pc-perf-section" data-block="performance">
        <div className="pc-container">
          <div className="pc-animate" style={{ textAlign: 'center' }}>
            <span className="pc-section-tag">Historial verificable</span>
            <h2 id="perf-h2"><strong>Performance</strong> <span className="pc-accent">Mensual</span></h2>
          </div>
          <div className="pc-perf-wrap pc-animate pc-animate-delay-1">
            <div className="pc-perf-info-box">
              <strong>Resultados de nuestra tesis anterior: Argentina (2021).</strong> Nuestra tesis actual es la de Commodities, la oportunidad que vemos hasta 2031.
            </div>
            <div className="pc-perf-quote">
              Generar retornos absolutos mediante la identificación de ciclos macroeconómicos estructurales. La estrategia capitaliza la rotación global de capital hacia commodities y divisas de valor.
            </div>
            <div className="pc-perf-years">
              {YEAR_HIGHLIGHTS.map(y => (
                <div key={y.year}>
                  <div className="pc-perf-year-label">{y.year}</div>
                  <div className={`pc-perf-year-val ${y.sign}`}>{y.value}</div>
                </div>
              ))}
            </div>
            <div className="pc-perf-table-wrap">
              <table className="pc-perf-table">
                <thead>
                  <tr>
                    <th>Año</th>
                    <th>Ene</th><th>Feb</th><th>Mar</th><th>Abr</th><th>May</th><th>Jun</th>
                    <th>Jul</th><th>Ago</th><th>Sep</th><th>Oct</th><th>Nov</th><th>Dic</th>
                    <th className="pc-ytd">YTD</th>
                  </tr>
                </thead>
                <tbody>
                  {MONTHLY_TABLE.map(row => (
                    <tr key={row.year}>
                      <td className="pc-year">{row.year}</td>
                      {row.cells.map((c, i) => (
                        <td key={i} className={c.cls || ''}>{c.text}</td>
                      ))}
                      <td className={row.ytd.cls}>{row.ytd.text}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pc-perf-disclaimer">
              <strong>DISCLAIMER</strong><br />
              La operativa activa implica riesgos. Rentabilidades pasadas no garantizan resultados futuros. Resultados de nuestra anterior tesis (Argentina - 2021) disponibles mediante link de track record auditado.
            </div>
          </div>
        </div>
      </section>

      <section className="pc-testimonials-section" data-block="testimonials">
        <div className="pc-container">
          <div className="pc-section-header pc-animate">
            <span className="pc-section-tag" id="test-tag">Testimonios reales</span>
            <h2 id="test-h2">Opiniones de nuestros clientes</h2>
            <p id="test-p">Profesionales de distintos rubros que decidieron trabajar con Roberto</p>
          </div>
          <div className="pc-testimonials-grid">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className={`pc-testimonial-card pc-animate ${t.delay || ''}`}>
                <div className="pc-testimonial-video" onClick={(e) => toggleTestimonialVideo(e.currentTarget)}>
                  <video preload="metadata">
                    <source src={t.video} type="video/mp4" />
                  </video>
                  <div className="pc-play-overlay">
                    <div className="pc-play-icon"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg></div>
                  </div>
                </div>
                <div className="pc-testimonial-info">
                  <div className="pc-testimonial-role" id={`t${i + 1}-role`}>{t.role}</div>
                  <div className="pc-testimonial-desc" id={`t${i + 1}-desc`}>{t.desc}</div>
                  <div className="pc-sound-hint">🔊 Activá el sonido</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="pc-faq-section" data-block="faq">
        <div className="pc-container">
          <div className="pc-section-header pc-animate">
            <span className="pc-section-tag" id="faq-tag">Preguntas frecuentes</span>
            <h2 id="faq-h2">Todo lo que necesitás saber</h2>
          </div>
          <div className="pc-faq-list">
            {FAQ_ITEMS.map((item, i) => (
              <div key={i} className={`pc-faq-item pc-animate ${i > 0 ? `pc-animate-delay-${(i % 3) + 1}` : ''} ${openFaq === i ? 'pc-active' : ''}`}>
                <div className="pc-faq-question" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  <span id={`faq${i + 1}-q`}>{item.q}</span>
                  <div className="pc-faq-icon">+</div>
                </div>
                <div className="pc-faq-answer">
                  <div className="pc-faq-answer-inner" id={`faq${i + 1}-a`} dangerouslySetInnerHTML={{ __html: item.a }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="pc-footer" data-block="footer">
        <div className="pc-container">
          <p id="footer-text">© 2026 Ruarte&apos;s Reports. Todos los derechos reservados.</p>
        </div>
      </footer>
    </>
  );
}
