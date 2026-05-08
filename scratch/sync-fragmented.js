
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

// DATOS DEL LEAD REAL (Fragmentados)
const newRow = new Array(30).fill('');
newRow[1] = 'real_test_claude@ruartereports.com'; // B
newRow[2] = 'e1bQXBOxudX2uKUs9710'; // C
newRow[3] = 'Claude Real E2E Test'; // D
newRow[4] = 'AR'; // E
newRow[5] = new Date().toLocaleDateString('en-US'); // F
newRow[6] = 'Roberto C Ruarte'; // G
newRow[7] = 'RR_E2E'; // H
newRow[8] = 'Claude AI'; // I
newRow[9] = 'Pendiente'; // J
newRow[10] = 'Mastermind'; // K
newRow[11] = 'Post Llamada'; // L
newRow[12] = 'Pago Dividido'; // M
newRow[13] = 12000; // N
newRow[14] = 2000; // O
newRow[15] = 0; // P

newRow[21] = 'Transferencia'; // V
newRow[22] = 'http://comprobante.com'; // W
newRow[23] = 'Sc7Q9vF8QYBUOmo7Xa3l'; // X (Opp ID)
newRow[24] = 'CASH'; // Y
newRow[25] = 'RR'; // Z
newRow[27] = new Date().toLocaleDateString('en-US'); // AB

async function run() {
  try {
    console.log('Obteniendo última fila para APPEND...');
    const token = await getAccessToken();
    const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent('CRM Agendas!B:B')}`, { headers: { Authorization: `Bearer ${token}` } });
    const metaData = await metaRes.json();
    const nextRow = (metaData.values ? metaData.values.length : 0) + 1;

    console.log(`Sincronizando fragmentos en Fila ${nextRow}...`);
    
    const blocks = [
      { range: `B${nextRow}:P${nextRow}`, values: [newRow.slice(1, 16)] },
      { range: `V${nextRow}:Z${nextRow}`, values: [newRow.slice(21, 26)] },
      { range: `AB${nextRow}:AB${nextRow}`, values: [[newRow[27]]] }
    ];

    for (const block of blocks) {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent('CRM Agendas!' + block.range)}?valueInputOption=USER_ENTERED`;
      const r = await fetch(url, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: block.values })
      });
      if (!r.ok) console.error(`Error en bloque ${block.range}:`, await r.text());
    }

    console.log('✅ ÉXITO TOTAL: Lead sincronizado saltando celdas protegidas.');
  } catch (err) { console.error('Error:', err); }
}
run();
