
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

async function cleanAll() {
  const token = await getAccessToken();
  const ranges = ['CRM Agendas!A1159:AB1159', 'CRM Agendas!A1162:AB1162'];
  
  for (const range of ranges) {
    console.log(`Limpiando ${range}...`);
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}:clear`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
  }
  console.log('✅ Hoja limpia.');
}

cleanAll();
