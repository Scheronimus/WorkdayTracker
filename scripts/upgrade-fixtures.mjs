export function upgradeScenarios() {
  const day = (id, extra = {}) => ({
    id, leftHomeAt: '2026-09-07T06:00:00.123Z', arrivedHomeAt: '2026-09-07T16:00:00.456Z', kilometresHome: null, homeJourneyStarted: true,
    note: 'Espa\u00f1a, "quoted"\nsecond line \u{1f69a}',
    visits: [{ id: `${id}-visit`, name: 'Cl\u00ednica, "A"', arrivedAt: '2026-09-07T08:00:00.789Z', leftAt: '2026-09-07T09:00:00.123Z', kilometres: 0 }], ...extra,
  })
  const completed = day(123)
  const imported = day('imported-42', { homeJourneyStarted: undefined, note: undefined, visits: [], kilometresHome: 12.5 })
  const overnight = day(456, { leftHomeAt: '2026-10-24T20:00:00.321Z', arrivedHomeAt: '2026-10-25T03:00:00.654Z', visits: [], kilometresHome: 0 })
  const history = [overnight, completed, imported]
  return [
    { name: 'active-visit-english', current: day(900, { arrivedHomeAt: null, homeJourneyStarted: false, visits: [{ ...completed.visits[0], id: 901, leftAt: null }] }), history, language: 'en' },
    { name: 'home-journey-spanish', current: day(902, { arrivedHomeAt: null }), history, language: 'es' },
    { name: 'completed-current-and-imported-history', current: overnight, history, language: 'en' },
    { name: 'prepared-day-legacy-optionals', current: { id: 903, leftHomeAt: null, arrivedHomeAt: null, kilometresHome: null, visits: [] }, history: [imported], language: 'es' },
    { name: 'large-history-1000-days', current: null, history: Array.from({ length: 1000 }, (_, i) => day(10000 + i, { visits: i % 2 ? [] : completed.visits })), language: 'en' },
    { name: 'recorded-through-production-workflow', current: null, history: [], language: 'en', record: true },
  ]
}
