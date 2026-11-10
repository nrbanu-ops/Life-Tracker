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
- Leaflet (kütüphanedeki yer haritası; react-leaflet yok, doğrudan kullanılıyor)
- Vitest (birim testleri)
- Android kabuğu: `android/` (Gradle, Java, WebView; kütüphane yok). APK GitHub Actions'ta derlenir.

Yeni bir kütüphane eklemeden önce kullanıcıya sor.

## Veri modeli
Tipler `src/db/types.ts`, Dexie şeması `src/db/db.ts` içinde. Tarihleri her zaman yerel saatle `YYYY-MM-DD` string olarak sakla, UTC dönüşümü yapma (`src/lib/date.ts`).

## Ekranlar (MVP)
1. Bugün (ana ekran): bugün planlanmış habit'ler tek dokunuşla işaretlenir; uzun basma veya ikinci dokunuş "minimum versiyon"; üstte günün tamamlanma oranı; aktif projelerin sıradaki milestone'ları. Habit'ler "Günlük hedefler" (her gün / belirli günler) ve "Haftalık hedefler" (haftada X kez) olarak ayrı listelenir; halka sadece günlükleri sayar, haftalıkların kendi "bu hafta x/y" sayacı var (`isWeeklyGoal`, `weekProgress`). Habit'ler sayfası da aynı gruplarla.
2. Projeler: kartlar (başlık, renk, ilerleme çubuğu, hedef tarih); detayda milestone listesi (ekle, sırala, işaretle), bağlı habit'ler ve son 30 gündeki başarı oranları.
3. Habit'ler: ekleme/düzenleme/arşivleme, sıklık seçimi, projeye bağlama.
4. İstatistik: habit başına ısı haritası (son 12 ay), mevcut ve en uzun seri, haftalık/aylık başarı oranı, haftanın günlerine göre başarı oranı.
5. Ayarlar: verileri JSON olarak dışa/içe aktar.

