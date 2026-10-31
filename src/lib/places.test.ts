import { describe, expect, it } from 'vitest'
import { fromNominatim, googleMapsLink, parseGoogleMapsUrl, placeArea } from './places'

describe('fromNominatim', () => {
  it('reads name, area, position and the Wikipedia tag', () => {
    const [place] = fromNominatim([
      {
        osm_type: 'way',
        osm_id: 42,
        lat: '41.0256',
        lon: '28.9742',
        name: 'Galata Kulesi',
        display_name: 'Galata Kulesi, Beyoğlu, İstanbul, Türkiye',
        address: { city: 'İstanbul', country: 'Türkiye' },
        extratags: { wikipedia: 'tr:Galata Kulesi' },
      },
      { lat: 'x', lon: '1', name: 'Bozuk' },
    ])
    expect(place).toEqual({
      kind: 'place',
      title: 'Galata Kulesi',
      creator: 'İstanbul, Türkiye',
      latitude: 41.0256,
      longitude: 28.9742,
      source: 'osm',
      externalId: 'way/42',
      wikipedia: 'tr:Galata Kulesi',
    })
  })

  it('prefers the province over a district', () => {
    const [place] = fromNominatim([
      { lat: '41', lon: '29', name: 'Galata Kulesi', address: { town: 'Beyoğlu', province: 'İstanbul', country: 'Türkiye' } },
    ])
    expect(place.creator).toBe('İstanbul, Türkiye')
  })

  it('falls back to the first part of the address and smaller settlements', () => {
    const [place] = fromNominatim([{ lat: '38.6', lon: '34.8', display_name: 'Göreme, Nevşehir', address: { town: 'Göreme', country: 'Türkiye' } }])
    expect(place).toMatchObject({ title: 'Göreme', creator: 'Göreme, Türkiye' })
    expect(placeArea(undefined)).toBeUndefined()
    expect(fromNominatim({ error: 'x' })).toEqual([])
  })
})

describe('parseGoogleMapsUrl', () => {
  it('reads the name and the place pin', () => {
    const url =
      'https://www.google.com/maps/place/Galata+Kulesi/@41.025631,28.9715,17z/data=!3m1!4b1!4m6!3m5!1s0x14cab9e7a7777c43:0x4!8m2!3d41.0256309!4d28.9741746!16zL20vMDJuNXFi'
    expect(parseGoogleMapsUrl(url)).toEqual({ title: 'Galata Kulesi', latitude: 41.0256309, longitude: 28.9741746 })
  })

  it('decodes Turkish names and uses the map centre without a pin', () => {
    expect(parseGoogleMapsUrl('https://www.google.com.tr/maps/place/G%C3%B6reme/@38.6431,34.8289,14z')).toEqual({
      title: 'Göreme',
      latitude: 38.6431,
      longitude: 34.8289,
    })
  })

  it('handles coordinate links and rejects others', () => {
    expect(parseGoogleMapsUrl('https://maps.google.com/?q=40.1,29.2')).toEqual({ title: undefined, latitude: 40.1, longitude: 29.2 })
    expect(parseGoogleMapsUrl('https://maps.app.goo.gl/abc123')).toBeUndefined()
    expect(parseGoogleMapsUrl('Galata Kulesi')).toBeUndefined()
  })
})

describe('googleMapsLink', () => {
  it('uses the position when known, else the name', () => {
    expect(googleMapsLink({ title: 'X', latitude: 41, longitude: 29 })).toBe(
      'https://www.google.com/maps/search/?api=1&query=41%2C29',
    )
    expect(googleMapsLink({ title: 'Galata Kulesi', creator: 'İstanbul' })).toContain('Galata%20Kulesi%2C%20%C4%B0stanbul')
  })
})
