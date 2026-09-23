// Ported from the source repo's worker.mjs (the `/properties/:market/:slug/` branch of its
// Cloudflare Worker fetch handler) — restores per-request live listing data now that the site
// is a static Cloudflare Pages deployment with no Worker of its own. Pages Functions middleware
// runs BEFORE static asset serving for its scope (this file, scoped to /properties/* by its
// directory), so it can intercept a listing detail request, race a live fetch against the
// pre-baked static snapshot, and serve whichever is ready — exactly like the original Worker,
// just reading the snapshot via the env.ASSETS binding instead of a hand-rolled base64 asset map.
//
// Concretely this fixes the two problems noted in docs/website-hosting-custom-sites.md
// ("Live preview" / import limitations): existing listing pages no longer show stale
// price/availability forever, and a listing added to the feed after the last import now gets
// a real page instead of a 404 (the static /properties/ search page already lists it — it
// fetches the same live feed client-side — so the two no longer disagree).
import { renderListing } from '../_lib/listing-render.js';

const FEED_URL = 'https://app.getaptly.com/api/portal/listings/PCc2hXLoWma5yTgQQ';
const PROPERTY_PATH = /^\/properties\/[^/]+\/[^/]+\/?$/;
// How long to wait for the live feed before falling back to the static snapshot (or a
// "checking availability" shell if there isn't one) and streaming the live version in once it
// resolves. Matches the source Worker's own budget — long enough for a normal feed fetch,
// short enough that a visitor never perceives a stall.
const RACE_MS = 350;

const NOT_FOUND_MAIN =
  '<main id="main"><section class="section"><div class="wrap"><h1>Let’s check this home.</h1><p>Live listing details are temporarily unavailable.</p><a class="button" href="https://portal.getaptly.com/search/PCc2hXLoWma5yTgQQ/">Open rental portal ↗</a></div></section></main>';
const GONE_MAIN =
  '<main id="main"><section class="section"><div class="wrap"><h1>This home is no longer available.</h1><a class="button" href="/properties/">Browse current homes →</a></div></section></main></body></html>';
const LOADING_OVERLAY =
  '<div class="crown-loader detail-loading" role="status"><img src="/assets/logo.svg" alt=""><span>Opening your next home…</span></div>';
const HIDE_LOADER_STYLE = '<style>.detail-loading{display:none!important}</style>';

// Reads a static file straight from the Pages asset store — bypasses Functions routing/
// middleware entirely, so this can't recurse into this same middleware.
async function fetchAsset(env, base, pathname) {
  const res = await env.ASSETS.fetch(new URL(pathname, base));
  return res.ok ? res.text() : null;
}

export async function onRequest({ request, next, env }) {
  const url = new URL(request.url);

  if (!PROPERTY_PATH.test(url.pathname) || !['GET', 'HEAD'].includes(request.method)) {
    return next();
  }

  const cleanPath = url.pathname.replace(/\/$/, '');
  const [template, snapshot] = await Promise.all([
    fetchAsset(env, url, '/properties/index.html'),
    fetchAsset(env, url, `${cleanPath}/index.html`)
  ]);
  // No shell to render into at all (shouldn't happen — /properties/index.html always ships) —
  // fall through to Pages' normal static resolution rather than fail cleverly.
  if (!template) return next();

  const id = cleanPath.split('/').pop().split('-').pop();

  const work = (async () => {
    try {
      const response = await fetch(FEED_URL, { signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw Error('feed');
      const feed = await response.json();
      if (!Array.isArray(feed.data)) throw Error('format');
      const listing = feed.data.find(x => x._id === id && x.publishedForRent !== false);
      return listing ? renderListing(template, listing) : null;
    } catch {
      return snapshot || template.replace(/<main[\s\S]*?<\/main>/, NOT_FOUND_MAIN);
    }
  })();

  const headers = {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Robots-Tag': 'noindex, nofollow'
  };

  const early = await Promise.race([
    work,
    new Promise(resolve => setTimeout(() => resolve('loading'), RACE_MS))
  ]);
  if (early !== 'loading') {
    // `work` resolving to null (not an error) means the feed was checked in time and the
    // listing genuinely isn't published anymore — a definitive answer, not a timeout, so this
    // redirects even when a stale snapshot exists rather than showing outdated content.
    if (early) return new Response(request.method === 'HEAD' ? null : early, { headers });
    return Response.redirect(new URL('/properties/', url).href, 302);
  }
  if (request.method === 'HEAD') return new Response(null, { headers });

  // Feed is slow — stream the snapshot (or template) immediately with a loading overlay, then
  // replace <main> with the live-rendered content once it arrives.
  const base = snapshot || template;
  const prefix = base.slice(0, base.indexOf('<main'));
  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream({
      async start(controller) {
        try {
          controller.enqueue(encoder.encode(prefix + LOADING_OVERLAY));
          const html = await work;
          const suffix = html ? html.slice(html.indexOf('<main')) : GONE_MAIN;
          controller.enqueue(encoder.encode(HIDE_LOADER_STYLE + suffix));
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      }
    }),
    { headers }
  );
}
