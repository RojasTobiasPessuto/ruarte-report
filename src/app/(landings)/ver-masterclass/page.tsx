'use client';

import React, { useEffect } from 'react';
import './styles.css';

export default function MasterclassLanding() {
  useEffect(() => {

  // Scroll animations
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); obs.unobserve(e.target); } });
  }, { threshold: 0.15 });
  document.querySelectorAll('.fade').forEach(el => obs.observe(el));

  // Sticky
  const sticky = document.getElementById('sticky');
  window.addEventListener('scroll', () => {
    if (sticky) sticky.classList.toggle('on', window.scrollY > 500);
  });

  // Track carousel — duplicate cards for seamless loop
  (function() {
    const track = document.getElementById('trackTrack');
    if (!track) return;
    const originals = Array.from(track.children);
    originals.forEach(card => track.appendChild(card.cloneNode(true)));
  })();

  }, []);

  return (
    <>


{/* HEADER */}
<header className="header" data-block="header" style={{ textAlign: 'center' }}>
  <img src="https://assets.cdn.filesafe.space/52BA1ANBkC1zh16RV6WV/media/69e2c5cdaa2fdcccf64c3d65.png" alt="Ruarte Reports" className="logo-img" style={{ display: 'inline-block' }} />
</header>

{/* HERO */}
<section className="hero" data-block="hero">
  <div className="container">
    <h1 className="fade in d1" style={{marginTop: '-22px'}}>
      <span id="hero-line1" style={{fontSize: '35px'}}>¿Estas posicionando tu<br className="mobile-br" /> capital correctamente?</span><br  />
      <span className="gold-text" id="hero-line2" style={{fontSize: '23px'}}>Descubrí cómo ganarle al S&amp;P500<br className="mobile-br2" /> en tiempos de incertidumbre.</span>
    </h1>

  </div>
</section>

{/* VIDEO + TOPICS wrapper para reordenar en mobile */}
<div className="video-topics-wrapper">

{/* VIDEO */}
<section className="video-sec" data-block="video" style={{paddingTop: '15px', paddingBottom: '10px'}}>
  <div className="container">
    <div className="video-wrap fade">
      <div className="video-embed" id="video-container">
        <video controls playsInline {...{ 'webkit-playsinline': 'true' }} preload="auto" style={{position: 'absolute', inset: '0', width: '100%', height: '100%'}}>
          <source src="https://assets.cdn.filesafe.space/52BA1ANBkC1zh16RV6WV/media/69f8cd486f6468fa0219db68.mp4" type="video/mp4"  />
        </video>
      </div>
    </div>
  </div>
</section>

{/* CTA AGENDAR */}
<section className="cta-video-sec" data-block="cta-video" style={{background: 'var(--bg2)', padding: '10px 0 32px'}}>
  <div className="container" style={{textAlign: 'center'}}>
    <p style={{fontSize: 'clamp(15px,4vw,18px)', marginBottom: '8px'}}><strong>¿Querés aplicar esto a tu capital?</strong></p>
    <p style={{fontSize: 'clamp(13px,3.5vw,15px)', color: 'var(--text2)', marginBottom: '24px'}}>Agendá una llamada gratuita con nuestro equipo.</p>
    <a href="https://ruartereports.org/calendario-3986" className="btn btn--lg" id="cta-video-btn">
      Agendar mi llamada gratuita <span className="arrow">→</span>
    </a>
  </div>
</section>

{/* QUÉ VAS A VER — ticker en mobile, grid en desktop */}
<section className="topics-sec" data-block="topics" style={{paddingTop: '4px', paddingBottom: '15px'}}>
  <div className="container">
    <div className="sec-header fade" style={{marginBottom: '16px'}}>
      <h2 style={{fontSize: 'clamp(14px,3.85vw,20px)'}}>Qué vas a ver en la masterclass</h2>
    </div>
  </div>
  {/* Ticker mobile (cards duplicadas para loop infinito) */}
  <div className="topics-ticker-wrap">
    <div className="topics-ticker-track">
      {/* Set 1 */}
      <div className="topic-card"><div className="topic-num">01</div><div className="topic-title">POR QUE EL S&amp;P500 ES UNA TRAMPA SILENCIOSA</div><div className="topic-desc">El indice americano no es tan diversificado como parece.</div></div>
      <div className="topic-card"><div className="topic-num">02</div><div className="topic-title">COMO DETECTAR EL TECHO DE UN MERCADO</div><div className="topic-desc">Las señales de cada gran crisis se repiten hoy.</div></div>
      <div className="topic-card"><div className="topic-num">03</div><div className="topic-title">EL CICLO ECONOMICO DEL DOLAR DEBIL</div><div className="topic-desc">Porque tener dolares es la peor decisión ahora.</div></div>
      <div className="topic-card"><div className="topic-num">04</div><div className="topic-title">A DONDE ROTA EL CAPITAL INSTITUCIONAL</div><div className="topic-desc">Entende como aprovechar esta oportunidad.</div></div>
      <div className="topic-card"><div className="topic-num">05</div><div className="topic-title">LA OPORTUNIDAD HISTORICA EN LATINOAMERICA</div><div className="topic-desc">Activos que van a multiplicar su valor en los proximos años.</div></div>
      {/* Set 2 (duplicado para loop) */}
      <div className="topic-card"><div className="topic-num">01</div><div className="topic-title">POR QUE EL S&amp;P500 ES UNA TRAMPA SILENCIOSA</div><div className="topic-desc">El indice americano no es tan diversificado como parece.</div></div>
      <div className="topic-card"><div className="topic-num">02</div><div className="topic-title">COMO DETECTAR EL TECHO DE UN MERCADO</div><div className="topic-desc">Las señales de cada gran crisis se repiten hoy.</div></div>
      <div className="topic-card"><div className="topic-num">03</div><div className="topic-title">EL CICLO ECONOMICO DEL DOLAR DEBIL</div><div className="topic-desc">Porque tener dolares es la peor decisión ahora.</div></div>
      <div className="topic-card"><div className="topic-num">04</div><div className="topic-title">A DONDE ROTA EL CAPITAL INSTITUCIONAL</div><div className="topic-desc">Entende como aprovechar esta oportunidad.</div></div>
      <div className="topic-card"><div className="topic-num">05</div><div className="topic-title">LA OPORTUNIDAD HISTORICA EN LATINOAMERICA</div><div className="topic-desc">Activos que van a multiplicar su valor en los proximos años.</div></div>
    </div>
  </div>
  {/* Grid desktop */}
  <div className="container">
    <div className="topics-grid">
      <div className="topic-card fade">
        <div className="topic-num">01</div>
        <div className="topic-title" id="topic1-title" style={{fontSize: '9px'}}>POR QUE EL S&amp;P500 ES UNA TRAMPA SILENCIOSA</div>
        <div className="topic-desc" id="topic1-desc">El indice americano no es tan diversificado como parece.</div>
      </div>
      <div className="topic-card fade d1">
        <div className="topic-num">02</div>
        <div className="topic-title" id="topic2-title" style={{fontSize: '9px'}}>COMO DETECTAR EL TECHO DE UN MERCADO</div>
        <div className="topic-desc" id="topic2-desc">Las señales de cada gran crisis de los últimos 50 años se repiten hoy.</div>
      </div>
      <div className="topic-card fade d2">
        <div className="topic-num">03</div>
        <div className="topic-title" id="topic3-title" style={{fontSize: '9px'}}>EL CICLO ECONOMICO DEL DOLAR DEBIL</div>
        <div className="topic-desc" id="topic3-desc">Porque tener dolares es la peor decisión ahora.</div>
      </div>
      <div className="topic-card fade d3">
        <div className="topic-num">04</div>
        <div className="topic-title" id="topic4-title" style={{fontSize: '9px'}}>A DONDE ROTA EL CAPITAL INSTITUCIONAL</div>
        <div className="topic-desc" id="topic4-desc">Entende como aprovechar esta oportunidad.</div>
      </div>
      <div className="topic-card fade">
        <div className="topic-num">05</div>
        <div className="topic-title" id="topic5-title" style={{fontSize: '9px'}}>LA OPORTUNIDAD HISTORICA EN LATINOAMERICA</div>
        <div className="topic-desc" id="topic5-desc">Activos que van a multiplicar su valor en los proximos años.</div>
      </div>
    </div>
  </div>
</section>

</div>{/* end video-topics-wrapper */}

{/* CREDENCIALES */}
<section data-block="creds" style={{paddingTop: '0px', paddingBottom: '35px'}}>
  <div className="container">
    <div className="sec-header fade">
      <img src="https://assets.cdn.filesafe.space/52BA1ANBkC1zh16RV6WV/media/69e2c5cdaa2fdcccf64c3d65.png" alt="Ruarte Reports" style={{height: '85px', width: 'auto', marginBottom: '16px'}}  />
      <h2 id="creds-h2" style={{fontSize: '25px'}}>Nuestros fundamentos son respaldados por historial real</h2>
      <p>Somos la firma de análisis técnico con<br className="mobile-br2" /> más trayectoria de Latinoamérica.</p>
    </div>

    <div className="creds-grid">
      <div className="cred-num-card fade">
        <div className="cred-big">+40</div>
        <div className="cred-desc">Años de trayectoria operando mercados reales</div>
      </div>
      <div className="cred-num-card fade d1">
        <div className="cred-big">+1K</div>
        <div className="cred-desc">Inversores formados en toda Latinoamérica</div>
      </div>
      <div className="cred-num-card fade d2">
        <div className="cred-big">+1B</div>
        <div className="cred-desc">En fondos gestionados</div>
      </div>
      <div className="cred-num-card fade d3">
        <div className="cred-big">+10</div>
        <div className="cred-desc">Aciertos históricos documentados</div>
      </div>
    </div>

    <div className="cred-intro fade">
      <div className="cred-photos-row">
        <div className="cred-photo-wrap">
          <img src="https://assets.cdn.filesafe.space/52BA1ANBkC1zh16RV6WV/media/69e2c5cdc87cb8c801853e2f.png" alt="Roberto Ruarte"  />
        </div>
        <div className="cred-photo-wrap">
          <img src="https://assets.cdn.filesafe.space/52BA1ANBkC1zh16RV6WV/media/69e2c5cd8696a78b8dbff264.png" alt="Roberto Ruarte Jr."  />
        </div>
      </div>
      <ul className="cred-list">
        <li><span className="dot"></span><div id="cred-item1">Metodología basada en <strong>Ondas de Elliott</strong> y <b><span style={{color: 'rgb(255, 255, 255)'}}>Ciclos Económicos de Mercado</span></b></div></li>
        <li><span className="dot"></span><div id="cred-item2"><b><span style={{color: 'rgb(255, 255, 255)'}}>Assets Consultor</span></b> del Fondo Toronto Trust — <b>Top 4</b> fondos más rentables de Argentina</div></li>
        <li><span className="dot"></span><div id="cred-item3"><b><span style={{color: 'rgb(255, 255, 255)'}}>Roberto A. Ruarte</span></b> — Dr. Honoris Causa. Precursor del AT en LATAM</div></li>
        <li><span className="dot"></span><div id="cred-item4"><b><span style={{color: 'rgb(255, 255, 255)'}}>Gestión de Patrimonios</span></b> en Argentina, México, Colombia, Perú y EE.UU.</div></li>
      </ul>
    </div>

    <div className="track-carousel-wrap fade">
      <div className="track-track" id="trackTrack">
        <div className="track-card">
          <div className="track-year">1987 — Crash de Wall Street</div>
          <p>Anticipamos el mayor desplome en un solo día de la historia. <strong>El mercado cayó 22% en horas.</strong></p>
        </div>
        <div className="track-card">
          <div className="track-year">1997 — Crisis Asiática</div>
          <p>Identificamos el contagio antes de que llegara a LATAM. <strong>Clientes posicionados a tiempo.</strong></p>
        </div>
        <div className="track-card">
          <div className="track-year">2000 — Burbuja Punto Com</div>
          <p>Alertamos el techo del Nasdaq meses antes. <strong>El índice cayó más del 75%.</strong></p>
        </div>
        <div className="track-card">
          <div className="track-year">2001 — Crisis Argentina</div>
          <p>Anunciamos en Crónica TV el <strong>piso del mercado</strong> cuando todos hablaban de colapso.</p>
        </div>
        <div className="track-card">
          <div className="track-year">2008 — Crisis Subprime</div>
          <p>Alertamos el quiebre inmobiliario <strong>antes del colapso de Lehman Brothers.</strong></p>
        </div>
        <div className="track-card">
          <div className="track-year">2009 — Fondo de Wall Street</div>
          <p>Publicamos en Ámbito Financiero que <strong>Wall Street tocó piso</strong> en pleno pánico.</p>
        </div>
        <div className="track-card">
          <div className="track-year">2020 — Crash COVID</div>
          <p>Marcamos el piso del S&P500 en marzo. <strong>El índice rebotó +80% desde ese nivel.</strong></p>
        </div>
        <div className="track-card">
          <div className="track-year">2021 — Ciclo Commodities</div>
          <p>Fondo sobre Argentina y commodities. Resultado: <strong>+600% de rendimiento.</strong></p>
        </div>
        <div className="track-card">
          <div className="track-year">2022 — Mercado Bajista</div>
          <p>Anticipamos la caída tech. <strong>El Nasdaq cayó más del 33% ese año.</strong></p>
        </div>
      </div>
    </div>
  </div>
</section>

{/* CTA FINAL */}
<section className="cta-sec" data-block="cta-final" style={{paddingTop: '20px', paddingBottom: '75px'}}>
  <div className="container" style={{textAlign: 'center'}}>
    <div className="sec-header fade">
      <h2 id="cta-final-h2">¿Querés aplicar esto a tu capital?</h2>
      <p id="cta-final-p">Agendá una llamada gratuita con nuestro equipo. Sin compromisos.</p>
    </div>
    <div className="fade" style={{marginTop: '-20px'}}>
      <a href="https://ruartereports.org/calendario-3986" className="btn btn--lg" id="cta-final-btn">
        Agendar mi llamada gratuita <span className="arrow">→</span>
      </a>
    </div>
  </div>
</section>

{/* FOOTER */}
<footer data-block="footer" style={{paddingBottom: '90px'}}>
  <img src="https://assets.cdn.filesafe.space/52BA1ANBkC1zh16RV6WV/media/69e2c5cdaa2fdcccf64c3d65.png" alt="Ruarte Reports" style={{display: 'inline-block'}} />
  <p id="footer-copy" style={{marginTop: '-6px'}}>© 2026 Ruarte Reports. Todos los derechos reservados.</p>
  <p style={{maxWidth: '500px', margin: '9px auto 0'}}>Carácter educativo. No constituye asesoramiento financiero. Resultados pasados no garantizan rendimientos futuros.</p>
</footer>

{/* STICKY */}
<div className="sticky" id="sticky">
  <p><strong>¿Listo para posicionarte?</strong> Agendá tu llamada gratuita con el equipo.</p>
  <a href="https://ruartereports.org/calendario-3986" className="btn" id="sticky-btn">Agendar llamada <span className="arrow">→</span></a>
</div>


    </>
  );
}
