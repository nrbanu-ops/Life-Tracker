# Life Tracker – Proje Talimatları

## Proje özeti
Kişisel kullanım için bir planner + habit tracker uygulaması (PWA). Üç ana parça:

1. Projeler/Hedefler: her projenin alt adımları (milestone) ve ilerlemesi
2. Günlük habit tracker: alışkanlıkları her gün tek dokunuşla işaretleme
3. İstatistik: habit ve proje ilerlemesinin görselleştirilmesi

Habit'ler isteğe bağlı olarak bir projeye bağlanabilir (ör. "Koşu" habit'i "Maraton" projesine). Bağımsız habit'ler de olabilir (ör. "Su içmek").
Tek kullanıcı, giriş/hesap sistemi yok.

## Teknoloji
- React + TypeScript + Vite
- Tailwind CSS (v4, `@tailwindcss/vite`; renkler `src/index.css` içindeki CSS değişkenlerinde)
- `vite-plugin-pwa` (offline çalışma, ana ekrana ekleme)
- Dexie.js (IndexedDB) ve `dexie-react-hooks` (`useLiveQuery`) ile veri saklama
- React Router
- date-fns (tarih işlemleri, hafta pazartesi başlar)
- Recharts (grafikler)
- Vitest (birim testleri)

Yeni bir kütüphane eklemeden önce kullanıcıya sor.

## Veri modeli
Tipler `src/db/types.ts`, Dexie şeması `src/db/db.ts` içinde. Tarihleri her zaman yerel saatle `YYYY-MM-DD` string olarak sakla, UTC dönüşümü yapma (`src/lib/date.ts`).

## Ekranlar (MVP)
1. Bugün (ana ekran): bugün planlanmış habit'ler tek dokunuşla işaretlenir; uzun basma veya ikinci dokunuş "minimum versiyon"; üstte günün tamamlanma oranı; aktif projelerin sıradaki milestone'ları.
2. Projeler: kartlar (başlık, renk, ilerleme çubuğu, hedef tarih); detayda milestone listesi (ekle, sırala, işaretle), bağlı habit'ler ve son 30 gündeki başarı oranları.
3. Habit'ler: ekleme/düzenleme/arşivleme, sıklık seçimi, projeye bağlama.
4. İstatistik: habit başına ısı haritası (son 12 ay), mevcut ve en uzun seri, haftalık/aylık başarı oranı, haftanın günlerine göre başarı oranı.
5. Ayarlar: verileri JSON olarak dışa/içe aktar.

