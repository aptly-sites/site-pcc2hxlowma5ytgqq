// Ported from the source repo's worker.mjs/schools-api.mjs (Cloudflare Worker route
// `/api/nearby-schools`) to a Cloudflare Pages Function. It uses the shared paginated
// rental feed so schools are available for homes beyond the first feed page.
import { coords } from '../../assets/rental-data.mjs';
import { fetchRentalPages } from '../../assets/rental-feed.mjs';

const reply = (data, status = 200) =>
  Response.json(data, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });

export const profileURL = value => {
  try {
    const u = new URL(value);
    return u.protocol === 'https:' && u.hostname === 'www.greatschools.org' ? u.href : '';
  } catch {
    return '';
  }
};
const short = value => (typeof value === 'string' ? value.trim().slice(0, 200) : '');
const coordinate = (value, max) => {
  const n = Number(value);
  return value !== null && value !== undefined && value !== '' && Number.isFinite(n) && Math.abs(n) <= max
    ? n
    : null;
};

export function normalizeSchools(data) {
  if (!Array.isArray(data.schools)) throw Error('Invalid schools response');
  return data.schools
    .map(s => ({
      name: short(s.name),
      url: profileURL(s['overview-url']),
      grades: short(s.level).replaceAll('KG', 'K'),
      type: ['public', 'private', 'charter'].includes(s.type) ? s.type : '',
      distance: typeof s.distance === 'number' && s.distance >= 0 ? s.distance : null,
      lat: coordinate(s.lat, 90),
      lon: coordinate(s.lon, 180),
      street: short(s.street),
      city: short(s.city),
      state: short(s.state),
      zip: short(s.zip)
    }))
    .filter(s => s.name && s.url && s.lat !== null && s.lon !== null && !(s.lat === 0 && s.lon === 0))
    .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity))
    .slice(0, 12);
}

export function createSchoolsHandler(fetcher = (...a) => fetch(...a)) {
  let feed = null,
    feedUntil = 0,
    feedPending = null;
  async function inventory() {
    if (feed && Date.now() < feedUntil) return feed;
    if (!feedPending)
      feedPending = (async () => {
        feed = (await fetchRentalPages(fetcher,10000)).data;
        feedUntil = Date.now() + 300000;
        return feed;
      })().finally(() => {
        feedPending = null;
      });
    return feedPending;
  }
  return async function handleSchools(request, env) {
    if (request.method !== 'GET') return reply({ error: 'Method not allowed' }, 405);
    const id = new URL(request.url).searchParams.get('listing');
    if (!id || !/^[a-zA-Z0-9]{8,40}$/.test(id)) return reply({ error: 'Invalid listing' }, 400);
    if (!env.GREATSCHOOLS_API_KEY)
      return reply({ error: 'School information is temporarily unavailable.' }, 503);
    try {
      const listing = (await inventory()).find(x => x._id === id && x.publishedForRent !== false);
      if (!listing) return reply({ error: 'Listing not found' }, 404);
      const point = coords(listing);
      if (!point) return reply({ schools: [], reason: 'location' });
      const u = new URL('https://gs-api.greatschools.org/v2/nearby-schools');
      u.search = new URLSearchParams({ lat: point[0], lon: point[1], distance: 5, limit: 12 });
      const r = await fetcher(u, {
        headers: { 'X-API-Key': env.GREATSCHOOLS_API_KEY, Accept: 'application/json' },
        signal: AbortSignal.timeout(12000)
      });
      if (!r.ok) throw Error('schools');
      return reply({ home: { lat: point[0], lon: point[1] }, schools: normalizeSchools(await r.json()) });
    } catch {
      return reply({ error: 'School information is temporarily unavailable.' }, 503);
    }
  };
}
export const handleSchools = createSchoolsHandler();

export async function onRequestGet({ request, env }) {
  return handleSchools(request, env);
}
