import { listDocumentsForBooking } from '../data/documentsData'

export async function getDocumentsForBooking(bookingId) {
  return Promise.resolve(listDocumentsForBooking(bookingId))
}
