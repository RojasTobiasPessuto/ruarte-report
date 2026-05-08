
const fs = require('fs');

// Cargar variables
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) env[parts[0].trim()] = parts.slice(1).join('=').trim();
});

const GHL_TOKEN = env['HIGHLEVEL_API_KEY'];
const LOCATION_ID = env['HIGHLEVEL_LOCATION_ID'];
const VERSION = '2021-07-28';

async function e2eTest() {
  try {
    console.log('--- INICIANDO TEST E2E ---');
    
    // 1. CREAR CONTACTO
    console.log('1. Creando contacto en GHL...');
    const contactRes = await fetch('https://services.leadconnectorhq.com/contacts/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GHL_TOKEN}`,
        'Content-Type': 'application/json',
        'Version': VERSION
      },
      body: JSON.stringify({
        locationId: LOCATION_ID,
        firstName: 'Claude E2E',
        lastName: 'Test',
        email: 'claude_e2e@ruartereports.com',
        phone: '+5491100000000'
      })
    });
    const contactData = await contactRes.json();
    if (!contactRes.ok) throw new Error('Error Contacto: ' + JSON.stringify(contactData));
    const contactId = contactData.contact.id;
    console.log('✅ Contacto creado:', contactId);

    // 2. CREAR OPORTUNIDAD (Simula Agenda)
    console.log('2. Creando oportunidad (Agenda)...');
    const oppRes = await fetch('https://services.leadconnectorhq.com/opportunities/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GHL_TOKEN}`,
        'Content-Type': 'application/json',
        'Version': VERSION
      },
      body: JSON.stringify({
        locationId: LOCATION_ID,
        contactId: contactId,
        pipelineId: 'P6LRnutPF60CchJsrHn1', // Tomado de src/lib/ghl.ts
        pipelineStageId: '79487648-2abb-43e3-a33c-47e2d71a2b05', // Agendado Nuevo
        name: 'Claude E2E Test - Agenda',
        status: 'open'
      })
    });
    const oppData = await oppRes.json();
    if (!oppRes.ok) throw new Error('Error Oportunidad: ' + JSON.stringify(oppData));
    const opportunityId = oppData.opportunity.id;
    console.log('✅ Oportunidad creada:', opportunityId);

    console.log('\n--- PASO 1 COMPLETADO ---');
    console.log('Ahora el webhook debería disparar la creación en la Sheet.');
    console.log('ID para seguimiento:', opportunityId);

  } catch (err) {
    console.error('❌ FALLO EL TEST:', err.message);
  }
}

e2eTest();