Altta sabit sekme çubuğu (Bugün, Takvim, Projeler, Habit'ler, İstatistik). Başlıkta (`PageHeader`) üç düğme: Ara, Günlük ve "Daha fazla" — sonuncusu Kütüphane, Başarımlar, Zamanlayıcı ve Ayarlar'ı adlarıyla listeleyen bir `BottomSheet` açar.

**Bugün'ün sırası** (habit işaretlemek kaydırmasız olsun diye): halka → zor gün satırı → habit grupları → hatırlatma yuvası → haftalık plan → görevler → seviye kartı → bıraktıkların → proje adımları → anı kartı → günlük. **Hatırlatma yuvası** tek bir `div`: içine sırayla `FreezeCard`, `WeekPlanCard variant="prompt"`, `BackupReminder`, `MonthReviewCard`, `SundayReviewNudge`, `YearReviewCard` konur; her biri vakti değilse hiçbir şey çizmediği için CSS (`[&>*:not(:first-child):not(dialog)]:hidden`) yalnızca ilk çizileni gösterir. Yeni bir hatırlatma kartı buraya, önem sırasındaki yerine eklenir.

Dokunma alanları: yazı görünümlü düğmeler `.tap-text` (44 px yükseklik) ya da dar satırlarda `.tap-reach` (görünmez genişletme) sınıfını kullanır (`src/index.css`). Habit formunda ad, tür ve sıklık dışındaki her şey "Daha fazla seçenek" altında katlıdır. Ayarlar beş `SettingsGroup`'a katlıdır (aynı anda biri açık); `/ayarlar#<bölüm id>` bağlantıları `GROUP_OF` ile doğru grubu açıp bölüme kaydırır — yeni bir bölüm eklenince id'si bu tabloya yazılır.

Ayarlar → **Bugün ekranı** (`TodaySection`, `src/lib/todaySetting.ts`): cihaza özel, yedeğe girmeyen görünüm anahtarları. "Tamamlananları gizle" açıkken Bugün'de işaretlenmiş habit'ler listeden çıkar ve her grubun altında `✓ n tamamlandı · göster` satırı kalır (`splitDone`, grup grup açılır); halka ve yüzde değişmez, çünkü gizleme sadece görünümü değiştirir. "Odak modu" açıkken `Habit.focus` ile işaretlenmiş en fazla `FOCUS_MAX` (3) habit üstte **Omurga** başlığı altında durur, gerisi tek bir `Diğerleri (n)` düğmesinin arkasına katlanır (`splitFocus`); halka ve haftalık sayaç yine bütün habit'leri sayar. Omurga kutusu habit formunda, 3 dolunca kapanır.

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
- Proje rengi habit'lerde "renkli tik" olarak görünür: satır ve işaretlenmemiş daire tek tip kalır, işaretlenince (yapıldı / minimum / kısmi halka) daire projenin rengini alır. Satırları boyama (kullanıcı beğenmedi). Proje rengi ayrıca proje kartı/detayında ve görevlerdeki küçük noktada.

## MVP'de OLMAYACAKLAR (sonraki aşamalar)
Vardiya/gün tipleri, bulut senkronu (ileride Supabase), haftalık otomatik rapor. Veri modelini bunların sonradan eklenmesini zorlaştırmayacak şekilde tut, ama şimdi kodlama.

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
- E. ✅ Takvim sekmesi: aylık görünüm, geçmiş günleri işaretleme (sekmeler: Bugün, Takvim, Projeler, Habit'ler, İstatistik). Gün hücresinin altında işaretler: o günün ruh hali yüzü, mavi nokta = açık görev, sarı nokta = o gün günlüğe bir şey yazılmış (günlükte sadece `date` indeksi okunur, kayıtlar değil — yoksa ayın bütün fotoğrafları belleğe gelirdi; ruh hali kayıtları küçük olduğu için tamamı okunur). `?gun=YYYY-MM-DD` ile belirli bir gün açılır (anı kartı buraya bağlanır)
- F. ✅ Günlük ve notlar (`/gunluk`, Bugün ve takvim gün detayında da görünür): habit'e not, serbest günlük yazısı, habit'e göre filtreli akış

4. ✅ Projeler ve milestone'lar, habit-proje bağlantısı (başarı oranı `src/lib/stats.ts` → `successRate`)
4b. ✅ Claude ile proje planlama: claude.ai Projesi için talimat metni (`src/lib/aiPlan.ts`, Ayarlar'dan kopyalanır) + uygulamada planı yapıştırıp içe aktarma. API kullanılmaz, ücretsiz.
4c. ✅ Kütüphane (`/kutuphane`, üst ikon): kitap/film/dizi/oyun/diğer (oyun araması İngilizce Wikipedia'dan, anahtarsız, kapak sayfanın ana resmi); durum (istiyorum, devam ediyor, bitti), bitenlere 1–5 yıldız ve kısa yorum. Afişler: kitap Open Library, dizi TVmaze (anahtarsız), film TMDB (kullanıcının ücretsiz anahtarı, Ayarlar'da, localStorage). Kendi fotoğrafı `posterBlob` olarak küçültülüp saklanır (`src/lib/library.ts`, `src/db/library.ts`).
   - Durumlar: istiyorum, devam, bitti, bıraktım; "istiyorum" dışında puan ve yorum. Kitapta okunan dil (filtre, afişte Türkçe dışı etiket), ilerleme (sayfa / sezon-bölüm).
   - Tür olarak "Yer" de var (gittiğin yerler): şehir/ülke, tek fotoğraf (kare), durum sadece gitmek istiyorum / gittim. Arama OpenStreetMap Nominatim ile (anahtarsız, en fazla saniyede 1 istek), ünlü yerlere Wikipedia fotoğrafı; Google Haritalar uzun linki yapıştırılabilir (`src/lib/places.ts`). **Buradayım**: yer eklerken tek dokunuşla bulunduğun nokta (`src/lib/geo.ts` → `currentPosition`, `places.ts` → `placeHere`/`fromReverse`; OSM ters arama, bulunamazsa sadece koordinat); adı düzenlenebilir formda açılır, durumu "gittim". Kütüphanede Harita görünümü (Leaflet, OSM karoları, sadece açılınca yüklenir).
   - Kütüphane içinde Raf / Takvim görünümü (ana takvimden bağımsız; takvim tür filtresine bakmaz, bütün türler birlikte: bitenler dolu, başlananlar halka nokta, tür rengiyle, `libraryDays`) ve yıllık tür başına hedef (`libraryGoals` tablosu).
5. ✅ İstatistik: `src/lib/stats.ts` (`streaks`, `dayStates`, `weekdayRates`, `weeklyRates`, `monthlyRates`, `overallRate`, testli). Ekran: son 30 gün / bu hafta / en iyi seri, habit seçici, 12 aylık ısı haritası, haftalık-aylık ve haftanın günleri grafikleri (Recharts), bırakma habit'leri ve projeler özeti.
6. ✅ Yedekleme (Ayarlar): JSON indir / geri yükle (fotoğraflar data URL olarak), otomatik yedek: kullanıcının seçtiği dosyaya File System Access API ile değişiklikten sonra yazılır (`src/db/backup.ts`, `meta` tablosu; izin düşerse üstte "Devam ettir" şeridi). `navigator.storage.persist()` istenir. Sıfırlama (`resetHabitsAndProjects`) **sadece habit/proje tarafını** siler: `habits`, `habitLogs`, `projects`, `milestones`, `projectAchievements`, `achievements`, `xpWeeks` ve `meta.xpDirtyWeeks`. Günlük (habit notları dahil — günlükte "Silinmiş habit" olarak görünürler), görevler, ruh hali, kütüphane, haftalık planlar ve `meta`'daki ayarlar kalır. Günlük/görev/kütüphane de XP kazandırdığı için sıfırlama `meta.xpFrom`'u bugüne kurar ve hesap oradan başlar (`startXpFrom`, `firstDay(data, today, from)`), yoksa seviye kalan veriden kendiliğinden geri gelirdi; duran veriden kazanılan başarımlar (ör. `first-journal`) aynı gün yeniden kazanılır. Geri yükleme ve sıfırlama, mevcut veriyi önce ayrı bir dosyaya yazar (`saveSafetyCopy`, `safetyFileName`; `life-tracker-geri-yuklemeden-once-<tarih>.json` / `...sifirlamadan-once-...`): kopya yazılamazsa işlem yapılmaz, kullanıcı isterse kopyasız devam eder. Bu kopya `lastBackupAt`'i güncellemez. Bugün'de yedek hatırlatması (`BackupReminder`, kural `backupReminder` testli): son yedek 7 günden eskiyse ya da hiç yoksa ilk kullanımdan 3 gün sonra. Kural otomatik yedeğin açık olmasına değil **gerçekten yazılmış olmasına** bakar: sessizce başarısız olan otomatik yedek tam da uyarının susturulmaması gereken durum. Başarısız yazma `backupNow` → `'failed'` olarak döner ve `BackupManager` üstte kırmızı şerit gösterir; "Sonra" 3 gün erteler (`meta.backupSnoozedUntil`). Ayarlar'da ayrıca Depolama kartı (`StorageSection`): `navigator.storage.estimate()` ile kullanılan yer ve oran (%80 üstünde kırmızı uyarı), kalıcı depolama durumu ve isteme butonu, istenince fotoğraf sayısı/boyutu ve en ağır günler (`src/lib/storage.ts` saf fonksiyonlar + `src/db/storage.ts`; fotoğrafları tartmak hepsini okuduğu için sadece butona basınca çalışır).
7a. ✅ Hata görünürlüğü: yönlendirilen ekran `ErrorBoundary` içinde (`src/components/ErrorBoundary.tsx`) — Dexie okuması ya da tembel yüklenen dosya patlarsa boş ekran yerine mesaj, "Yenile" ve "Hatayı kopyala" çıkar. Yeni sürüm yayınlandıktan sonra eski sayfanın artık olmayan dosyayı istemesi (`vite:preloadError`) oturumda bir kez sayfayı yeniler (`src/main.tsx`). Fotoğraf okunamazsa `PhotoPicker` gerçek sebebi yazar (telefonun hiç okuyamadığı dosya boş geldiği için ayrıca söylenir); `shrinkImage` önce `createImageBitmap` (EXIF yönü dahil), olmazsa `<img>` ile dener. Günlük kaydı başarısız olursa sebebi görünür: `JournalComposer` ve `EntrySheet` kaydetmeyi `try/catch` içine alır ve `src/lib/saveError.ts` (testli; `isQuotaError` Dexie'nin sardığı DOMException'a da bakar) mesajı üretir — yer sorunuysa Ayarlar → Depolama'ya yönlendirir. Fotoğraf/ses bir günlük yazısının binlerce katı yer tuttuğu için kaydetmenin gerçekten patlayabildiği tek yer burası, ve eskiden "Kaydet" sessizce kilitleniyordu. (Ayarlar'daki **Tanılama** bölümü fotoğraf hatası çözüldükten sonra kaldırıldı; gerekirse git geçmişinde duruyor.)
7. ✅ Cila: sayfalar lazy yüklenir (Recharts sadece İstatistik'te), sayfa geçişinde hafif belirme, butonlarda basma efekti, koyu tema kontrol edildi.

8. ✅ Gemini asistanı: `/asistan` sayfasında kullanıcının kendi Gemini anahtarıyla sohbet (`src/lib/gemini.ts`, `src/lib/assistant.ts`); aynı planlama talimatı, cevaptaki json bloğu "Gözden geçir ve ekle" kartına döner (`PlanPreview`). Ayarlar'da Gemini ve Claude ayrı ayrı açılıp kapanır; anahtar localStorage'da, yedeğe girmez.
9. ✅ Yayın ve telefon: GitHub'da herkese açık depo. `deploy` iş akışı her push'ta test + build edip GitHub Pages'e yayınlar (`BASE_PATH=/<repo>/`); service worker yeni sürümü kendisi alır (`src/main.tsx`). Android kabuğu `android/` (WebView, bağımlılıksız Java; `window.LifeTrackerAndroid` köprüsü: dosya kaydetme ve İndirilenler'e otomatik yedek, `src/lib/android.ts`; dosya seçiminin sonucu `ClipData` dahil kendimiz okunur (`chosenFiles`), `multiPhoto()` bunu web tarafına bildirir; konum izni `onGeolocationPermissionsShowPrompt` ile Android'in kendi iznine bağlanır, `onPermissionRequest` ise her şeyi reddeder (uygulama kamera/mikrofon istemiyor ve `RECORD_AUDIO` izni de yok); günlük hatırlatma `Reminders`/`ReminderReceiver` ile AlarmManager'da, yeniden başlatmada `BOOT_COMPLETED` ile kurulur); `android` iş akışı APK'yı Release'e koyar. Ayrıntılar `docs/ANDROID.md`.

10. ✅ Başarımlar (`/basarimlar`, üst kupa ikonu): genel başarımlar kod içinde tanımlı ve verilerden hesaplanır (`src/lib/achievements.ts`, testli; seriler, toplam, mükemmel gün, bırakma, projeler, kütüphane, görev/günlük; basamaklı olanlardan kazanılanlar + sıradaki gösterilir). Kazanılanlar `achievements` tablosunda kalır (seri bozulsa da gitmez); kazanılınca üstte kısa bildirim (`AchievementWatcher`). Projelere özel başarımları kullanıcı girmez: her projede otomatik 4 tane (ilk adım, yarı yol, tamamlandı, erken bitirme) + yapay zekanın belirledikleri (`projectAchievements`; koşullar: adım, habit serisi/toplamı, ilerleme %, görev sayısı). Plan json'undaki `achievements` içe aktarılırken başlıklar id'ye çevrilir; plansız projelerde Gemini açıksa proje detayı ilk açılışta bir kez sorar, "Yeniden belirle" kazanılmamışları değiştirir.

11. ✅ Günlük eklentileri: günlük ruh hali ve enerji (1–5, `moods` tablosu, Bugün ve gün detayında `MoodPicker`; İstatistik'te ortalama, çizgi grafik ve habit'lerle bağlantısı `src/lib/mood.ts` → `habitEffects`, her iki tarafta en az 3 gün); günlük yazısına fotoğraf (`photos` Blob dizisi, en fazla 10, 1200 px; eski tek `photo` alanı `entryPhotos` ile hâlâ okunur; **çoklu seçim kabuk destekliyorsa açılır** — `canPickSeveral`/`supportsMultiPhoto`, çünkü Android'de galeri çoklu seçimi `ClipData` ile döndürür ve WebView'in `parseResult`'ı oraya bakmadığı için sayfaya hiçbir dosya gelmez; kabuk `chosenFiles` ile kendisi okur ve `multiPhoto()` ile bunu bildirir, eski kabukta fotoğraflar tek tek seçilir); Günlük sayfasında Yazılar/Fotoğraflar geçişi (`JournalGallery`, `photosByMonth`; filtre ve arama galeride de geçerli). **Akış sayfalanır (10 gün, "Daha eskisini göster")** ve `BlobImage` `loading="lazy"` kullanır: bir günde 10 fotoğraf olabildiği için hepsini birden çözmek telefonda WebView'i öldürüyordu; **ses notu kaldırıldı** (kullanıcının telefonunda Android mikrofonu hiçbir yolla açmadı — izin verilmiş hâlde, beklemeli tekrar ve yankı engellemesiz istek dahil denendi, hepsi `NotReadableError`; hiç çalışmayan bir buton yokundan kötü. Kayıt alma, `AudioRecorder`, mikrofon izni ve kabuktaki `RECORD_AUDIO` gitti). Daha önce kaydedilmiş notlar korunuyor: `audio` Blob + `audioSeconds` tipte, yedekte, yıl özetinde ve depolama raporunda duruyor; `AudioNote` akışta çalıyor ve not düzenlemede silinebiliyor, `src/lib/audio.ts` sadece `formatDuration`; günlükte arama; Bugün'de "1 yıl / 6 ay / 1 ay / 1 hafta önce bugün" kartı (`memoryFor`); Gemini haftalık bakış (`src/lib/review.ts`, günlüğe `kind: 'review'` olarak kaydedilir; Günlük sayfasında buton, Pazar günleri Bugün'de hatırlatma).
   - Yer ekleme: Google Haritalar uygulamasında Paylaş → Kopyala metni yapıştırılabilir; kısa link (maps.app.goo.gl) açılamadığı için metindeki ad ve adres OpenStreetMap'te aranır (`sharedPlaceQueries`).

12. ✅ Seviye sistemi (Solo Leveling'den esinlenerek; Ayarlar'dan kapatılabilir, `src/lib/levelingSetting.ts`): XP, seviye, rank (E→S), statlar (Güç, Zekâ, Dayanıklılık, Duyu, Disiplin), günlük görev (günün en zor 5 günlük habit'i). Hesap saf fonksiyonlarda, testli: `src/lib/leveling.ts`.
   - Zorluk = bir seferlik efor (Hafif 5 / Orta 12 / Ağır 25 / Zorlu 40 XP); sıklık zorluğa girmez. Seviye eğrisi `xpToNext` = 60·n^1,1: düzenli kullanıcı 1 haftada Lv 3, 1 ayda 6, 1 yılda ~23. Uygulama karar verir: süreli habit'te dakika (fiziksel ise bir kademe yukarı), yoksa addaki kelime, yoksa Orta. Kullanıcı habit formunda değiştirebilir; değişiklik `effortLog` ile o günden itibaren geçerli.
   - Adalet kuralları: düşük başarı XP'yi artırmaz (plan şişirme ödüllenmez), sadece ustalık (90 gün ≥%95) azaltır; seri bonusu en fazla +%50; geri dönüş bonusu (3 planlı gün kaçırınca) haftada bir; günlük habit XP'si 150'den sonra yarım; haftalık hedefin üstü yarım; geç işaretleme (`HabitLog.loggedAt`) son 7 gün %75, daha eskisi %25.
   - Biten haftalar `xpWeeks` tablosunda dondurulur (habit silinse ya da kurallar değişse de XP gitmez); eski bir gün değişirse o hafta yeniden hesaplanır. Arayüz: Bugün'de `LevelCard`, `LevelWatcher` (+XP, seviye/rank bildirimi), `/profil`.
   - Haftalık acil görev (son 4 haftada en çok aksatılan habit ya da 4 gün günlük, +100 XP) ve 14 unvan.
   - Ceza (Ayarlar'dan kapatılabilir, `meta.penaltyFrom` = açıldığı gün, geçmişe dönük değil): planlanıp yapılmayan günlük habit taban XP'si kadar eksi (seri bonusu yok), kısmi yarısı; atlanan ve minimum cezasız; haftalık hedefte eksik her kez hafta sonunda; bugün hiç cezalanmaz, arşivli habit'ler de; günde en fazla 100. Ceza sadece toplamı düşürür (seviye/rank düşebilir), statları değil. Sabah `LevelWatcher` dünün cezasını günde bir kez pencerede gösterir.
   - Başarım 25 XP; sadece bir şey eklemekle kazanılanlar (ilk habit, ilk proje) XP vermez; Gemini haftalık bakışı günlük sayılmaz. `LevelWatcher` en yüksek noktayı hatırlar: işareti kaldırıp tekrar koymak yeni "+XP" ya da ikinci seviye atlama göstermez.
   - Görünüm "sistem penceresi": seviye parçaları köşeli, çizgili ve iki temada da koyu (`SystemWindow`, `.sys-window`, `--color-sys-*` renkleri `index.css`'te); rengi seçili palete göre değişir (bkz. 13) ve normalde açık temada da koyu kalır; tek istisna Gökkuşağı, orada pencere de aydınlık (krem zemin, mavi kenar, acil görev kırmızı). Rank rozeti rank rengindeki eşkenar dörtgen (`src/lib/levelingUi.ts`); rank renkleri temadan bağımsız. Arka plan resmi CSS'te paletin rengine boyanır (`background-blend-mode: color`).

13. ✅ Renk temaları (Ayarlar → Renk teması): 8 palet (Orman varsayılan, Gökkuşağı, Şeker, Pembe, Gün batımı, Turkuaz, Okyanus, Lavanta). Açık/koyu yine sistem ayarına bağlı; palet sadece renkleri seçer, her ikisinde de. Her palet `:root[data-palette='<id>']` bloğunda, yazmadığı değişken varsayılandan gelir (`src/index.css`); liste ve seçim `src/lib/theme.ts` + `ThemeSection`, tercih localStorage'da (yedeğe girmez), `index.html`'deki küçük script ilk boyamadan önce uygular, `theme-color` da palete göre güncellenir. Palet `--color-sys-*`'i de değiştirir (koyu modda her şey tek renk olmasın diye) ve arka plan fotoğrafının boyandığı rengi (`--color-backdrop-tint`). Testler TS listesiyle CSS'in ayrışmadığını kontrol eder. Gökkuşağı istisna: koyu karşılığı yok, telefon koyu moddayken de aydınlık kalır ([data-palette] karanlık media bloğundaki düz :root'u yener; `color-scheme: light`, harita karoları ters çevrilmez, arka planı `src/assets/bg-wave.svg` çizimi). Rank renkleri de `--color-rank-*` değişkeninden gelir (`src/lib/levelingUi.ts`), aydınlık palet koyulaştırır.

14. ✅ Yıl özeti (`/ozet`): bir yılın tek sayfalık dökümü — aktif gün sayısı, habit işareti, kusursuz gün, biten görev, günlük yazısı/kelime/fotoğraf/ses, XP, başarım, en çok yapılan habit, yılın en uzun serisi, en çok yazılan ay, ruh hali ortalaması ve en iyi ay (en az 5 günlük aylar), bitirilen kütüphane öğeleri türe göre ve 5 yıldızlılar, biten proje/adım. Hesap saf fonksiyonda (`src/lib/yearReview.ts`, testli; `yearSummary`, `yearDays`, `yearsIn`, `yearCardFor`), okuma `src/db/yearReview.ts` (günlük ve kütüphane `each` ile tek tek okunup sayıya indirgenir — fotoğraflar ve sesler belleğe alınmaz). Giriş: İstatistik sayfasının üstünde bağlantı, Aralık–15 Ocak arası Bugün'de kart (`YearReviewCard`, `?yil=` ile o yıl açılır). Birden çok yıl varsa üstte yıl seçici.

15. ✅ Günlük hatırlatma (Ayarlar → Günlük hatırlatma, **sadece Android uygulamasında**): seçilen saatte bildirim. Tercih cihazda (`src/lib/reminders.ts`, localStorage, yedeğe girmez), zamanlama kabukta: `setInexactRepeating` (saniyesi saniyesine değil — tam alarm izni istememek için), `BOOT_COMPLETED` ile yeniden kurulur, Android 13+ bildirim izni ilk açışta istenir. Köprü: `setReminder(hour, minute, text)` / `clearReminder()` / `remindersAvailable()`; eski kabuklarda yok, o yüzden bölüm `supportsReminders` ile gizlenir. Tarayıcıda hiç görünmez (bir web sayfası telefonu uyandıramaz).

22. ✅ Aylık bakış (`src/lib/monthReview.ts` testli, `MonthReviewCard`): geçen takvim ayı ile ondan önceki ay, habit başına `successRate` ile karşılaştırılır — genel oran ve puan farkı, en iyi giden, en çok artan/düşen (fark en az `NOTABLE_CHANGE` = 10 puan; iki ayda da en az `MONTH_MIN_PLANNED` = 5 planlı gün), ve oranı `SHRINK_BELOW` (%30) altında kalanlar "küçült ya da arşivle" olarak (en fazla 3). Arşivli ve bırakma habit'leri yok; geçen ay hiç planlı gün yoksa kart çıkmaz. İstatistik'in üstünde hep var; Bugün'de ayın ilk `MONTH_CARD_DAYS` (7) günü, "Kapat" o ay için susturur (localStorage). Okuma sadece o iki ayın `habitLogs` aralığı.

21. ✅ Zor gün modu (`hardDays` tablosu, db v14, anahtar gün; `src/lib/hardDay.ts` testli, `src/db/hardDay.ts`, `HardDayToggle`): sadece bugün için açılır, ayda `HARD_DAYS_PER_MONTH` (3), kapatınca hak geri gelir. Açıkken Bugün'de dokunuş `hardTap` ile çalışır: check habit boş → minimum → done → boş; count/duration'da hedefin altı `partial` değil `minimum`. Açılırken o günün `partial` kayıtları `minimum`'a çevrilir. XP tarafında `XpData.hardDays`: zor günde kaçan **günlük** habit'e ceza yazılmaz (`habitEvents`); haftalık hedef cezası haftaya bakar, değişmez. **Seriyi korumaz** — minimum yapılmazsa seri kırılır, amaç küçük adımı attırmak. Habit/proje sıfırlaması bu tabloyu da temizler.

20. ✅ Tetikleyici ve günün bölümü (`Habit.when`: `DayPart` = morning | day | evening, `Habit.cue`: serbest metin; bırakma habit'lerinde yok). Bugün listesi `sortByDayPart(items, partOfDay(saat))` ile sıralanır (`src/lib/today.ts`, testli): şu anki bölüm → saati olmayanlar → günün ilerisi → vakti geçenler; her dilimin içinde kayıtlı sıra korunur. Sabah 12'ye kadar, akşam 18'den sonra. Gizleme yok, sadece sıralama: odak modu ve "tamamlananları gizle" zaten iki katlama getiriyor. Bölüm ve tetikleyici `HabitCheckRow`'da işaretlenmemiş satırın altında görünür.

19. ✅ "Neden" notu (`Habit.why`, habit formunda, en fazla 140 karakter): habit'in bırakılmak üzere olduğu anlarda geri gösterilir — `HabitActionSheet`'in başında (günün atlandığı yer), `FreezeCard`'da teklifin altında ve `QuitSheet`'te "tekrar başladım" onayından hemen önce. Projelere ayrı alan eklenmedi: `Project.description` zaten "neden önemli" diye soruyor ve proje detayında görünüyor.

18. ✅ Seri koruması (`HabitLogStatus` → `'frozen'`): kaçırılmış bir günü tutar. Seriyi **atlama gibi** korumaz-bozmaz (`isExcused` = skipped | frozen; `streaks`, `leveling`, `yearReview.longestStreak`, günlük görev), ama **başarı oranında yapılmadı sayılır** (`successRate`, `weekdayRates` dokunulmadı) — atlamadan farkı bu, sayılar dürüst kalsın diye. XP yok, ceza yok. Ayda `FREEZE_PER_MONTH` (2) hak, ayrı veri tutulmadan o ayın `frozen` kayıtları sayılarak (`src/lib/freeze.ts`, testli). `freezeOffers` her habit için **en son** kaçan planlı günü bulur (en fazla `FREEZE_WINDOW_DAYS` = 7 gün geriye) ve öncesindeki seri `FREEZE_MIN_STREAK`'ten (3) kısaysa teklif etmez — ikinci kez kaçırıldıysa seri zaten gitmiştir. Haftalık hedefler kapsam dışı (tek gün onları kırmaz). Arayüz: Bugün'de `FreezeCard` (en fazla 2 teklif, "Şimdi değil" bugünlük susturur, localStorage), geçmiş günde `HabitActionSheet` → "Seriyi koru"; ısı haritasında kendi hücresi.

17. ✅ Haftalık planlama (`weekPlans` tablosu, db v12, anahtar = pazartesi gün anahtarı): haftanın en fazla `WEEK_PLAN_MAX` (3) önceliği (`{ text, done }`) ve isteğe bağlı not. Bugün'de `WeekPlanCard`: plan varsa öncelikler tek dokunuşla işaretlenir, yoksa pazar/pazartesi "Bu haftayı planla" kartı, diğer günlerde tek satır (`planPrompt`). Düzenleme `WeekPlanSheet` içinde, form her açılışta sıfırdan kurulur. Kurallar saf ve testli (`src/lib/weekPlan.ts`): `cleanPriorities` kırpar, boşları **kapaktan önce** atar ve yazısı değişmeyen önceliğin işaretini korur. Günlük'teki haftalık bakış kartı (geriye bakış) Bugün'deki plana (ileriye bakış) bağlanır.

16. ✅ Her yerde arama (`/ara`, üstteki büyüteç): habit, proje, proje adımı, görev, günlük yazısı ve kütüphane tek kutuda. Eşleşme saf fonksiyonda (`src/lib/search.ts`, testli; sorgunun her kelimesi geçecek, Türkçe küçültme), okuma `src/db/search.ts` (günlük ve kütüphane `each` ile, fotoğraf/ses belleğe alınmadan; sayfa açılırken bir kez). Her tür en fazla 6 sonuç + "+n daha"; günlük sonucu `/takvim?gun=` ile o günü açar. Başlık ikonları altıya çıktığı için `PageHeader`'da ikon dolgusu küçüldü ve başlık `truncate`.

Depo herkese açık: hiçbir API anahtarı, şifre ya da imza anahtarı commit'lenmez (iş akışında gizli bilgi taraması var). Kullanıcı anahtarları sadece cihazda (localStorage), imza anahtarı GitHub Secrets'ta.


Git: depo `main` dalında; her adımdan sonra commit at, push'la (push = yayın).
Her kullanıcıya görünen değişiklikten sonra `CHANGELOG.md`'nin en üstüne (bugünün tarihi altına) kısa bir Türkçe madde ekle. Başka cihazdan çalışma: `docs/GELISTIRME.md`. APK imzası GitHub Actions'ta Secrets'taki anahtarla yapılır; yerelde anahtar gerekmez.
