
const fs = require('fs');

// Cargar API Key
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) env[parts[0].trim()] = parts.slice(1).join('=').trim();
});

const GHL_API_KEY = env['HIGHLEVEL_API_KEY'];
const LOCATION_ID = env['HIGHLEVEL_LOCATION_ID'];

async function createInGHL() {
  try {
    console.log('Creando Contacto en HighLevel...');
    
    const contactRes = await fetch('https://services.leadconnectorhq.com/contacts/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GHL_API_KEY}`,
        'Content-Type': 'application/json',
        'Version': '2021-07-02'
      },
      body: JSON.stringify({
        locationId: LOCATION_ID,
        firstName: 'Claude Test',
        lastName: 'Simulation',
        email: 'claude_test@ruartereports.com',
        phone: '+5491122334455'
      })
    });

    const contactData = await contactRes.json();
    if (!contactRes.ok) {
      console.error('Error creando contacto:', contactData);
      return;
    }

    const contactId = contactData.contact.id;
    console.log('✅ Contacto creado ID:', contactId);

    // 2. CREAR OPORTUNIDAD
    console.log('Obteniendo Pipelines...');
    const pipeRes = await fetch(`https://services.leadconnectorhq.com/opportunities/pipelines?locationId=${LOCATION_ID}`, {
      headers: {
        'Authorization': `Bearer ${GHL_API_KEY}`,
        'Version': '2021-07-02'
      }
    });
    const pipes = await pipeRes.json();
    const pipeline = pipes.pipelines[0];

    console.log('Creando Oportunidad...');
    const oppRes = await fetch('https://services.leadconnectorhq.com/opportunities/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GHL_API_KEY}`,
        'Content-Type': 'application/json',
        'Version': '2021-07-02'
      },
      body: JSON.stringify({
        pipelineId: pipeline.id,
        locationId: LOCATION_ID,
        contactId: contactId,
        name: 'Claude Test Simulation',
        status: 'open',
        pipelineStageId: pipeline.stages[0].id
      })
    });

    const oppData = await oppRes.json();
    if (oppRes.ok) {
      console.log('✅ Oportunidad creada con éxito.');
      console.log('ID Oportunidad:', oppData.opportunity.id);
    } else {
      console.error('Error creando oportunidad:', oppData);
    }

  } catch (err) {
    console.error('Error fatal:', err);
  }
}

createInGHL();
