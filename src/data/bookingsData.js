export const DEAL_STAGE_STYLES = {
  Qualification:  'pending',
  'Proposal Sent': 'info',
  Negotiation:    'pending',
  Completed:      'success',
  Lost:           'error',
}

export const BOOKINGS = [
  {
    id: 'bk-1',
    ref: 'PRE-2209',
    itineraryId: 'it-1',
    title: 'Goa – Budget Getaway',
    destination: 'Goa, India',
    dates: 'Aug 15–20, 2026',
    nights: 5,
    pax: '2 Adults',
    total: 42400,
    received: 20000,
    balance: 22400,
    stage: 'Proposal Sent',
  },
]
