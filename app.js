/* app.js
   Versão PWA + Fluxo de vendas com Web NFC "gatilho" para confirmação.
   Atenção: Web NFC NÃO realiza pagamentos EMV. Aqui usamos o NFC como gatilho/assinatura.
*/

'use strict';

const BASE_URL = 'https://testescard.limbersoftware.com.br'; // ambiente de testes pedido
let token = null;
let lastReservationId = null;

const $ = id => document.getElementById(id);
const logEl = $('console');

function log(...args) {
  console.log(...args);
  const line = '[' + new Date().toLocaleTimeString() + '] ' + args.join(' ');
  if (logEl.innerText === 'Logs aparecerão aqui...') logEl.innerText = '';
  logEl.innerText = line + '\n' + logEl.innerText;
}

/* ----------------- Auth ----------------- */
$('btn-auth').addEventListener('click', async () => {
  const u = $('api-user').value.trim();
  const p = $('api-pass').value.trim();
  if (!u || !p) { log('Informe usuário e senha'); return; }
  log('Autenticando...');
  try {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ username: u, password: p })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(data));
    token = data.accessToken || data.token || data.jwt || null;
    $('token-state').innerText = token ? 'Autenticado' : 'Token não retornado';
    if (token) $('token-state').style.background = '#ecfdf5';
    log('Autenticação OK. Token salvo (use em até 7 dias).', token ? '(token-ok)' : '');
  } catch (err) {
    log('Erro autenticação:', err.message || err);
  }
});

/* ----------------- SKU / Price / Stock ----------------- */
$('btn-consulta-sku').addEventListener('click', () => consultaSKU($('input-sku').value.trim()));
$('btn-get-price').addEventListener('click', () => consultaPreco($('input-sku').value.trim()));
$('btn-get-stock').addEventListener('click', () => consultaEstoque($('input-sku').value.trim(), false));
$('btn-get-stock-agg').addEventListener('click', () => consultaEstoque($('input-sku').value.trim(), true));

async function consultaSKU(sku) {
  if (!sku || !token) { log('SKU ou token ausente'); return; }
  log('Consultando SKU', sku);
  try {
    const res = await fetch(`${BASE_URL}/skus/${encodeURIComponent(sku)}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(data));
    log('SKU:', JSON.stringify(data));
    return data;
  } catch (err) {
    log('Erro consulta SKU:', err.message || err);
  }
}

async function consultaPreco(sku) {
  if (!sku || !token) { log('SKU ou token ausente'); return; }
  log('Consultando preço', sku);
  try {
    const res = await fetch(`${BASE_URL}/prices?sku=${encodeURIComponent(sku)}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(data));
    log('Preço:', JSON.stringify(data));
    return data;
  } catch (err) {
    log('Erro consulta preço:', err.message || err);
  }
}

async function consultaEstoque(sku, agrupado=false) {
  if (!sku || !token) { log('SKU ou token ausente'); return; }
  const path = agrupado ? `/stock/aggregated?sku=${encodeURIComponent(sku)}` : `/stock?sku=${encodeURIComponent(sku)}`;
  log('Consultando estoque', agrupado ? '(agrupado)' : '', sku);
  try {
    const res = await fetch(`${BASE_URL}${path}`, { headers: { Authorization: `Bearer ${token}` }});
    const data = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(data));
    log('Estoque:', JSON.stringify(data));
    return data;
  } catch (err) {
    log('Erro consulta estoque:', err.message || err);
  }
}

/* ----------------- Calendário ----------------- */
$('btn-calendar').addEventListener('click', () => {
  const id = $('input-calendar-id').value.trim();
  consultaCalendario(id || null);
});

async function consultaCalendario(ingressoId=null) {
  if (!token) { log('Token ausente'); return; }
  const path = ingressoId ? `/calendars?ingresso=${encodeURIComponent(ingressoId)}` : '/calendars';
  log('Consultando calendário', ingressoId ? `(ingresso ${ingressoId})` : '(geral)');
  try {
    const res = await fetch(`${BASE_URL}${path}`, { headers: { Authorization: `Bearer ${token}` }});
    const data = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(data));
    log('Calendário:', JSON.stringify(data));
    return data;
  } catch (err) {
    log('Erro calendário:', err.message || err);
  }
}