Altta sabit sekme çubuğu (Bugün, Takvim, Projeler, Habit'ler, İstatistik). Günlük, Kütüphane, Zamanlayıcı ve Ayarlar köşede küçük ikonlar.

## Hesaplama kuralları
- Proje ilerlemesi: tamamlanan milestone / toplam milestone
- Seri (streak):
  - `daily` ve `weekdays`: sadece planlanan günler sayılır; planlanmamış günler seriyi bozmaz
  - `timesPerWeek`: hedefe ulaşılan ardışık haftalar sayılır
  - `minimum` durumu seriyi korur
  - Bugün henüz işaretlenmemişse seri bozulmuş sayılmaz
  - `skipped` (atlanan gün) seriyi bozmaz, planlanmamış gün gibi davranır
- Başarı oranı: tamamlanan / planlanan gün sayısı (`minimum` da tamamlanmış sayılır; `skipped` günler hesaba katılmaz)
- Habit türleri: `check` (tek dokunuş), `count` ve `duration` (günlük `target`'a ulaşınca `done`, altında `partial`)

Bu hesaplamalar `src/lib/stats.ts` içinde saf fonksiyonlar olarak yazılır ve Vitest ile test edilir.

## Tasarım
- Mobile-first, telefonda tek elle kullanılabilir
- Sade, sakin, minimalist; açık ve koyu tema (sistem ayarına göre)
- Bir habit'i işaretlemek en fazla 1 dokunuş olmalı
- Arayüz dili: Türkçe

## MVP'de OLMAYACAKLAR (sonraki aşamalar)
Vardiya/gün tipleri, ruh hali/enerji takibi, bulut senkronu (ileride Supabase), bildirimler, haftalık otomatik rapor. Veri modelini bunların sonradan eklenmesini zorlaştırmayacak şekilde tut, ama şimdi kodlama.

## Çalışma şekli
- Küçük adımlarla ilerle; her adımdan sonra uygulamanın çalıştığından emin ol (`npm run build`, `npm test`)
- Büyük bir değişiklikten önce kısa bir plan sun ve onay bekle
- Bileşenler `src/components`, ekranlar `src/pages`, veri katmanı `src/db`, yardımcı fonksiyonlar `src/lib`
- Kod ve değişken isimleri İngilizce, arayüz metinleri Türkçe

## Geliştirme sırası
1. ✅ Proje kurulumu (Vite, Tailwind, PWA, Dexie, Router) ve sekme çubuğu
2. ✅ Habit'ler: veri modeli, ekleme/düzenleme ekranı
3. ✅ Bugün ekranı: işaretleme ve minimum versiyon

2. aşama özellikleri (HelloHabit'ten esinlenerek, kullanıcının isteğiyle projelerden önce):
- A. ✅ Sayısal ve süreli habit'ler, günü atlama (uzun basınca seçenekler paneli)
- B. ✅ Bırakma habit'leri: bırakılan tarihten beri sayaç, dönüm noktaları, en uzun süre
- C. ✅ Zamanlayıcı: kronometre ve geri sayım, süreli habit'e otomatik ekleme (çalışan zamanlayıcı localStorage'da)
- D. ✅ Yapılacaklar: tarih, saat, 4 seviye öncelik, tekrar; Bugün ekranında görünür, tümü `/gorevler` sayfasında
- E. ✅ Takvim sekmesi: aylık görünüm, geçmiş günleri işaretleme (sekmeler: Bugün, Takvim, Projeler, Habit'ler, İstatistik)
- F. ✅ Günlük ve notlar (`/gunluk`, Bugün ve takvim gün detayında da görünür): habit'e not, serbest günlük yazısı, habit'e göre filtreli akış

4. ✅ Projeler ve milestone'lar, habit-proje bağlantısı (başarı oranı `src/lib/stats.ts` → `successRate`)
4b. ✅ Claude ile proje planlama: claude.ai Projesi için talimat metni (`src/lib/aiPlan.ts`, Ayarlar'dan kopyalanır) + uygulamada planı yapıştırıp içe aktarma. API kullanılmaz, ücretsiz.
4c. ✅ Kütüphane (`/kutuphane`, üst ikon): kitap/film/dizi/diğer; durum (istiyorum, devam ediyor, bitti), bitenlere 1–5 yıldız ve kısa yorum. Afişler: kitap Open Library, dizi TVmaze (anahtarsız), film TMDB (kullanıcının ücretsiz anahtarı, Ayarlar'da, localStorage). Kendi fotoğrafı `posterBlob` olarak küçültülüp saklanır (`src/lib/library.ts`, `src/db/library.ts`).
   - Durumlar: istiyorum, devam, bitti, bıraktım; "istiyorum" dışında puan ve yorum. Kitapta okunan dil (filtre, afişte Türkçe dışı etiket), ilerleme (sayfa / sezon-bölüm).
   - Tür olarak "Yer" de var (gittiğin yerler): elle eklenir, şehir/ülke, tek fotoğraf (kare), durum sadece gitmek istiyorum / gittim. Harita ve konum sonra.
   - Kütüphane içinde Raf / Takvim görünümü (bitirilen günler, ana takvimden bağımsız) ve yıllık tür başına hedef (`libraryGoals` tablosu).
5. İstatistik fonksiyonları (testlerle) ve İstatistik ekranı
6. JSON dışa/içe aktarma
7. Cila: koyu tema, boş ekran durumları, küçük animasyonlar
