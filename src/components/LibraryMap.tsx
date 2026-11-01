import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useRef } from 'react'
import type { LibraryItem } from '../db/types'

type Props = {
  /** Items with a position; others are left out. */
  items: LibraryItem[]
  onSelect: (id: string) => void
}

const TURKEY: L.LatLngTuple = [39, 35]

/** OpenStreetMap with a dot per place: filled when visited, hollow when still on the wish list. */
export default function LibraryMap({ items, onSelect }: Props) {
  const container = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const dots = useRef<L.LayerGroup | null>(null)
  const select = useRef(onSelect)
  select.current = onSelect

  useEffect(() => {
    if (!container.current) return
    const created = L.map(container.current, { scrollWheelZoom: true }).setView(TURKEY, 5)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      className: 'map-tiles',
    }).addTo(created)
    dots.current = L.layerGroup().addTo(created)
    map.current = created
    return () => {
      created.remove()
      map.current = null
    }
  }, [])

  // Redraw only when the places themselves change, so the view doesn't jump on unrelated updates.
  const signature = items.map((i) => `${i.id}:${i.latitude},${i.longitude}:${i.status}:${i.title}`).join('|')
  useEffect(() => {
    const layer = dots.current
    if (!map.current || !layer) return
    layer.clearLayers()
    const placed = items.filter((i) => i.latitude !== undefined && i.longitude !== undefined)
    for (const item of placed) {
      L.circleMarker([item.latitude as number, item.longitude as number], {
        radius: 8,
        weight: 2,
        className: `place-dot ${item.status === 'done' ? 'is-visited' : 'is-wish'}`,
      })
        .bindTooltip(item.title, { direction: 'top', offset: [0, -6] })
        .on('click', () => select.current(item.id))
        .addTo(layer)
    }
    if (placed.length > 0) {
      const bounds = L.latLngBounds(placed.map((i) => [i.latitude as number, i.longitude as number]))
      // A single place shows its surroundings rather than its streets.
      map.current.fitBounds(bounds, { padding: [32, 32], maxZoom: placed.length === 1 ? 9 : 12 })
    }
    // `items` is read through the signature on purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature])

  return (
    <div
      ref={container}
      className="h-[60dvh] overflow-hidden rounded-2xl border border-border"
      role="region"
      aria-label="Gittiğin yerlerin haritası"
    />
  )
}