/* ----------------- Reserva / Confirmação ----------------- */
$('btn-reserve').addEventListener('click', async () => {
  const sku = $('input-sku').value.trim();
  const qty = Number($('input-qty').value || 1);
  if (!sku || !token) { log('SKU/token ausente'); return; }
  log('Criando reserva', sku, qty);
  try {
    const res = await fetch(`${BASE_URL}/reservations`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type':'application/json' },
      body: JSON.stringify({ sku, quantity: qty })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(data));
    lastReservationId = data.id || data.reservationId || data.orderId || null;
    $('input-reservation-id').value = lastReservationId || '';
    log('Reserva criada:', JSON.stringify(data));
  } catch (err) {
    log('Erro reserva:', err.message || err);
  }
});

$('btn-confirm-manual').addEventListener('click', async () => {
  const id = $('input-reservation-id').value.trim() || lastReservationId;
  if (!id || !token) { log('Reservation/Order ID ausente'); return; }
  log('Confirmando pagamento manual para', id);
  try {
    const res = await fetch(`${BASE_URL}/orders/${encodeURIComponent(id)}/confirm-manual`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type':'application/json' },
      body: JSON.stringify({ method: 'manual' })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(data));
    log('Confirmação manual OK:', JSON.stringify(data));
  } catch (err) {
    log('Erro confirmação manual:', err.message || err);
  }
});

$('btn-generate-link').addEventListener('click', async () => {
  const id = $('input-reservation-id').value.trim() || lastReservationId;
  if (!id || !token) { log('Reservation/Order ID ausente'); return; }
  log('Gerando link para', id);
  try {
    const res = await fetch(`${BASE_URL}/payments/link`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type':'application/json' },
      body: JSON.stringify({ orderId: id })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(data));
    log('Link gerado:', JSON.stringify(data));
  } catch (err) {
    log('Erro gerar link:', err.message || err);
  }
});

/* ----------------- NFC Payment (Débito / Crédito) ----------------- */
/* Atenção: Web NFC NÃO processa EMV. Aqui usamos NFC como gatilho/assinatura.
   O fluxo abaixo inicia uma leitura NFC e, quando obtém payload, chama o endpoint
   de confirmação na API de testes. */

async function startNfcAndConfirm(orderId, mode = 'debit') {
  if (!('NDEFReader' in window)) {
    log('Web NFC não disponível neste navegador.');
    alert('NFC não suportado neste navegador. Use Chrome Android com Web NFC habilitado.');
    return;
  }
  if (!orderId || !token) { log('Order ID / token ausente'); return; }

  log(`Aproxime o cartão/dispositivo (modo ${mode}). NFC esperando...`);
  try {
    const ndef = new NDEFReader();
    await ndef.scan();

    ndef.onreading = async (event) => {
      try {
        log('NFC detectado. Lendo registros...');
        const records = [...event.message.records].map(r => ({
          recordType: r.recordType,
          mediaType: r.mediaType,
          data: readNdefRecordPayload(r)
        }));
        log('NFC records:', JSON.stringify(records));
        // Aqui tratamos o payload como prova de aproximação.
        // Chamamos a API para confirmar pagamento via "adquirente" de teste.
        const confirmPath = `${BASE_URL}/orders/${encodeURIComponent(orderId)}/confirm-acquirer`;
        log('Chamando confirmação adquirente (teste):', confirmPath);
        const res = await fetch(confirmPath, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode, nfc_payload: records })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(JSON.stringify(data));
        log('Confirmação via adquirente (simulada) OK:', JSON.stringify(data));
        alert('Pagamento confirmado (simulado)!');
      } catch (err) {
        log('Erro no processamento NFC:', err.message || err);
        alert('Erro ao processar NFC: ' + (err.message || err));
      } finally {
        try { ndef.onreading = null; } catch(e){/**/}
      }
    };

    ndef.onreadingerror = () => {
      log('Erro ao ler tag NFC.');
      alert('Erro ao ler tag NFC.');
    };
  } catch (err) {
    log('Falha ao iniciar leitura NFC:', err.message || err);
    alert('Não foi possível iniciar leitura NFC: ' + (err.message || err));
  }
}

function readNdefRecordPayload(record) {
  // tente extrair como texto ou como bytes hex
  try {
    if (record.recordType === 'text') {
      const textDecoder = new TextDecoder(record.encoding || 'utf-8');
      return textDecoder.decode(record.data);
    }
  } catch (err) {}
  try {
    // se data for um DataView / ArrayBuffer
    if (record.data instanceof ArrayBuffer) {
      const arr = new Uint8Array(record.data);
      return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
    }
  } catch (err) {}
  return '<unparsed>';
}

