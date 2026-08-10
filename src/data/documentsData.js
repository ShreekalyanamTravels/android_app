export const DOC_STATUS_STYLES = {
  Draft:     'pending',
  Sent:      'info',
  Approved:  'success',
  Partial:   'pending',
  Paid:      'success',
  Confirmed: 'success',
  Pending:   'pending',
  'On Hold': 'pending',
}

export const DOCUMENTS = [
  { id: 'doc-1', bookingId: 'bk-1', type: 'Invoice', ref: 'INV-2024-001', date: 'Aug 10, 2026', amount: 42400, status: 'Partial' },
  { id: 'doc-2', bookingId: 'bk-1', type: 'Receipt',  ref: 'RCP-2024-001', date: 'Aug 10, 2026', amount: 20000, status: 'Paid' },
  { id: 'doc-3', bookingId: 'bk-1', type: 'Voucher',  ref: 'VCH-2024-001', date: 'Aug 12, 2026', amount: null,  status: 'Confirmed' },
  { id: 'doc-4', bookingId: 'bk-1', type: 'Ticket',   ref: 'TKT-2024-001', date: 'Aug 15, 2026', amount: 8200,  status: 'Confirmed' },
]

export function listDocumentsForBooking(bookingId) {
  return DOCUMENTS.filter(d => d.bookingId === bookingId)
}
