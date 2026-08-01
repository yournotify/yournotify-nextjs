export function createYournotifyClient({ apiKey, apiUrl = "https://api.yournotify.com/" } = {}) {
  if (!apiKey || !String(apiKey).trim()) throw new Error('Yournotify API key is required.');
  const base = String(apiUrl).replace(/\/+$/, '') + '/';
  async function request(endpoint, method = 'GET', data = undefined) {
    const upperMethod = String(method).toUpperCase();
    let url = base + String(endpoint).replace(/^\//, '');
    const headers = { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' };
    const options = { method: upperMethod, headers, cache: 'no-store' };
    if (upperMethod === 'GET' && data && Object.keys(data).length) {
      const qs = new URLSearchParams(Object.entries(data).filter(([,v]) => v != null).map(([k,v]) => [k, String(v)])).toString();
      if (qs) url += (url.includes('?') ? '&' : '?') + qs;
    } else if (data !== undefined) {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(data);
    }
    const res = await fetch(url, options);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body?.message || `Yournotify API request failed with status ${res.status}.`);
    return body;
  }
  const normalizeList = (value, key) => value == null ? [] : (Array.isArray(value) ? value : [value]).map((item) => typeof item === 'string' ? { [key]: item } : item);
  const createCampaign = (data = {}) => request('campaigns', 'POST', data);
  return {
    request,
    validateAuth: () => request('auth/me'),
    createCampaign,
    sendEmail: (name, subject, html, text = '', status = 'draft', from = '', to = []) => createCampaign({ name, subject, html, body: html, text, from, from_email: from, status, channel: 'email', lists: normalizeList(to, 'email') }),
    sendSMS: (name, from, text, status = 'draft', to = []) => createCampaign({ name, from, sender: from, text, body: text, status, channel: 'sms', lists: normalizeList(to, 'telephone') }),
    sendWhatsApp: (data = {}) => createCampaign({ ...data, channel: 'whatsapp' }),
    sendPush: (data = {}) => createCampaign({ ...data, channel: 'push' }),
    sendInApp: (data = {}) => createCampaign({ ...data, channel: 'inapp' }),
    testCampaign: (data = {}) => request('campaigns/test', 'POST', data),
    addContact: (email = null, telephone = null, list = null, name = '', attribs = {}) => request('contacts', 'POST', { email, telephone, lists: list == null ? [] : (Array.isArray(list) ? list : [list]), name, attribs }),
    getContacts: (params = {}) => request('contacts', 'GET', params),
    addList: (title, type = 'public', optin = 'single') => request('lists', 'POST', { name: title, title, type, optin }),
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
    identify: (data = {}) => request('automations/identify', 'POST', data),
    track: (data = {}) => request('automations/events', 'POST', data),
    getProfile: () => request('auth/me')
  };
}
export function verifyYournotifyWebhook(headers, expectedToken) { return headers.get('x-yournotify-token') === expectedToken; }
