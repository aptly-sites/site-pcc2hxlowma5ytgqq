// Ported from the source repo's worker.mjs/lead-api.mjs (Cloudflare Worker route
// `/api/owner-lead`) to a Cloudflare Pages Function — logic unchanged, only the
// entry point convention differs: onRequestPost({ request, env }) instead of a
// Worker's fetch(request, env), per docs/website-hosting-custom-sites.md
// ("Server logic beyond a simple contact form").
const BASE = 'https://core-api.getaptly.com';
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
const norm = x => String(x || '').toLowerCase().replace(/[^a-z0-9]/g, '');

export function validate(data) {
  const max = {
    name: 120,
    email: 254,
    address: 300,
    phone: 30,
    propertyType: 80,
    bedrooms: 30,
    bathrooms: 30,
    goal: 120,
    message: 4000,
    formSource: 120,
    pageTitle: 200,
    pageUrl: 500,
    website: 200
  };
  const out = {};
  for (const [key, len] of Object.entries(max)) {
    if (data[key] != null && typeof data[key] !== 'string')
      throw Error('Please check the form fields.');
    out[key] = (data[key] || '').trim();
    if (out[key].length > len) throw Error('One of the form fields is too long.');
  }
  if (!out.name || !out.address || !/^\S+@\S+\.\S+$/.test(out.email))
    throw Error('Please include your name, property address, and a valid email.');
  if (out.phone && !/^[+\d\s().-]{7,30}$/.test(out.phone))
    throw Error('Please enter a valid phone number.');
  return out;
}

export function resolveFields(schema, config = {}) {
  const fields = Array.isArray(schema) ? schema : schema.data;
  if (!Array.isArray(fields)) throw Error('schema');
  const pick = (labels, types) =>
    labels
      .map(label =>
        fields.find(
          f => norm(f.label || f.name) === norm(label) && (!types || types.includes(f.type))
        )
      )
      .find(Boolean);
  const result = {
    address: pick(
      ['Rental Property Address', 'Property Address', 'Address - 1', 'Address'],
      ['text', 'string', 'address']
    ),
    owner: pick(['Owners', 'Owner', 'Owner Contact', 'Contact'], ['person', 'persons']),
    description: pick(['Description', 'Notes'], ['text', 'string', 'rich-text']),
    source: pick(
      ['Source', 'Lead Source'],
      ['text', 'string', 'sourceselect', 'singleselect', 'select']
    ),
    stage: pick(['Stage'], ['stageselect', 'singleselect', 'select']),
    services: pick(['Desired Services'], ['multiselect']),
    contact: pick(['Contact'], ['person']),
    fullName: pick(['Full Name'], ['string', 'text']),
    email: pick(['Email', 'Email Address'], ['email', 'text', 'string']),
    phone: pick(['Phone', 'Phone Number'], ['phone', 'tel', 'text', 'string'])
  };
  if (!result.address || !result.owner || !result.description)
    throw Error('Required lead fields unavailable');
  const configured = (config.data || config).fields || [];
  for (const f of Object.values(result)) {
    if (f) {
      if (!f.key && !f.uuid) throw Error('field key');
      const details = configured.find(c => (c.uuid || c.key) === (f.key || f.uuid));
      if (details)
        Object.assign(f, { options: details.data || [], contactTypeIds: details.filter?.contactTypeIds || [] });
    }
  }
  for (const [field, label] of [
    [result.source, 'Website'],
    [result.stage, 'New'],
    [result.services, 'Property Management']
  ]) {
    if (field && !['text', 'string'].includes(field.type) && !field.options?.some(o => o.label === label))
      throw Error('Required lead option unavailable');
  }
  return result;
}

