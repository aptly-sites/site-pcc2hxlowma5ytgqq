const compact = value => new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1,
}).format(value);

function bars(title, note, rows, money) {
  const largest = Math.max(1, ...rows.map(([, value]) => Math.abs(value)));
  return `<figure class="owner-chart"><figcaption>${title}</figcaption><p class="owner-chart-note">${note}</p><div class="owner-chart-bars">${rows.map(([label, value, type]) => {
    const width = Math.min(100, Math.abs(value) / largest * 100);
    return `<div class="owner-chart-row"><div class="owner-chart-row-head"><span>${label}</span><strong>${money(value)}</strong></div><div class="owner-chart-track"><span class="owner-chart-fill ${type || ''}" style="width:${width.toFixed(2)}%"></span></div></div>`;
  }).join('')}</div></figure>`;
}

export function managementChart(result, money) {
  return bars('Estimated annual benefits and fee', 'Time value is an economic estimate, not cash received. A negative vacancy effect means more vacant days under the managed scenario.', [
    ['Time value saved', result.time, 'time'],
    ['Maintenance savings', result.maintenance, 'maintenance'],
    ['Vacancy effect', result.vacancy, result.vacancy < 0 ? 'negative' : 'vacancy'],
    ['Management fee', result.fee, 'fee'],
  ], money);
}

export function evictionChart(result, money) {
  const costs = Object.fromEntries(result.rows);
  return bars('Where the estimated cost comes from', 'Grouped from the assumptions below; zero-value costs remain visible for comparison.', [
    ['Unpaid rent', costs['Unpaid rent'], 'fee'],
    ['Post-possession vacancy', costs['Post-possession vacancy'], 'vacancy'],
    ['Court, service & legal', costs['Court filing'] + costs['Service of process'] + costs['Attorney fees'] + costs['Court appearances'] + costs['Authorized enforcement'], 'time'],
    ['Turnover & re-leasing', costs['Removal/storage'] + costs['Cleaning'] + costs['Repairs'] + costs['Repainting'] + costs['Marketing/re-leasing'], 'maintenance'],
    ['Value of your time', costs['Value of your time'], 'time'],
  ], money);
}

export function rentSellChart(result, money) {
  const rows = result.rows;
  const values = rows.flatMap(row => [row.rentOutcome, row.sellOutcome]);
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const padding = Math.max((maximum - minimum) * .12, Math.abs(maximum) * .04, 1);
  const low = minimum - padding;
  const high = maximum + padding;
  const x = index => rows.length === 1 ? 286 : 62 + index / (rows.length - 1) * 448;
  const y = value => 215 - (value - low) / (high - low) * 178;
  const points = key => rows.map((row, index) => `${x(index).toFixed(1)},${y(row[key]).toFixed(1)}`).join(' ');
  const ticks = [...new Set([0, Math.floor((rows.length - 1) / 2), rows.length - 1])];
  const grids = [0, .5, 1].map(fraction => {
    const value = low + (high - low) * fraction;
    return `<line x1="62" x2="510" y1="${y(value).toFixed(1)}" y2="${y(value).toFixed(1)}" stroke="#dce4f0"/><text x="55" y="${(y(value) + 4).toFixed(1)}" text-anchor="end">${compact(value)}</text>`;
  }).join('');
  const years = ticks.map(index => `<text x="${x(index).toFixed(1)}" y="250" text-anchor="middle">Year ${rows[index].year}</text>`).join('');
  const last = rows.length - 1;
  return `<figure class="owner-chart owner-line-chart"><figcaption>Projected outcome by year</figcaption><div class="owner-chart-legend"><span class="rent-path">Rent, then sell</span><span class="sell-path">Sell now</span></div><svg viewBox="0 0 540 265" aria-hidden="true" focusable="false">${grids}<polyline points="${points('rentOutcome')}" fill="none" stroke="#345ce5" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/><polyline points="${points('sellOutcome')}" fill="none" stroke="#142653" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${x(last).toFixed(1)}" cy="${y(rows[last].rentOutcome).toFixed(1)}" r="5" fill="#345ce5"/><circle cx="${x(last).toFixed(1)}" cy="${y(rows[last].sellOutcome).toFixed(1)}" r="5" fill="#142653"/>${years}</svg><p class="owner-chart-note">At year ${rows[last].year}: rent then sell ${money(rows[last].rentOutcome)}; sell now ${money(rows[last].sellOutcome)}. The table below shows each year.</p></figure>`;
}
