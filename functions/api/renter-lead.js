// Renter inquiries use their own Aptly board and the existing server-side token.
// Set APTLY_RENTER_LEADS_BOARD_ID in Cloudflare Pages to override this default.
const BASE = 'https://core-api.getaptly.com';
const DEFAULT_RENTER_LEADS_BOARD_ID = 'aQDRkkWKwfKnNXS8R';
const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
});
const norm = value => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');

export function validateRenterLead(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw Error('Please check the form fields.');
  const limits = { name: 120, email: 254, phone: 30, moveTiming: 80, propertyInterest: 300, listingId: 80, message: 2000, pageTitle: 200, pageUrl: 500, website: 200 };
  const out = {};
  for (const [key, limit] of Object.entries(limits)) {
    if (data[key] != null && typeof data[key] !== 'string') throw Error('Please check the form fields.');
    out[key] = (data[key] || '').trim();
    if (out[key].length > limit) throw Error('One of the form fields is too long.');
  }
  if (!out.name || !/^\S+@\S+\.\S+$/.test(out.email)) throw Error('Please include your name and a valid email.');
  if (out.phone && !/^[+\d\s().-]{7,30}$/.test(out.phone)) throw Error('Please enter a valid phone number.');
  return out;
}

export function resolveRenterFields(schema, config = {}) {
  const fields = Array.isArray(schema) ? schema : schema?.data;
  if (!Array.isArray(fields)) throw Error('schema');
  const pick = (labels, types) => labels.map(label => fields.find(field =>
    norm(field.label || field.name) === norm(label) && (!types || types.includes(field.type))
  )).find(Boolean);
  const result = {
    contact: pick(['Renter', 'Renters', 'Tenant', 'Tenants', 'Prospect', 'Prospective Resident', 'Contact', 'Contacts'], ['person', 'persons']),
    description: pick(['Description', 'Notes', 'Message', 'Inquiry', 'Lead Details'], ['text', 'string', 'rich-text']),
    property: pick(['Interested Property', 'Property of Interest', 'Property Address', 'Rental Property Address', 'Property', 'Address'], ['text', 'string', 'address']),
    email: pick(['Email', 'Email Address'], ['email', 'text', 'string']),
    phone: pick(['Phone', 'Phone Number'], ['phone', 'tel', 'text', 'string']),
    fullName: pick(['Full Name', 'Name'], ['text', 'string']),
    source: pick(['Source', 'Lead Source'], ['text', 'string', 'sourceselect', 'singleselect', 'select']),
    stage: pick(['Stage', 'Status'], ['stageselect', 'singleselect', 'select'])
  };
  if (!result.description || (!result.contact && !result.email)) throw Error('Required renter lead fields unavailable');
  const configured = (config.data || config).fields || [];
  for (const field of Object.values(result)) {
    if (!field) continue;
    if (!field.key && !field.uuid) throw Error('field key');
    const details = configured.find(item => (item.uuid || item.key) === (field.key || field.uuid));
    if (details) Object.assign(field, { options: details.data || [], contactTypeIds: details.filter?.contactTypeIds || [] });
  }
  return result;
}

