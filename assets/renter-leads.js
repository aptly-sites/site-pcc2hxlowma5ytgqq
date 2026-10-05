(() => {
  const detail = document.querySelector('main.rental-detail[data-listing-id]');
  const listingPage = document.querySelector('#listing-results');
  if (!detail && !listingPage) return;

  const stylesheet = document.createElement('link');
  stylesheet.rel = 'stylesheet';
  stylesheet.href = '/assets/renter-leads.css?v=1';
  document.head.append(stylesheet);

  const breadcrumb = detail?.querySelector('.rental-breadcrumb')?.textContent
    .split('·').map(part => part.trim()).filter(Boolean) || [];
  const address = detail?.querySelector('.property-address')?.textContent.replace(/\s+/g, ' ').trim() || '';
  const propertyTitle = address || breadcrumb[breadcrumb.length - 1] || detail?.querySelector('h1')?.textContent.trim() || '';
  const propertyLocation = address ? '' : breadcrumb.length > 2 ? breadcrumb[breadcrumb.length - 2] : '';
  const listingId = detail?.dataset.listingId || '';
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'button outline renter-lead-trigger';
  trigger.textContent = detail ? 'Ask a question about this home' : 'Tell us what you’re looking for';
  trigger.setAttribute('aria-haspopup', 'dialog');

  if (detail) {
    const actions = detail.querySelector('[data-listing-actions]');
    if (!actions) return;
    actions.append(trigger);
  } else {
    const actions = document.querySelector('.rental-search-actions');
    if (!actions) return;
    actions.prepend(trigger);
  }

  const dialog = document.createElement('dialog');
  dialog.className = 'renter-lead-dialog';
  dialog.setAttribute('aria-labelledby', 'renter-lead-title');
  dialog.innerHTML = `
    <button class="renter-lead-close" type="button" aria-label="Close form">×</button>
    <span class="eyebrow">LET’S FIND YOUR NEXT HOME</span>
    <h2 id="renter-lead-title">${detail ? 'Ask us about this home.' : 'Tell us what you’re looking for.'}</h2>
    <p class="renter-lead-intro">Share a few details and our leasing team will follow up. This form is for rental inquiries; it does not submit an application or reserve a home.</p>
    <form class="renter-lead-form">
      <div class="renter-lead-grid">
        <label>Full name<input name="name" autocomplete="name" maxlength="120" required></label>
        <label>Email address<input name="email" type="email" autocomplete="email" maxlength="254" required></label>
        <label><span>Phone <span class="renter-lead-optional">(optional)</span></span><input name="phone" type="tel" autocomplete="tel" maxlength="30"></label>
        <label>When are you hoping to move?<select name="moveTiming"><option value="">Choose an option</option><option>As soon as possible</option><option>Within 30 days</option><option>1–3 months</option><option>Just exploring</option></select></label>
        <label class="renter-lead-full">Home or area of interest<input name="propertyInterest" maxlength="300" value="${escapeHtml([propertyTitle, propertyLocation].filter(Boolean).join(', '))}" placeholder="City, neighborhood, or home"></label>
        <label class="renter-lead-full">How can we help?<textarea name="message" rows="4" maxlength="2000" placeholder="Optional"></textarea></label>
        <label class="renter-lead-honeypot" aria-hidden="true">Leave this field empty<input name="website" tabindex="-1" autocomplete="off"></label>
      </div>
      <input type="hidden" name="listingId" value="${escapeHtml(listingId)}">
      <p class="renter-lead-notice">By sending this request, you ask Blue Crown to contact you about rentals. <a href="/privacy/">Privacy information</a>.</p>
      <button class="button renter-lead-submit" type="submit">Send rental inquiry</button>
      <p class="renter-lead-status" role="status" aria-live="polite"></p>
    </form>`;
  document.body.append(dialog);

  let returnFocus;
  const open = () => {
    if (dialog.open) return;
    returnFocus = document.activeElement;
    dialog.showModal();
  };
  const close = () => dialog.close();
  dialog.querySelector('.renter-lead-close').addEventListener('click', close);
  dialog.addEventListener('click', event => { if (event.target === dialog) close(); });
  dialog.addEventListener('close', () => returnFocus?.focus());
  trigger.addEventListener('click', open);
  document.addEventListener('click', event => {
    const link = event.target.closest('[data-renter-lead-link]');
    if (!link) return;
    event.preventDefault();
    open();
  });
  if (location.hash === '#renter-inquiry') open();
  dialog.querySelector('form').addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const status = form.querySelector('.renter-lead-status');
    const submit = form.querySelector('[type="submit"]');
    const data = Object.fromEntries(new FormData(form));
    Object.assign(data, { pageTitle: document.title, pageUrl: location.origin + location.pathname });
    submit.disabled = true;
    status.textContent = 'Sending your inquiry…';
    try {
      const response = await fetch('/api/renter-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        signal: AbortSignal.timeout(25000)
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.success !== true) throw Error(result.message || 'We could not send your inquiry. Please call 214.432.4115.');
      status.textContent = 'Thank you. Your inquiry has been sent to our leasing team.';
      form.reset();
      const interest = form.elements.propertyInterest;
      if (interest) interest.value = [propertyTitle, propertyLocation].filter(Boolean).join(', ');
      form.elements.listingId.value = listingId;
    } catch (error) {
      status.textContent = error.message;
    } finally {
      submit.disabled = false;
    }
  });

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  }
})();