export function leadPayload(d, fields, contactId) {
  const key = f => f.key || f.uuid;
  const description = `Website owner inquiry\nName: ${d.name}\nEmail: ${d.email}\nPhone: ${
    d.phone || 'Not supplied'
  }\nProperty: ${d.address}\nType: ${d.propertyType}${
    d.bedrooms ? `\nBedrooms: ${d.bedrooms}` : ''
  }${d.bathrooms ? `\nBathrooms: ${d.bathrooms}` : ''}${
    d.goal ? `\nPrimary goal: ${d.goal}` : ''
  }\nMessage: ${d.message}\nSource: ${d.formSource}\nPage: ${d.pageTitle}\nURL: ${d.pageUrl}`;
  const escape = s =>
    s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const payload = {
    name: `${d.name} — ${d.address}`,
    [key(fields.address)]: d.address,
    [key(fields.owner)]: fields.owner.type === 'persons' ? [contactId] : contactId,
    [key(fields.description)]:
      fields.description.type === 'rich-text'
        ? '<p>' + escape(description).replace(/\n/g, '<br>') + '</p>'
        : description
  };
  if (fields.source) payload[key(fields.source)] = 'Website';
  if (fields.stage) payload[key(fields.stage)] = 'New';
  if (fields.services) payload[key(fields.services)] = ['Property Management'];
  if (fields.contact) payload[key(fields.contact)] = contactId;
  if (fields.fullName) payload[key(fields.fullName)] = d.name;
  if (fields.email) payload[key(fields.email)] = d.email;
  if (fields.phone && d.phone) payload[key(fields.phone)] = d.phone;
  return payload;
}

export async function handleLead(request, env, fetcher = fetch) {
  if (request.method !== 'POST') return json({ message: 'Method not allowed.' }, 405);
  const origin = request.headers.get('Origin');
  if (origin && origin !== new URL(request.url).origin)
    return json({ message: 'Please submit from the Blue Crown website.' }, 403);
  if (!request.headers.get('Content-Type')?.startsWith('application/json'))
    return json({ message: 'Unsupported request.' }, 415);
  if (Number(request.headers.get('Content-Length')) > 12000)
    return json({ message: 'Request is too large.' }, 413);
  let d;
  try {
    const raw = await request.text();
    if (raw.length > 12000) return json({ message: 'Request is too large.' }, 413);
    d = validate(JSON.parse(raw));
  } catch {
    return json({ message: 'Please check your form fields and try again.' }, 400);
  }
  if (d.website) return json({ success: false, message: 'Please contact our team by phone.' }, 400);
  if (env.APTLY_LEADS_ENABLED !== 'true')
    return json(
      { message: 'The online form is not connected yet. Please call 214.432.4115 or email info@bluecrownproperties.com.' },
      503
    );
  if (!env.APTLY_API_TOKEN || !env.APTLY_OWNER_LEADS_BOARD_ID)
    return json({ message: 'Please call 214.432.4115 to request your analysis.' }, 503);
  const call = async (path, body) => {
    const r = await fetcher(BASE + path, {
      method: body ? 'POST' : 'GET',
      headers: { 'x-token': env.APTLY_API_TOKEN, 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(12000)
    });
    if (!r.ok) throw Error('upstream ' + r.status);
    return r.json();
  };
  try {
    const board = encodeURIComponent(env.APTLY_OWNER_LEADS_BOARD_ID);
    const [schema, config] = await Promise.all([
      call('/api/schema/' + board),
      call('/api/board/' + board + '/configuration')
    ]);
    const fields = resolveFields(schema, config);
    if (!config.data && !config.fields) throw Error('configuration');
    const [firstname, ...rest] = d.name.split(/\s+/);
    const contact = await call('/api/contacts', {
      firstname,
      lastname: rest.join(' '),
      email: d.email,
      ...(fields.owner.contactTypeIds?.length === 1
        ? { typeId: fields.owner.contactTypeIds[0] }
        : { contactType: 'Owner' }),
      ...(d.phone ? { phone: [{ number: d.phone, type: 'mobile' }] } : {})
    });
    const contactId = contact._id || contact.data?._id;
    if (!contactId) throw Error('contact');
    const payload = leadPayload(d, fields, contactId);
    const card = await call('/api/board/' + board, payload);
    if (!card.data?._id && !card._id) throw Error('card');
    return json({ success: true });
  } catch (error) {
    console.error('Owner lead integration failure:', error.message);
    return json(
      { message: 'We could not confirm your request. Please call 214.432.4115 or email info@bluecrownproperties.com for help.' },
      502
    );
  }
}

export async function onRequestPost({ request, env }) {
  return handleLead(request, env);
}
