
const crypto = require('crypto');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) env[parts[0].trim()] = parts.slice(1).join('=').trim();
});

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

async function cleanAndVerify() {
  const token = await getAccessToken();
  const rows = [1159, 1160, 1161, 1162];
  
  console.log('1. Iniciando borrado quirúrgico de celdas permitidas...');
  for (const row of rows) {
    const blocks = [
      `B${row}:P${row}`,
      `V${row}:Z${row}`,
      `AB${row}:AB${row}`
    ];
    for (const range of blocks) {
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent('CRM Agendas!' + range)}:clear`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
    }
  }

  console.log('2. VALIDANDO BORRADO...');
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent('CRM Agendas!B1159:D1162')}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  
  if (!data.values || data.values.length === 0 || data.values.every(r => r.length === 0)) {
    console.log('✅ VALIDACIÓN EXITOSA: Las celdas están vacías.');
  } else {
    console.error('❌ FALLO: Todavía hay datos en la hoja:', data.values);
  }
}

cleanAndVerify();