$('btn-pay-debit').addEventListener('click', () => {
  const id = $('input-reservation-id').value.trim() || lastReservationId;
  if (!id) { log('Reservation/Order ID ausente'); return; }
  startNfcAndConfirm(id, 'debit');
});
$('btn-pay-credit').addEventListener('click', () => {
  const id = $('input-reservation-id').value.trim() || lastReservationId;
  if (!id) { log('Reservation/Order ID ausente'); return; }
  startNfcAndConfirm(id, 'credit');
});

/* ----------------- Remarca / Cancelamentos ----------------- */
$('btn-remark').addEventListener('click', async () => {
  const id = $('input-reservation-id').value.trim();
  const newDate = prompt('Nova data (ISO):', new Date().toISOString());
  if (!id || !newDate || !token) { log('ID/data/token ausente'); return; }
  log('Remarcando', id, '->', newDate);
  try {
    const res = await fetch(`${BASE_URL}/reservations/${encodeURIComponent(id)}/reschedule`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type':'application/json' },
      body: JSON.stringify({ newDate })
    });
    const data = await res.json(); if (!res.ok) throw new Error(JSON.stringify(data));
    log('Remarcado:', JSON.stringify(data));
  } catch (err) { log('Erro remarcação:', err.message || err); }
});

$('btn-request-cancel').addEventListener('click', async () => {
  const id = $('input-reservation-id').value.trim();
  if (!id || !token) { log('ID/token ausente'); return; }
  log('Solicitando cancelamento', id);
  try {
    const res = await fetch(`${BASE_URL}/orders/${encodeURIComponent(id)}/request-cancel`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type':'application/json' }
    });
    const data = await res.json(); if (!res.ok) throw new Error(JSON.stringify(data));
    log('Pedido de cancelamento registrado:', JSON.stringify(data));
  } catch (err) { log('Erro pedido cancelamento:', err.message || err); }
});

$('btn-cancel-manual').addEventListener('click', async () => {
  const id = $('input-reservation-id').value.trim();
  if (!id || !token) { log('ID/token ausente'); return; }
  log('Cancelamento manual', id);
  try {
    const res = await fetch(`${BASE_URL}/orders/${encodeURIComponent(id)}/cancel-manual`, { method:'POST', headers:{ Authorization:`Bearer ${token}` }});
    const data = await res.json(); if (!res.ok) throw new Error(JSON.stringify(data));
    log('Cancelamento manual OK:', JSON.stringify(data));
  } catch (err) { log('Erro cancelamento manual:', err.message || err); }
});

$('btn-cancel-acquirer').addEventListener('click', async () => {
  const id = $('input-reservation-id').value.trim();
  if (!id || !token) { log('ID/token ausente'); return; }
  log('Solicitando cancelamento na adquirente para', id);
  try {
    const res = await fetch(`${BASE_URL}/orders/${encodeURIComponent(id)}/cancel-acquirer`, { method:'POST', headers:{ Authorization:`Bearer ${token}` }});
    const data = await res.json(); if (!res.ok) throw new Error(JSON.stringify(data));
    log('Cancelamento na adquirente solicitado:', JSON.stringify(data));
  } catch (err) { log('Erro cancelamento adquirente:', err.message || err); }
});

$('btn-check-acquirer').addEventListener('click', async () => {
  const acqId = prompt('Informe id/identificador na adquirente para checar:');
  if (!acqId || !token) { log('acquirerId/token ausente'); return; }
  log('Verificando status na adquirente', acqId);
  try {
    const res = await fetch(`${BASE_URL}/acquirer/cancel-status?acquirerId=${encodeURIComponent(acqId)}`, { headers:{ Authorization:`Bearer ${token}` }});
    const data = await res.json(); if (!res.ok) throw new Error(JSON.stringify(data));
    log('Status adquirente:', JSON.stringify(data));
  } catch (err) { log('Erro verificar adquirente:', err.message || err); }
});

/* Small helpers for buttons on top (UI only) */
['btn-realizar','btn-simplificada','btn-leitura','btn-reimprimir','btn-consultar','btn-aproximar']
.forEach(id => { const el = document.getElementById(id); if (el) el.addEventListener('click', () => alert(`Ação: ${el.innerText}`)); });

/* ----------------- Service Worker registration (PWA) ----------------- */
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js').then(() => {
    log('Service worker registrado.');
  }).catch(e => log('Erro registrar SW:', e));
}

/* Optional: prompt to install (Install prompt) */
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  log('PWA instalável: vá ao menu do navegador e escolha Instalar (ou chame deferredPrompt.prompt()).');
  // You could create a UI button to call deferredPrompt.prompt()
});
