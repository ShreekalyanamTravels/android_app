import { BOOKINGS } from '../data/bookingsData'

let bookings = [...BOOKINGS]
let seq = bookings.length + 1

export async function listBookings() {
  return Promise.resolve(bookings)
}

export async function getBookingById(id) {
  return Promise.resolve(bookings.find(b => b.id === id) || null)
}

export async function createBookingFromItinerary(itinerary, { pax = '2 Adults' } = {}) {
  const booking = {
    id: `bk-${seq++}`,
    ref: `PRE-${2000 + seq}`,
    itineraryId: itinerary.id,
    title: itinerary.title,
    destination: itinerary.destination,
    dates: itinerary.fromDate && itinerary.toDate ? `${itinerary.fromDate} – ${itinerary.toDate}` : `${itinerary.nights} nights`,
    nights: itinerary.nights,
    pax,
    total: itinerary.totalSell,
    received: 0,
    balance: itinerary.totalSell,
    stage: 'Qualification',
  }
  bookings = [booking, ...bookings]
  return Promise.resolve(booking)
}
