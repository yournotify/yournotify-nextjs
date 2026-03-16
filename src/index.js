export function createYournotifyClient({ apiKey, apiUrl = "https://api.yournotify.com/" } = {}) {
  const base = String(apiUrl).replace(/\/?$/, '/');
  async function request(endpoint, method = 'GET', data = undefined) {
    let url = base + String(endpoint).replace(/^\//, '');
    const headers = { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' };
    const options = { method, headers, cache: 'no-store' };
    if (method === 'GET' && data && Object.keys(data).length) {
      const qs = new URLSearchParams(Object.entries(data).filter(([,v]) => v != null).map(([k,v]) => [k, String(v)])).toString();
      if (qs) url += (url.includes('?') ? '&' : '?') + qs;
    } else if (data !== undefined) {
      options.body = JSON.stringify(data);
    }
    const res = await fetch(url, options);
    return res.json();
  }
  return {
    request,
    sendEmail: (name, subject, html, text = '', status = 'draft', from = '', to = []) => request('campaigns/email', 'POST', { name, subject, html, body: html, text, from, from_email: from, status, channel: 'email', lists: to }),
    sendSMS: (name, from, text, status = 'draft', to = []) => request('campaigns/sms', 'POST', { name, from, sender: from, text, body: text, status, channel: 'sms', lists: to }),
    addContact: (email = null, telephone = null, list = null, name = '', attribs = {}) => request('contacts', 'POST', { email, telephone, lists: list == null ? [] : (Array.isArray(list) ? list : [list]), name, attribs }),
    getContacts: (params = {}) => request('contacts', 'GET', params),
    addList: (title, type = 'public', optin = 'single') => request('lists', 'POST', { name: title, title, type, optin }),
    getCampaigns: (channel, params = {}) => request('campaigns', 'GET', { channel, ...params }),
    getProfile: () => request('account/profile')
  };
}
export function verifyYournotifyWebhook(headers, expectedToken) { return headers.get('x-yournotify-token') === expectedToken; }
