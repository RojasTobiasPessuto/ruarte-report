
const crypto = require('crypto');
const fs = require('fs');

// 1. CARGAR CONFIGURACIÓN
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) env[parts[0].trim()] = parts.slice(1).join('=').trim();
});

const sheetId = env['GOOGLE_SHEETS_ID'];
const creds = JSON.parse(env['GOOGLE_SHEETS_CREDENTIALS_JSON']);

// 2. LÓGICA DE AUTH
async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: creds.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };
  const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const signingInput = `${b64(header)}.${b64(payload)}`;
  const signature = crypto.sign('RSA-SHA256', signingInput, creds.private_key).toString('base64url');
  const jwt = `${signingInput}.${signature}`;
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
  });
  const data = await res.json();
  return data.access_token;
}

// 3. DATOS DEL TEST (Simulando el Mapper)
const newRow = new Array(27).fill('');
newRow[0] = 'Cliente';
newRow[1] = 'claude_test@ruartereports.com';
newRow[2] = 'ghl_sim_001';
newRow[3] = 'Claude Test Simulation';
newRow[4] = 'AR';
newRow[5] = new Date().toLocaleDateString('en-US');
newRow[6] = 'Roberto C Ruarte';
newRow[7] = 'RR_Simulation';
newRow[8] = 'Claude AI';
newRow[9] = 'Pendiente';
newRow[10] = 'Mastermind';
newRow[11] = 'Post Llamada';
newRow[23] = 'test_opp_001';

async function run() {
  try {
    console.log('Enviando Lead a Google Sheets...');
    const token = await getAccessToken();
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent('CRM Agendas!A1')}:append?valueInputOption=USER_ENTERED`;
    
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [newRow] }),
    });

    if (res.ok) {
      console.log('✅ ÉXITO: Fila añadida correctamente.');
    } else {
      console.error('Error:', await res.text());
    }
  } catch (err) {
    console.error('Error fatal:', err);
  }
}

run();
