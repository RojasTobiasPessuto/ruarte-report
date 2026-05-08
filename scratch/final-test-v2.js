
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

function getRow(nroCuota, revenue, monto) {
  const row = new Array(30).fill('');
  row[1] = 'real_test_claude@ruartereports.com'; // B
  row[2] = nroCuota === 1 ? 'e1bQXBOxudX2uKUs9710' : 'Pago Dividido'; // C
  row[3] = 'Claude Real E2E Test'; // D
  row[4] = 'AR'; // E
  row[5] = '12/04/2025'; // F
  row[6] = 'Roberto C Ruarte'; // G
  row[7] = 'RR_E2E'; // H
  row[8] = 'Claude AI'; // I
  row[9] = 'Asistido'; // J
  row[10] = 'Mastermind'; // K
  row[11] = 'Adentro en Seguimiento'; // L
  row[12] = 'Pago Dividido'; // M
  row[13] = nroCuota === 1 ? revenue : 0; // N
  row[14] = monto; // O
  row[15] = 0; // P
  row[21] = 'Pago Dividido'; // V
  row[22] = 'http://comprobante.com'; // W
  row[23] = 'Sc7Q9vF8QYBUOmo7Xa3l'; // X
  row[24] = 'CASH'; // Y
  row[25] = 'RR'; // Z
  row[27] = '12/10/2025'; // AB
  return row;
}

async function run() {
  const token = await getAccessToken();
  const startRow = 1160;
  const rows = [getRow(1, 12000, 4000), getRow(2, 12000, 4000), getRow(3, 12000, 4000)];

  for (let i = 0; i < rows.length; i++) {
    const nextR = startRow + i;
    console.log(`Sincronizando Fila ${nextR}...`);
    const blocks = [
      { range: `B${nextR}:P${nextR}`, values: [rows[i].slice(1, 16)] },
      { range: `V${nextR}:Z${nextR}`, values: [rows[i].slice(21, 26)] },
      { range: `AB${nextR}:AB${nextR}`, values: [[rows[i][27]]] }
    ];

    for (const b of blocks) {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent('CRM Agendas!' + b.range)}?valueInputOption=USER_ENTERED`;
      await fetch(url, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: b.values })
      });
    }
  }
  console.log('✅ TEST FINALIZADO. REVISÁ LA SHEET FILAS 1160-1162.');
}
run();
