'use client';

import React, { useEffect, useRef, useState } from 'react';
import './styles.css';

const LOGO_URL = 'https://assets.cdn.filesafe.space/52BA1ANBkC1zh16RV6WV/media/69e2c5cdaa2fdcccf64c3d65.png';
const VIDEO_URL = 'https://assets.cdn.filesafe.space/KtUHW6Xfym4HTBF8Ujq8/media/69c146bd6f101754392753da.mov';
const VIDEO_POSTER = 'https://assets.cdn.filesafe.space/KtUHW6Xfym4HTBF8Ujq8/media/transcoded_videos/25e8fedf01b5178b.jpg';

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

const YEAR_HIGHLIGHTS = [
  { year: '2022', value: '+68.17%', sign: 'positive' as const },
  { year: '2023', value: '+342.80%', sign: 'positive' as const },
  { year: '2024', value: '+131.34%', sign: 'positive' as const },
  { year: '2025', value: '+26.04%', sign: 'positive' as const },
];

type Cell = { text: string; cls?: 'pos' | 'neg' | 'ytd pos' | 'ytd neg' | 'year' };

const MONTHLY_TABLE: { year: string; cells: Cell[]; ytd: Cell }[] = [
  {
    year: '2022',
    cells: [
      { text: '—' }, { text: '0.00%', cls: 'pos' }, { text: '2.57%', cls: 'pos' }, { text: '-0.08%', cls: 'neg' },
      { text: '2.48%', cls: 'pos' }, { text: '-10.59%', cls: 'neg' }, { text: '32.29%', cls: 'pos' }, { text: '2.39%', cls: 'pos' },
      { text: '0.27%', cls: 'pos' }, { text: '2.63%', cls: 'pos' }, { text: '11.24%', cls: 'pos' }, { text: '15.50%', cls: 'pos' },
    ],
    ytd: { text: '68.17%', cls: 'ytd pos' },
  },
  {
    year: '2023',
    cells: [
      { text: '22.50%', cls: 'pos' }, { text: '-2.07%', cls: 'neg' }, { text: '0.35%', cls: 'pos' }, { text: '9.54%', cls: 'pos' },
      { text: '14.51%', cls: 'pos' }, { text: '29.61%', cls: 'pos' }, { text: '9.25%', cls: 'pos' }, { text: '34.14%', cls: 'pos' },
      { text: '-7.74%', cls: 'neg' }, { text: '6.90%', cls: 'pos' }, { text: '36.36%', cls: 'pos' }, { text: '14.80%', cls: 'pos' },
    ],
    ytd: { text: '342.80%', cls: 'ytd pos' },
  },
  {
    year: '2024',
    cells: [
      { text: '28.49%', cls: 'pos' }, { text: '-15.47%', cls: 'neg' }, { text: '14.03%', cls: 'pos' }, { text: '5.13%', cls: 'pos' },
      { text: '19.00%', cls: 'pos' }, { text: '-4.27%', cls: 'neg' }, { text: '-2.33%', cls: 'neg' }, { text: '10.38%', cls: 'pos' },
      { text: '1.56%', cls: 'pos' }, { text: '7.30%', cls: 'pos' }, { text: '22.30%', cls: 'pos' }, { text: '8.55%', cls: 'pos' },
    ],
    ytd: { text: '131.34%', cls: 'ytd pos' },
  },
  {
    year: '2025',
    cells: [
      { text: '-0.69%', cls: 'neg' }, { text: '-9.70%', cls: 'neg' }, { text: '7.68%', cls: 'pos' }, { text: '-12.87%', cls: 'neg' },
      { text: '11.44%', cls: 'pos' }, { text: '-7.82%', cls: 'neg' }, { text: '15.79%', cls: 'pos' }, { text: '-9.39%', cls: 'neg' },
      { text: '-5.58%', cls: 'neg' }, { text: '37.13%', cls: 'pos' }, { text: '6.27%', cls: 'pos' }, { text: '1.02%', cls: 'pos' },
    ],
    ytd: { text: '26.04%', cls: 'ytd pos' },
  },
  {
    year: '2026',
    cells: [
      { text: '2.96%', cls: 'pos' }, { text: '-13.28%', cls: 'neg' }, { text: '11.77%', cls: 'pos' }, { text: '-0.25%', cls: 'neg' },
      { text: '—' }, { text: '—' }, { text: '—' }, { text: '—' }, { text: '—' }, { text: '—' }, { text: '—' }, { text: '—' },
    ],
    ytd: { text: '-0.45%', cls: 'ytd neg' },
  },
];

const FAQ_ITEMS = [
  {
    q: '¿A quién está dirigido este programa?',
    a: 'Está diseñado para traders, inversores o empresarios que ya tienen capital o experiencia en los mercados, pero que aún no logran mantener resultados estables. También es ideal para quienes quieren estructurar su operativa o portafolio con mentalidad profesional, mejorar su gestión del riesgo y construir un sistema predecible de crecimiento financiero.',
  },
  {
    q: '¿En qué consiste exactamente la consultoría?',
    a: 'Es un proceso personalizado de acompañamiento estratégico, donde trabajamos sobre tres pilares:<br><br><strong>Estrategia:</strong> análisis de tu perfil, sistemas y decisiones actuales.<br><strong>Gestión:</strong> estructura de capital, riesgo, métricas y consistencia.<br><strong>Mentalidad:</strong> bloqueos emocionales, disciplina y toma de decisiones bajo presión.<br><br>Todo se adapta a tu contexto, tus objetivos y tu disponibilidad de tiempo.',
  },
  {
    q: '¿Necesito experiencia previa en trading o inversión?',
    a: 'No necesariamente. El programa tiene diferentes niveles según tu punto de partida. Si ya operás, te ayudamos a profesionalizar tu enfoque y a sistematizar tus resultados. Si sos nuevo en el mundo de las inversiones, te damos la estructura mental, técnica y estratégica para que empieces con bases sólidas y evites los errores más comunes.',
  },
];

