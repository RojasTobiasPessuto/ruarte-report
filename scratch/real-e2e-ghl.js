
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) env[parts[0].trim()] = parts.slice(1).join('=').trim();
});

const GHL_TOKEN = env['HIGHLEVEL_API_KEY'];
const LOCATION_ID = env['HIGHLEVEL_LOCATION_ID'];
const VERSION = '2021-07-28';

async function run() {
  try {
    console.log('1. Creando contacto Claude Real E2E...');
    const cRes = await fetch('https://services.leadconnectorhq.com/contacts/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GHL_TOKEN}`,
        'Content-Type': 'application/json',
        'Version': VERSION
      },
      body: JSON.stringify({
        locationId: LOCATION_ID,
        firstName: 'Claude Real',
        lastName: 'E2E Test',
        email: 'real_test_claude@ruartereports.com',
        phone: '+5491100000000'
      })
    });
    
    const cData = await cRes.json();
    if (!cRes.ok) throw new Error('Error Contacto: ' + JSON.stringify(cData));
    const contactId = cData.contact.id;
    console.log('✅ Contacto creado:', contactId);

    console.log('2. Obteniendo Pipeline...');
    const pRes = await fetch(`https://services.leadconnectorhq.com/opportunities/pipelines?locationId=${LOCATION_ID}`, {
      headers: { 'Authorization': `Bearer ${GHL_TOKEN}`, 'Version': VERSION }
    });
    const pData = await pRes.json();
    const pipeline = pData.pipelines[0];

    console.log('3. Creando Oportunidad (Agenda)...');
    const oRes = await fetch('https://services.leadconnectorhq.com/opportunities/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GHL_TOKEN}`,
        'Content-Type': 'application/json',
        'Version': VERSION
      },
      body: JSON.stringify({
        locationId: LOCATION_ID,
        contactId: contactId,
        pipelineId: pipeline.id,
        pipelineStageId: pipeline.stages[0].id,
        name: 'Claude Real Test Agenda',
        status: 'open'
      })
    });
    
    const oData = await oRes.json();
    if (oRes.ok) {
      console.log('✅ Oportunidad creada con éxito:', oData.opportunity.id);
      console.log('\n--- PASO 1 EXITOSO ---');
      console.log('Verificá tu HighLevel y el Google Sheet de Pruebas.');
    } else {
      console.error('Error Opp:', oData);
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

run();
