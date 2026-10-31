# Life Tracker

Kişisel planlayıcı, habit tracker ve hayat günlüğü. Tek kullanıcı, hesap yok. Bütün veriler kendi
cihazında kalır (IndexedDB).

- **Bugün:** günlük ve haftalık hedefleri tek dokunuşla işaretle, minimum versiyon, günü atlama
- **Projeler:** hedefler, adımlar (milestone), bağlı habit'ler. **Claude** ya da **Gemini** ile sohbet ederek planla
- **Takvim, Görevler, Günlük, Zamanlayıcı**
- **Kütüphane:** kitap, film, dizi ve gittiğin yerler; afişler, puan, harita
- **İstatistik:** ısı haritası, seriler, haftalık/aylık oranlar
- **Yedekleme:** JSON indir/geri yükle, otomatik yedek

## Kullanım

| Nerede | Nasıl |
|---|---|
| Telefon (Android) | [Releases](../../releases/latest) → `LifeTracker.apk` kur. Ayrıntılar: [docs/ANDROID.md](docs/ANDROID.md) |
| Bilgisayar / iPhone | [nrbanu-ops.github.io/Life-Tracker](https://nrbanu-ops.github.io/Life-Tracker/) adresini aç, tarayıcıdan "Uygulamayı yükle / Ana ekrana ekle" |

Güncellemeler kendiliğinden gelir: `main`'e her push siteyi yeniden yayınlar, uygulama yeni sürüme kendisi geçer.

## Yapay zeka ile planlama

Ayarlar'dan ikisi de ayrı ayrı açılıp kapatılabilir:

- **Gemini asistanı:** uygulamanın içinde sohbet. Kendi ücretsiz anahtarını
  [aistudio.google.com/apikey](https://aistudio.google.com/apikey) adresinden alıp Ayarlar'a yapıştırırsın.
- **Claude ile planlama:** claude.ai'deki bir Projeye talimat yapıştırırsın, planı uygulamaya geri kopyalarsın. Anahtar gerekmez.

Anahtarlar (Gemini, TMDB) **sadece cihazında** saklanır, yedeğe ve depoya girmez.

## Geliştirme

```bash
npm install
npm run dev      # http://localhost:5173
npm test
npm run build
```

React + TypeScript + Vite, Tailwind v4, Dexie (IndexedDB), React Router, date-fns, Recharts, Leaflet,
vite-plugin-pwa. Proje kuralları ve mimari: [CLAUDE.md](CLAUDE.md).

| Klasör | İçerik |
|---|---|
| `src/` | Web uygulaması (`components`, `pages`, `db`, `lib`) |
| `android/` | Android kabuğu (WebView + küçük köprü) |
| `.github/workflows/` | `deploy` (Pages), `android` (APK → Release) |