export default function UltimosPasosLanding() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const answerRefs = useRef<Array<HTMLDivElement | null>>([]);

  useEffect(() => {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } });
    }, { threshold: 0.12 });
    document.querySelectorAll('.up-animate').forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    answerRefs.current.forEach((ref, idx) => {
      if (!ref) return;
      ref.style.maxHeight = openFaq === idx ? `${ref.scrollHeight}px` : '0';
    });
  }, [openFaq]);

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&family=Montserrat:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />

      <header className="up-header" data-block="header">
        <div className="up-container">
          <img src={LOGO_URL} alt="Ruarte Reports" className="up-logo-img" />
        </div>
      </header>

      <section className="up-hero" data-block="hero">
        <div className="up-container">
          <div className="up-animate">
            <div className="up-hero-badge" id="hero-badge">¡Felicidades! Importante que veas el siguiente video 👇</div>
          </div>
        </div>
      </section>

      <section className="up-video-section" data-block="video">
        <div className="up-container">
          <div className="up-video-wrapper up-animate">
            <video controls preload="metadata" poster={VIDEO_POSTER}>
              <source src={VIDEO_URL} type="video/mp4" />
            </video>
          </div>
        </div>
      </section>

      <section className="up-logos-section" data-block="logos">
        <div className="up-container">
          <div className="up-animate">
            <span className="up-section-tag">Confianza institucional</span>
            <h2 id="logos-h2">
              Ayudamos a las Principales<br />Instituciones Financieras del <span style={{ color: 'var(--gold)' }}>MUNDO</span>
            </h2>
            <p id="logos-p">
              Hemos asesorado a <strong>bancos, brokers, universidades y empresas líderes</strong> en América, consolidando una reputación de excelencia y confiabilidad.
            </p>
          </div>
          <div className="up-logo-carousel-wrap up-animate up-animate-delay-1">
            <div className="up-logo-track">
              {[...LOGOS, ...LOGOS].map((logo, i) => (
                <div key={i} className="up-logo-item">
                  <img src={logo.src} alt={logo.alt} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="up-track-section" data-block="track">
        <div className="up-container">
          <div className="up-animate">
            <span className="up-section-tag">Historial verificable</span>
            <h2 id="track-h2"><strong>Performance</strong> <span className="up-accent">Mensual</span></h2>
          </div>

          <div className="up-track-card up-animate up-animate-delay-1">
            <div className="up-tr-info-box">
              <strong>Resultados de nuestra tesis anterior: Argentina (2021).</strong> Nuestra tesis actual es la de Commodities, la oportunidad que vemos hasta 2031.
            </div>

            <div className="up-tr-quote">
              Generar retornos absolutos mediante la identificación de ciclos macroeconómicos estructurales. La estrategia capitaliza la rotación global de capital hacia commodities y divisas de valor.
            </div>

            <div className="up-tr-years">
              {YEAR_HIGHLIGHTS.map(y => (
                <div key={y.year} className="up-tr-year-item">
                  <div className="up-tr-year-label">{y.year}</div>
                  <div className={`up-tr-year-val ${y.sign}`}>{y.value}</div>
                </div>
              ))}
            </div>

            <div className="up-tr-table-wrap">
              <table className="up-tr-table">
                <thead>
                  <tr>
                    <th>Año</th>
                    <th>Ene</th><th>Feb</th><th>Mar</th><th>Abr</th><th>May</th><th>Jun</th>
                    <th>Jul</th><th>Ago</th><th>Sep</th><th>Oct</th><th>Nov</th><th>Dic</th>
                    <th className="ytd">YTD</th>
                  </tr>
                </thead>
                <tbody>
                  {MONTHLY_TABLE.map(row => (
                    <tr key={row.year}>
                      <td className="year">{row.year}</td>
                      {row.cells.map((c, i) => (
                        <td key={i} className={c.cls || ''}>{c.text}</td>
                      ))}
                      <td className={row.ytd.cls}>{row.ytd.text}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="up-tr-disclaimer">
              <strong>DISCLAIMER</strong><br />
              La operativa activa implica riesgos. Rentabilidades pasadas no garantizan resultados futuros. Resultados de nuestra anterior tesis (Argentina - 2021) disponibles mediante link de track record auditado.
            </div>
          </div>
        </div>
      </section>

      <section className="up-faq-section" data-block="faq">
        <div className="up-container">
          <div className="up-section-header up-animate">
            <span className="up-section-tag">Preguntas frecuentes</span>
            <h2 id="faq-h2">Todo lo que necesitás saber</h2>
          </div>
          <div className="up-faq-list">
            {FAQ_ITEMS.map((item, i) => (
              <div key={i} className={`up-faq-item up-animate ${i > 0 ? `up-animate-delay-${i}` : ''} ${openFaq === i ? 'open' : ''}`}>
                <div className="up-faq-question" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  <span id={`faq${i + 1}-q`}>{item.q}</span>
                  <div className="up-faq-icon">+</div>
                </div>
                <div
                  className="up-faq-answer"
                  ref={el => { answerRefs.current[i] = el; }}
                >
                  <div className="up-faq-answer-inner" id={`faq${i + 1}-a`} dangerouslySetInnerHTML={{ __html: item.a }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="up-footer" data-block="footer">
        <div className="up-container">
          <p id="footer-text">© 2026 Ruarte&apos;s Reports. Todos los derechos reservados.</p>
        </div>
      </footer>
    </>
  );
}
