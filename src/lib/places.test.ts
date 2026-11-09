import { describe, expect, it } from 'vitest'
import {
  closestPhoto,
  fromNominatim,
  fromReverse,
  googleMapsLink,
  keepLines,
  parseGoogleMapsUrl,
  placeArea,
  plainTitle,
  sharedPlaceQueries,
} from './places'

describe('sharedPlaceQueries', () => {
  const shared = 'Galata Kulesi\nBereketzade, Galata Kulesi, 34421 Beyoğlu/İstanbul\n\nhttps://maps.app.goo.gl/abc123'

  it('turns the Google Maps app share text into searches, most exact first', () => {
    expect(sharedPlaceQueries(shared)).toEqual([
      'Galata Kulesi, Beyoğlu, İstanbul',
      'Galata Kulesi, Bereketzade, Galata Kulesi, 34421 Beyoğlu/İstanbul',
      'Galata Kulesi',
    ])
    // The same text after a single-line input flattened it.
    expect(sharedPlaceQueries(keepLines(shared))?.[0]).toBe('Galata Kulesi, Beyoğlu, İstanbul')
  })

  it('handles a bare name with a link, and ignores text without a short link', () => {
    expect(sharedPlaceQueries('Kapadokya https://maps.app.goo.gl/x')).toEqual(['Kapadokya'])
    expect(sharedPlaceQueries('https://maps.app.goo.gl/x')).toEqual([])
    expect(sharedPlaceQueries('Galata Kulesi')).toBeUndefined()
  })

  it('reads the name from a long link the Android app put in place of the short one', () => {
    const resolved = 'https://www.google.com/maps?q=Galata+Kulesi,+Bereketzade,+Beyo%C4%9Flu&ftid=0x14cab9e:0x4&entry=gps'
    expect(sharedPlaceQueries(resolved)).toEqual(['Galata Kulesi, Bereketzade, Beyoğlu', 'Galata Kulesi'])
    expect(sharedPlaceQueries(`Galata Kulesi | Beyoğlu/İstanbul | ${resolved}`)?.[0]).toBe('Galata Kulesi, Beyoğlu, İstanbul')
    expect(sharedPlaceQueries('https://www.google.com/maps?q=place_id:ChIJ123')).toEqual([])
  })
})

describe('closestPhoto', () => {
  const json = {
    query: {
      pages: {
        '2': { index: 1, title: 'Bereketzade Çeşmesi', thumbnail: { source: 'cesme.jpg' } },
        '1': { index: -1, title: 'Galata Kulesi', thumbnail: { source: 'kule.jpg' } },
        '3': { index: 0, title: 'Nardis Jazz Club' },
      },
    },
  }

  it('takes the closest article with a photo, or the one named like the place', () => {
    expect(closestPhoto(json)).toBe('kule.jpg')
    expect(closestPhoto(json, 'Bereketzade çeşmesi')).toBe('cesme.jpg')
    // A café beside the tower gets no photo rather than the tower's.
    expect(closestPhoto(json, 'Kahve Dünyası')).toBeUndefined()
    expect(closestPhoto({ batchcomplete: '' })).toBeUndefined()
  })
})

describe('plainTitle', () => {
  it('starts a hand-made place with the shared name, never the link', () => {
    expect(plainTitle('Galata Kulesi | Beyoğlu/İstanbul | https://maps.app.goo.gl/x')).toBe('Galata Kulesi')
    expect(plainTitle('https://www.google.com/maps?q=Galata+Kulesi,+Beyo%C4%9Flu&ftid=0x1')).toBe('Galata Kulesi')
    expect(plainTitle('https://maps.app.goo.gl/x')).toBe('')
    expect(plainTitle('Kapadokya')).toBe('Kapadokya')
  })
})

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
    // What shared pins open after the short link's redirect.
    expect(parseGoogleMapsUrl('https://www.google.com/maps/search/5.811698,+-55.118891?entry=tts')).toEqual({
      title: undefined,
      latitude: 5.811698,
      longitude: -55.118891,
    })
    expect(
      parseGoogleMapsUrl('https://www.google.com/maps/place/30.956911,34.790920/data=!4m6!3m5!1s0!7e2!8m2!3d30.9569107!4d34.7909201'),
    ).toEqual({ title: undefined, latitude: 30.9569107, longitude: 34.7909201 })
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

describe('fromReverse', () => {
  const at = (json: unknown) => fromReverse(json, 41.0256, 28.9741)

  it('prefers the name of the place you are standing in', () => {
    const place = at({
      name: 'Galata Kulesi',
      osm_type: 'way',
      osm_id: 42,
      address: { city: 'İstanbul', country: 'Türkiye', road: 'Galata Kulesi Sk.' },
      extratags: { wikipedia: 'tr:Galata Kulesi' },
    })
    expect(place).toMatchObject({
      kind: 'place',
      title: 'Galata Kulesi',
      creator: 'İstanbul, Türkiye',
      latitude: 41.0256,
      longitude: 28.9741,
      externalId: 'way/42',
      wikipedia: 'tr:Galata Kulesi',
    })
  })

  it('falls back through the shop, the street and the neighbourhood', () => {
    expect(at({ address: { shop: 'Kahveci', road: 'İstiklal Cd.' } }).title).toBe('Kahveci')
    expect(at({ address: { road: 'İstiklal Cd.', suburb: 'Beyoğlu' } }).title).toBe('İstiklal Cd.')
    expect(at({ address: { suburb: 'Beyoğlu', city: 'İstanbul' } }).title).toBe('Beyoğlu')
  })

  it('still gives a usable place when the lookup says nothing', () => {
    expect(at({})).toMatchObject({ title: 'Buradayım', latitude: 41.0256, longitude: 28.9741 })
    expect(at(null).title).toBe('Buradayım')
  })
})
