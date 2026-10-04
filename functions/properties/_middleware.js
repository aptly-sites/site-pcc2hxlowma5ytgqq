// Render every property detail page from the shared template and the live Aptly feed.
// Pages Functions middleware runs before static asset serving for /properties/*, so
// new listings get detail pages without creating a property-specific HTML file.
import { renderListing } from '../_lib/listing-render.js';
import { findPublishedRental } from '../../assets/rental-feed.mjs';

const PROPERTY_PATH = /^\/properties\/[^/]+\/[^/]+\/?$/;
// If the feed takes longer than this, send the shared template's page shell and a
// loading indicator while the live detail content finishes rendering.
const RACE_MS = 350;

const NOT_FOUND_MAIN =
  '<main id="main"><section class="section"><div class="wrap"><h1>Let’s check this home.</h1><p>Live listing details are temporarily unavailable.</p><a class="button" href="https://portal.getaptly.com/search/PCc2hXLoWma5yTgQQ/">Open rental portal ↗</a></div></section></main>';
const GONE_MAIN =
  '<main id="main"><section class="section"><div class="wrap"><h1>This home is no longer available.</h1><a class="button" href="/properties/">Browse current homes →</a></div></section></main></body></html>';
const LOADING_OVERLAY =
  '<div class="crown-loader detail-loading" role="status"><img src="/assets/logo.svg" alt=""><span>Opening your next home…</span></div>';
const HIDE_LOADER_STYLE = '<style>.detail-loading{display:none!important}</style>';

// Read the shared template from the Pages asset store without recursing into middleware.
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
  const template = await fetchAsset(env, url, '/properties/index.html');
  if (!template) return new Response(request.method === 'HEAD' ? null : 'Property details are temporarily unavailable.', {
    status: 503,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }
  });

  const id = cleanPath.split('/').pop().split('-').pop();

  const work = (async () => {
    try {
      const listing = await findPublishedRental(id);
      return listing ? renderListing(template, listing) : null;
    } catch {
      return template.replace(/<main[\s\S]*?<\/main>/, NOT_FOUND_MAIN);
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
    // listing genuinely isn't published anymore — a definitive answer, not a timeout.
    if (early) return new Response(request.method === 'HEAD' ? null : early, { headers });
    return Response.redirect(new URL('/properties/', url).href, 302);
  }
  if (request.method === 'HEAD') return new Response(null, { headers });

  // Feed is slow — stream the shared template's shell with a loading overlay, then
  // send the live-rendered content once it arrives.
  const prefix = template.slice(0, template.indexOf('<main'));
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