export function renterLeadPayload(data, fields, contactId) {
  const key = field => field.key || field.uuid;
  const details = [
    'Website renter inquiry',
    `Name: ${data.name}`,
    `Email: ${data.email}`,
    `Phone: ${data.phone || 'Not supplied'}`,
    `Interested in: ${data.propertyInterest || 'No specific home selected'}`,
    `Move-in timing: ${data.moveTiming || 'Not supplied'}`,
    `Message: ${data.message || 'No additional message'}`,
    `Listing ID: ${data.listingId || 'None'}`,
    `Page: ${data.pageTitle || 'Available homes'}`,
    `URL: ${data.pageUrl || ''}`
  ].join('\n');
  const escapeHtml = value => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const payload = { name: `${data.name} — ${data.propertyInterest || 'Website renter inquiry'}` };
  if (fields.contact && contactId) payload[key(fields.contact)] = fields.contact.type === 'persons' ? [contactId] : contactId;
  if (fields.description) payload[key(fields.description)] = fields.description.type === 'rich-text'
    ? `<p>${escapeHtml(details).replace(/\n/g, '<br>')}</p>`
    : details;
  if (fields.property && data.propertyInterest) payload[key(fields.property)] = data.propertyInterest;
  if (fields.email) payload[key(fields.email)] = data.email;
  if (fields.phone && data.phone) payload[key(fields.phone)] = data.phone;
  if (fields.fullName) payload[key(fields.fullName)] = data.name;
  for (const [field, preferred] of [[fields.source, 'Website'], [fields.stage, 'New']]) {
    if (!field) continue;
    if (['text', 'string'].includes(field.type)) payload[key(field)] = preferred;
    else if (field.options?.some(option => option.label === preferred)) payload[key(field)] = preferred;
  }
  return payload;
}

export async function handleRenterLead(request, env, fetcher = fetch) {
  if (request.method !== 'POST') return json({ message: 'Method not allowed.' }, 405);
  const origin = request.headers.get('Origin');
  if (origin && origin !== new URL(request.url).origin) return json({ message: 'Please submit from the Blue Crown website.' }, 403);
  if (!request.headers.get('Content-Type')?.startsWith('application/json')) return json({ message: 'Unsupported request.' }, 415);
  if (Number(request.headers.get('Content-Length')) > 10000) return json({ message: 'Request is too large.' }, 413);

  let data;
  try {
    const raw = await request.text();
    if (raw.length > 10000) return json({ message: 'Request is too large.' }, 413);
    data = validateRenterLead(JSON.parse(raw));
  } catch (error) {
    return json({ message: error.message || 'Please check the form fields.' }, 400);
  }
  if (data.website) return json({ success: false, message: 'Please contact our team by phone.' }, 400);
  if (!env.APTLY_API_TOKEN) return json({ message: 'The online form is temporarily unavailable. Please call 214.432.4115.' }, 503);

  const boardId = env.APTLY_RENTER_LEADS_BOARD_ID || DEFAULT_RENTER_LEADS_BOARD_ID;
  const call = async (path, body) => {
    const response = await fetcher(BASE + path, {
      method: body ? 'POST' : 'GET',
      headers: { 'x-token': env.APTLY_API_TOKEN, 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(12000)
    });
    if (!response.ok) throw Error(`Aptly returned ${response.status}`);
    return response.json();
  };

  try {
    const board = encodeURIComponent(boardId);
    const [schema, config] = await Promise.all([
      call('/api/schema/' + board),
      call('/api/board/' + board + '/configuration')
    ]);
    const fields = resolveRenterFields(schema, config);
    const [firstname, ...rest] = data.name.split(/\s+/);
    let contactId = '';
    if (fields.contact) {
      const contact = await call('/api/contacts', {
        firstname,
        lastname: rest.join(' '),
        email: data.email,
        ...(fields.contact.contactTypeIds?.length === 1
          ? { typeId: fields.contact.contactTypeIds[0] }
          : { contactType: 'Tenant' }),
        ...(data.phone ? { phone: [{ number: data.phone, type: 'mobile' }] } : {})
      });
      contactId = contact._id || contact.data?._id;
      if (!contactId) throw Error('contact');
    }
    const card = await call('/api/board/' + board, renterLeadPayload(data, fields, contactId));
    if (!card.data?._id && !card._id) throw Error('card');
    return json({ success: true });
  } catch (error) {
    console.error('Renter lead integration failure:', error.message);
    return json({ message: 'We could not confirm your inquiry. Please call 214.432.4115.' }, 502);
  }
}

export async function onRequestPost({ request, env }) {
  return handleRenterLead(request, env);
}
