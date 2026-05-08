
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) env[parts[0].trim()] = parts.slice(1).join('=').trim();
});

const GHL_TOKEN = env['HIGHLEVEL_API_KEY']; // pit-f9f1c7b7...
const LOCATION_ID = env['HIGHLEVEL_LOCATION_ID'];

async function createGHL() {
  console.log('1. Creando contacto...');
  const contactRes = await fetch('https://services.leadconnectorhq.com/contacts/', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GHL_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      locationId: LOCATION_ID,
      firstName: 'Claude E2E',
      lastName: 'Test',
      email: 'claude_e2e@ruartereports.com'
    })
  });
  
  const contactData = await contactRes.json();
  if (!contactRes.ok) {
    console.error('Error:', contactData);
    return;
  }
  const contactId = contactData.contact.id;
  console.log('✅ Contacto creado:', contactId);

  // Crear Oportunidad
  console.log('2. Creando oportunidad...');
  const oppRes = await fetch('https://services.leadconnectorhq.com/opportunities/', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GHL_TOKEN}`,
      'Content-Type': 'application/json',
      'Version': '2021-04-15'
    },
    body: JSON.stringify({
      locationId: LOCATION_ID,
      contactId: contactId,
      pipelineId: 'P6LRnutPF60CchJsrHn1',
      pipelineStageId: '79487648-2abb-43e3-a33c-47e2d71a2b05',
      name: 'Claude E2E Test',
      status: 'open'
    })
  });
  const oppData = await oppRes.json();
  if (oppRes.ok) {
    console.log('✅ Oportunidad creada:', oppData.opportunity.id);
  } else {
    console.error('Error Opp:', oppData);
  }
}

createGHL();
