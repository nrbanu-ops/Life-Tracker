/**
 * The picture behind every screen: soft bands flowing down the page, in the palette's own
 * colours (src/index.css gives each band its fill). Two layers of it drift a few pixels
 * against each other, which is all the motion there is. A fixed layer rather than
 * background-attachment: fixed, which Android's WebView scrolls anyway.
 *
 * Each band is filled from its curve to the bottom, so the lower five simply sit on top of
 * the upper five; the paths run well past the 900-wide view box on both sides so that the
 * drift never shows an edge. Palettes with drawn artwork of their own hide these layers.
 */
const BANDS = [
  'M -120 214.5 C 240.7 -19.2, 509.8 48.1, 708.0 -136.9 C 773.3 -341.4, 850.1 217.8, 1020 42.5',
  'M -120 280.6 C 153.1 172.2, 324.3 197.3, 450.4 111.4 C 603.3 16.5, 783.1 208.4, 1020 127.0',
  'M -120 414.4 C 65.4 192.8, 138.4 359.8, 192.3 184.3 C 432.9 -9.6, 716.0 528.7, 1020 362.4',
  'M -120 665.3 C 100.9 469.3, 213.7 548.3, 296.8 393.1 C 501.9 221.5, 743.2 719.7, 1020 572.7',
  'M -120 767.4 C 209.8 650.5, 444.2 728.4, 617.0 635.8 C 713.2 533.5, 826.4 824.9, 1020 737.2',
  'M -120 863.5 C 238.7 615.6, 505.5 876.5, 702.1 680.2 C 769.4 463.3, 848.5 1123.4, 1020 937.4',
  'M -120 1119.8 C 147.0 967.3, 311.3 1015.6, 432.4 894.9 C 591.4 761.5, 778.4 1116.7, 1020 1002.4',
  'M -120 1271.1 C 63.7 1122.4, 135.0 1151.3, 187.5 1033.6 C 429.7 903.5, 714.7 1217.9, 1020 1106.4',
  'M -120 1338.5 C 106.1 1089.3, 224.7 1301.6, 312.0 1104.3 C 511.9 886.2, 747.1 1482.8, 1020 1295.9',
  'M -120 1575.2 C 214.5 1456.1, 454.2 1484.6, 630.8 1390.3 C 722.3 1286.1, 830.0 1530.1, 1020 1440.8',
]

/** How many bands the back layer holds; the rest drift in front of it. */
const BACK = 5

function Layer({ from, to, className }: { from: number; to: number; className: string }) {
  return (
    <svg className={`backdrop-waves ${className}`} viewBox="0 0 900 1800" preserveAspectRatio="xMidYMid slice">
      {BANDS.slice(from, to).map((curve, i) => (
        // Far below the view box, so a layer that has drifted upwards still covers the bottom.
        <path key={curve} d={`${curve} L 1020 2100 L -120 2100 Z`} className={`wave-${from + i + 1}`} />
      ))}
    </svg>
  )
}

export function Backdrop() {
  return (
    <div className="app-backdrop" aria-hidden>
      <Layer from={0} to={BACK} className="backdrop-back" />
      <Layer from={BACK} to={BANDS.length} className="backdrop-front" />
    </div>
  )
}
