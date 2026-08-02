export function createYournotifyClient({ apiKey, apiUrl = "https://api.yournotify.com/", timeout = 30000, maxRetries = 2 } = {}) {
  if (!apiKey || !String(apiKey).trim()) throw new Error('Yournotify API key is required.');
  const base = String(apiUrl).replace(/\/+$/, '') + '/';
  async function request(endpoint, method = 'GET', data = undefined) {
    const upperMethod = String(method).toUpperCase();
    let url = base + String(endpoint).replace(/^\//, '');
    const headers = { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' };
    const idempotency = data?.idempotency_key || data?.event_id;
    const retryable = ['GET','HEAD','PUT','DELETE'].includes(upperMethod) || Boolean(idempotency) || endpoint === 'sdk/events/batch';
    if (idempotency) headers['Idempotency-Key'] = String(idempotency);
    const options = { method: upperMethod, headers, cache: 'no-store' };
    if (upperMethod === 'GET' && data && Object.keys(data).length) {
      const qs = new URLSearchParams(Object.entries(data).filter(([,v]) => v != null).map(([k,v]) => [k, String(v)])).toString();
      if (qs) url += (url.includes('?') ? '&' : '?') + qs;
    } else if (data !== undefined) {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(data);
    }
    for (let attempt=0;;attempt++) {
      const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), timeout); options.signal = controller.signal;
      try {
        const res = await fetch(url, options); const body = await res.json().catch(() => ({}));
        if (res.ok) return body;
        if (!retryable || attempt >= maxRetries || (res.status !== 429 && res.status < 500)) { const error=new Error(body?.message || `Yournotify API request failed with status ${res.status}.`); error.status=res.status; error.body=body; throw error; }
        const retryAfter=Number(res.headers?.get?.('retry-after')); await new Promise((resolve)=>setTimeout(resolve,Number.isFinite(retryAfter)?retryAfter*1000:250*(2**attempt)));
      } catch (error) { if (error?.status || !retryable || attempt >= maxRetries) throw error; await new Promise((resolve)=>setTimeout(resolve,250*(2**attempt))); }
      finally { clearTimeout(timer); }
    }
  }
  const normalizeList = (value, key) => value == null ? [] : (Array.isArray(value) ? value : [value]).map((item) => typeof item === 'string' ? { [key]: item } : item);
  const eventId = () => globalThis.crypto?.randomUUID?.() || `evt_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const normalizeEvent = (input = {}) => ({ ...input, event_id: input.event_id || input.idempotency_key || eventId(), occurred_at: input.occurred_at || new Date().toISOString() });
  const createCampaign = (data = {}) => request('campaigns', 'POST', data);
  const client = {
    request,
    validateAuth: () => request('auth/me'),
    createCampaign,
    sendEmail: (name, subject, html, text = '', status = 'draft', from = '', to = []) => createCampaign({ name, subject, html, body: html, text, from, status, channel: 'email', lists: normalizeList(to, 'email') }),
    sendSMS: (name, from, text, status = 'draft', to = []) => createCampaign({ name, from, text, body: text, status, channel: 'sms', lists: normalizeList(to, 'telephone') }),
    sendWhatsApp: (data = {}) => createCampaign({ ...data, channel: 'whatsapp' }),
    sendVoice: (data = {}) => request('campaigns/voice', 'POST', data),
    sendPush: (data = {}) => createCampaign({ ...data, channel: 'push' }),
    sendInApp: (data = {}) => createCampaign({ ...data, channel: 'inapp' }),
    testCampaign: (data = {}) => request('campaigns/test', 'POST', data),
    addContact: (email = null, telephone = null, list = null, name = '', attribs = {}) => request('contacts', 'POST', { email, telephone, lists: list == null ? [] : (Array.isArray(list) ? list : [list]), name, attribs }),
    getContacts: (params = {}) => request('contacts', 'GET', params),
    addList: (title, type = 'public', optin = 'single') => request('lists', 'POST', { name: title, title, type, optin }),
    getList: (id) => request(`lists/${id}`),
    getLists: (params = {}) => request('lists', 'GET', params),
    updateList: (id, data = {}) => request(`lists/${id}`, 'PUT', typeof data === 'string' ? { name: data, title: data } : data),
    deleteList: (id) => request(`lists/${id}`, 'DELETE'),
    exportList: (id, params = {}) => request(`lists/export/${id}`, 'GET', params),
    getCampaigns: (channel, params = {}) => request('campaigns', 'GET', { channel, ...params }),
    getRewards: (params = {}) => request('rewards', 'GET', params),
    createReward: (data = {}) => request('rewards', 'POST', data),
    sendReward: (data = {}) => request('rewards/send', 'POST', data),
    getRewardProducts: (params = {}) => request('rewards/products', 'GET', params),
    getRewardAnalytics: (id) => request(`rewards/${id}/analytics`),
    getRewardSubmissions: (id, params = {}) => request(`rewards/${id}/submissions`, 'GET', params),
    inviteToReward: (id, data = {}) => request(`rewards/${id}/invite`, 'POST', data),
    sendCreatedReward: (id, data = {}) => request(`rewards/${id}/send`, 'POST', data),
    getRewardBulkJob: (id, jobId) => request(`rewards/${id}/bulk-jobs/${jobId}`),
    retryRewardBulkJob: (id, jobId) => request(`rewards/${id}/bulk-jobs/${jobId}/retry`, 'POST', {}),
    bootstrapRewardClaim: (data = {}) => request('rewards/reward', 'POST', data),
    submitRewardClaim: (data = {}) => request('rewards/submit', 'POST', data),
    rewardClaimUrl: (id, params = {}) => { const url = new URL(`reward/${encodeURIComponent(String(id))}`, 'https://web.yournotify.com/'); Object.entries(params).forEach(([key, value]) => { if (value != null && value !== '') url.searchParams.set(key, String(value)); }); return url.toString(); },
    getLoyaltyPrograms: (params = {}) => request('loyalty/programs', 'GET', params),
    createLoyaltyProgram: (data = {}) => request('loyalty/programs', 'POST', data),
    updateLoyaltyProgram: (id, data = {}) => request(`loyalty/programs/${id}`, 'PUT', data),
    getLoyaltyMembers: (id, params = {}) => request(`loyalty/programs/${id}/members`, 'GET', params),
    adjustLoyaltyPoints: (id, data = {}) => request(`loyalty/programs/${id}/points`, 'POST', data),
    trackLoyaltyEvent: (id, data = {}) => request(`loyalty/programs/${id}/events`, 'POST', data),
    redeemLoyaltyReward: (id, data = {}) => request(`loyalty/programs/${id}/redeem`, 'POST', data),
    getReferralPrograms: (params = {}) => request('referrals/programs', 'GET', params),
    createReferralProgram: (data = {}) => request('referrals/programs', 'POST', data),
    updateReferralProgram: (id, data = {}) => request(`referrals/programs/${id}`, 'PUT', data),
    deleteReferralProgram: (id) => request(`referrals/programs/${id}`, 'DELETE'),
    getReferralAdvocates: (id, params = {}) => request(`referrals/programs/${id}/advocates`, 'GET', params),
    addReferralAdvocate: (id, data = {}) => request(`referrals/programs/${id}/advocates`, 'POST', data),
    addReferralAdvocatesFromLists: (id, data = {}) => request(`referrals/programs/${id}/advocates/bulk`, 'POST', data),
    trackReferralEvent: (id, data = {}) => request(`referrals/programs/${id}/events`, 'POST', data),
    getReferralAnalytics: (id, params = {}) => request(`referrals/programs/${id}/analytics`, 'GET', params),
    reviewReferralConversion: (id, conversionId, data = {}) => request(`referrals/programs/${id}/conversions/${conversionId}/review`, 'POST', data),
    getReferralRisk: (id) => request(`referrals/programs/${id}/risk`),
    createAdvocatePortalSession: (id, advocateId) => request(`referrals/programs/${id}/advocates/${advocateId}/portal-session`, 'POST', {}),
    identify: (externalIdOrData = {}, traits = {}) => request('sdk/identify', 'POST', typeof externalIdOrData === 'string' ? { external_id: externalIdOrData, ...traits } : externalIdOrData),
    track: (eventOrData = {}, properties = {}, options = {}) => request('sdk/events', 'POST', normalizeEvent(typeof eventOrData === 'string' ? { event: eventOrData, properties, ...options } : eventOrData)),
    trackBatch: (events = [], options = {}) => request('sdk/events/batch', 'POST', { events: events.map(normalizeEvent), ...options }),
    alias: (data = {}) => request('sdk/alias', 'POST', data),
    getProfile: () => request('auth/me')
  };
  const channel = (name) => ({ send: (data = {}) => name === 'voice' ? request('campaigns/voice', 'POST', data) : createCampaign({ ...data, channel: name }) });
  client.email = channel('email'); client.sms = channel('sms'); client.whatsapp = channel('whatsapp');
  client.voice = { ...channel('voice'), all: (p = {}) => request('voice/campaigns', 'GET', p), get: (id) => request(`voice/campaigns/${id}`), update: (id, d = {}) => request(`voice/campaigns/${id}`, 'PUT', d), delete: (id) => request(`voice/campaigns/${id}`, 'DELETE'), analytics: (id, p = {}) => request(`voice/campaigns/${id}/analytics`, 'GET', p) };
  client.push = channel('push'); client.inapp = channel('inapp');
  client.contact = { create: (d = {}) => request('contacts', 'POST', d), all: (p = {}) => request('contacts', 'GET', p), get: (id) => request(`contacts/${id}`), update: (id, d = {}) => request(`contacts/${id}`, 'PUT', d), delete: (id) => request(`contacts/${id}`, 'DELETE'), validate: (d = {}) => request('contacts/validate', 'POST', d), summary: (p = {}) => request('contacts/summary', 'GET', typeof p === 'object' ? p : { external_id: p }), createSession: (d = {}) => request('contacts/session', 'POST', d), identify: client.identify, alias: client.alias };
  client.contacts = client.contact;
  client.lists = { create: (d = {}) => request('lists', 'POST', d), all: client.getLists, get: client.getList, update: client.updateList, delete: client.deleteList, export: client.exportList, retryImport: (id) => request(`lists/${id}/import/requeue`, 'POST', {}) };
  client.campaigns = { create: client.createCampaign, all: (p = {}) => request('campaigns', 'GET', p), get: (id) => request(`campaigns/${id}`), update: (id, d = {}) => request(`campaigns/${id}`, 'PUT', d), delete: (id) => request(`campaigns/${id}`, 'DELETE'), test: client.testCampaign };
  client.rewards = { all: client.getRewards, get: (id) => request(`rewards/${id}`), create: client.createReward, update: (id, d = {}) => request(`rewards/${id}`, 'PUT', d), delete: (id) => request(`rewards/${id}`, 'DELETE'), issue: client.sendReward, products: client.getRewardProducts, analytics: client.getRewardAnalytics, submissions: client.getRewardSubmissions };
  client.loyalty = { programs: { all: client.getLoyaltyPrograms, create: client.createLoyaltyProgram, update: client.updateLoyaltyProgram }, members: client.getLoyaltyMembers, adjust: client.adjustLoyaltyPoints, track: client.trackLoyaltyEvent, redeem: client.redeemLoyaltyReward };
  client.referrals = { programs: { all: client.getReferralPrograms, create: client.createReferralProgram, update: client.updateReferralProgram, delete: client.deleteReferralProgram }, advocates: client.getReferralAdvocates, addAdvocate: client.addReferralAdvocate, track: client.trackReferralEvent, analytics: client.getReferralAnalytics };
  client.automations = { identify: client.identify, track: client.track, trackBatch: client.trackBatch, alias: client.alias };
  return client;
}
export async function verifyYournotifyWebhook({ payload, signature, timestamp, secret, tolerance = 300 }) {
  const parts = Object.fromEntries(String(signature || '').split(',').map((part) => part.split('=', 2)).filter((part) => part.length === 2));
  timestamp = timestamp || parts.t; signature = parts.v1 || signature;
  if (!signature || !timestamp || !secret || Math.abs(Date.now() / 1000 - Number(timestamp)) > tolerance) return false;
  const bytes = new TextEncoder().encode(`${timestamp}.${typeof payload === 'string' ? payload : JSON.stringify(payload)}`);
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const digest = [...new Uint8Array(await crypto.subtle.sign('HMAC', key, bytes))].map((value) => value.toString(16).padStart(2, '0')).join('');
  return digest === String(signature).replace(/^sha256=/i, '');
}
