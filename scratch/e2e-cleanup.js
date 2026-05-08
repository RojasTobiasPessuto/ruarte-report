
const fs = require('fs');
const crypto = require('crypto');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) env[parts[0].trim()] = parts.slice(1).join('=').trim();
});

const GHL_TOKEN = env['HIGHLEVEL_API_KEY'];
const sheetId = env['GOOGLE_SHEETS_ID'];
const creds = JSON.parse(env['GOOGLE_SHEETS_CREDENTIALS_JSON']);

async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = { iss: creds.client_email, scope: 'https://www.googleapis.com/auth/spreadsheets', aud: 'https://oauth2.googleapis.com/token', exp: now + 3600, iat: now };
  const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const signingInput = `${b64(header)}.${b64(payload)}`;
  const signature = crypto.sign('RSA-SHA256', signingInput, creds.private_key).toString('base64url');
  const jwt = `${signingInput}.${signature}`;
  const res = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }) });
  const data = await res.json();
  return data.access_token;
}

async function cleanEverything() {
  // 1. BORRAR EN GHL
  console.log('Borrando contacto en GHL...');
  const contactId = 'e1bQXBOxudX2uKUs9710';
  await fetch(`https://services.leadconnectorhq.com/contacts/${contactId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${GHL_TOKEN}`, 'Version': '2021-07-28' }
  });

  // 2. BORRAR EN SHEETS
  console.log('Borrando filas en Google Sheets...');
  const token = await getAccessToken();
  const ranges = ['CRM Agendas!A1160:AB1162'];
  for (const range of ranges) {
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}:clear`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
  }
  console.log('✅ LIMPIEZA COMPLETADA.');
}

cleanEverything();
