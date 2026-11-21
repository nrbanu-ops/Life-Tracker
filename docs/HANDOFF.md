# Devir notu (handoff)

Yeni bir Claude Code oturumu için: önce `CLAUDE.md`'yi, sonra bu dosyayı oku. `CLAUDE.md` projenin
kalıcı kurallarını ve her özelliğin ayrıntısını tutar; bu dosya ise son çalışma oturumunda ne
yapıldığını, hangi kararların neden alındığını, kullanıcıyla nasıl çalışıldığını ve açık kalan
konuları anlatır.

## Durum (2026-11-21)

- Dal `main`, son commit `5bd92bb Yeni tema: Neon Sahil`, `origin/main` ile aynı, çalışma ağacı temiz.
- `npm run build`, `npm test` (37 dosya, 376 test) ve `npm run lint` (oxlint) temiz.
- Yayın iş akışının (`deploy`, GitHub Pages) son push'lardan sonra bitip bitmediği bu oturumda
  kontrol edilmedi.
- Veritabanı şemasına bu oturumda dokunulmadı (yeni alanlar indekssiz).

## Çalışma şekli

- **Git:** her adımda commit atılıp `main`'e push'landı (push = yayın). Oturum talimatı ayrıca
  `claude/life-tracker-app-uatiim` dalını istediği için aynı commit oraya da itildi:
  `git push origin main:claude/life-tracker-app-uatiim`. Yeni oturumun kendi dal talimatı neyse
  ona uy. PR açılmadı; kullanıcı istemedikçe açma.
- **Commit mesajı:** Türkçe kısa başlık, boş satır, kısa Türkçe gövde, sonunda oturumun verdiği
  imza satırları.
- **Her kullanıcıya görünen değişiklikte:** `CHANGELOG.md`'nin en üstüne, bugünün tarihi altına
  emojili kısa bir başlık ve Türkçe maddeler; `CLAUDE.md`'de ilgili maddeyi güncelle (yeni özellik
  yeni numaralı madde olarak).
- **Doğrulama:** `npm run build`, `npm test`, `npm run lint`, sonra `npx vite preview --port 4173`
  ve önceden kurulu Playwright/Chromium ile tarayıcıda deneme. Örnek veri sayfada
  `indexedDB.open('life-tracker')` ile doğrudan yazıldı (tablolar: `habits`, `habitLogs`, `tasks`,
  `projects`); palet `localStorage['life-tracker:palette']`. Ekran görüntüleri (390 px genişlik,
  `deviceScaleFactor: 2`) kullanıcıya gönderildi; kullanıcı görsele bakarak geri bildirim veriyor.
- **Cevap üslubu:** Türkçe, sade. Önce ne yapıldığı tek cümlede, sonra kısa maddeler; sonda
  "bilmen gerekenler" (yan etkiler, varsayımlar, geri alma yolu). Test, build ve yayın durumu
  dürüstçe söylenir ("yayının bitip bitmediğine bakmadım" gibi).

## Kullanıcı hakkında (tercihler)

- Kısa, bazen yazım hatalı Türkçe yazar. Niyeti yorumlayıp makul varsayımla ilerlemek, sonra
  cevapta varsayımı ve kolay geri alınabileceğini söylemek işe yaradı. Soru sormak yerine yapıp
  "istersen şunu da yaparım" demek tercih edildi.
- Görsel geri bildirim verir (telefon ekran görüntüsü). Aydınlık, sıcak pastel temalar kullanıyor.
- **Kalın başlık istemedi;** okunurluk için yarı saydam zemin istedi (bkz. madde 5).
- Habit satırlarının proje rengiyle boyanmasını sevmiyor (`CLAUDE.md` → Tasarım).
- Oyun ya da markadan esinlenmelerde ad, logo ve görsel kullanılmıyor; sadece hava alınıyor
  (Neon Sahil, Persona rütbe adları).

## Bu oturumda yapılanlar (eskiden yeniye)

1. **Zor gün modu Ayarlar'a taşındı** (`89cb55b`). Açma/kapama Ayarlar → Görünüm → Bugün ekranı'nda
   (`TodaySection`, kalan hak yazar, hak bitince anahtar pasif; `Switch`'e `disabled` eklendi).
   Bugün'deki "Zor bir gün mü?" satırı kalktı; mod açıkken `HardDayCard` görünür ve "Kapat" çalışır.
   Kullanıcı "ayarlar kısmına koyar mısın" dedi; taşıma olarak yorumlandı ve cevapta "ekleme
   demek istediysen geri koyarım" dendi, itiraz gelmedi.
2. **Aylık/yıllık hedefler Bugün'de ayrı grup değil** (`fa61417`). Sırası gelenler görevlerle aynı
   bölümde (`splitCurrent`, `TodayTasks`); hedefi dolmuş ya da zamanı gelmemiş olanlar bölümün
   altındaki "✓ n hedef şimdilik tamam · göster" katında. Odak modunda "Diğerleri" sadece günlük
   ve haftalıkları katlar. Habit'ler sayfasındaki "Aylık ve yıllık hedefler" grubu duruyor.
3. **Zincir ("zinciri kırma")** (`a57d289`, `0c5e5f7`). Habit'ler'de her habit'in altında son
   halkalar + özet satırı (`src/lib/chain.ts`: `habitChain`, `trackedFor`, `chainDays`; bileşenler
   `HabitChain`, `ChainSheet`; renk `src/lib/chainUi.ts`). Habit'e dokununca zincir paneli açılır:
   Ay (takvim, art arda günler çizgiyle bağlı) ve Yıl (12 × 31 kare + ayın oranı), ‹ › ile geri.
   Düzenleme panelin başlığındaki "Düzenle" düğmesinde (`BottomSheet`'e `action` prop'u eklendi).
4. **Bitiş tarihi** (`0771d7a`). `Habit.endDate` (son gün, isteğe bağlı) ve `Habit.completedOn`;
   kurallar `src/lib/habitEnd.ts`. Son günden sonra habit planlı değil: `isShownOn`, dönem
   döngüleri (`capAtEnd`/`hasEnded`: `successRate`, `streaks`, `habitChain`, XP/ceza
   `habitEvents`) ve `intervalCycles` hepsi bitişte durur. Ertesi gün hatırlatma yuvasının ilk
   kartı `HabitEndCard`: Tamamlandı ✓ (arşivler, "🏁 Tamamlananlar" listesine) ya da Devam et
   (1/3/6 ay ya da süresiz). "Sonra" düğmesi bilerek yok.
5. **Güncel görevler** (`e63badd`). Bugün yalnızca bugün/gecikmiş tarihli görevleri gösterdiği için
   kullanıcı görevlerini göremiyordu. `currentTasks` (`src/lib/tasks.ts`): gecikmiş + bugünkü →
   tarihsiz → önümüzdeki 7 gün; en fazla 8, fazlası "+n görev daha · Tümü ›". Bölümün adı
   "Güncel görevler" oldu ve habit gruplarının hemen altına taşındı.
6. **Bölüm başlıklarına yarı saydam zemin** (`b32b9cf`). `.section-title` ve `.section-chip`
   (`src/index.css`, components katmanı), uygulamadaki bütün bölüm başlıklarında. "✓ n hedef
   şimdilik tamam" satırına da önerildi; kullanıcı "yok sağ ol" dedi, dokunma.
7. **Yeni tema: Neon Sahil** (`5bd92bb`). Kullanıcı "GTA Vice City'den esinlen, aydınlık" dedi.
   `id: 'neon'`, hep aydınlık, kendi çizimi `src/assets/bg-neon-back.svg` (çizgili güneş, kuleler,
   palmiyeler, deniz) ve `bg-neon-front.svg` (kayan bulut ve martılar).

Bu oturumdan önce aynı gün: 8 statlık Persona + Solo Leveling karması (`c2cc987`), "X ayda bir"
sıklığı, Limonata ve Kumsal temaları (ayrıntı `CLAUDE.md` ve `CHANGELOG.md`'de).

## Açık konular (kullanıcı istemedi, sadece not)

- Zinciri Bugün satırlarında da gösterme teklif edildi; cevap gelmedi.
- Habit'ler sayfasındaki "Aylık ve yıllık hedefler" grubunu kaldırma teklif edildi; cevap gelmedi.
- Zincir için kullanıcı "habit'e tıklayınca ya da istatistikte" demişti; habit'e tıklayınca
  yapıldı, İstatistik'e ayrıca eklenmedi.

## Tuzaklar

- **Yeni bir dönem ya da seri kuralı yazarken bitiş tarihini unutma:** döngü `hasEnded` ile durmalı,
  son dönem `capAtEnd` ile kesilmeli. `isShownOn` bitişi zaten biliyor.
- **`habitChain` `streaks` ile aynı kuralları izler;** testte karşılaştırılıyor. Biri değişirse öteki de.
- **Yeni bir `Habit` alanı:** `HabitInput`'a ve `updateHabit`'in anahtar listesine ekle. Dexie
  `undefined` değeri alanı silmek için kullanır; listede olmayan alan formdan temizlenemez.
- **`.section-title` olan elemana Tailwind `flex` verme:** utility katmanı `inline-flex`'i ezer ve
  bant tam genişliğe yayılır.
- **Yeni palet:** `src/lib/theme.ts` (`PALETTES`) ile `src/index.css` bloğu birlikte eklenir; test
  ikisini karşılaştırır. Hep aydınlık palette `.map-tiles { filter: none }`; kendi çizimi olan
  palet `.backdrop-waves` gizleme ve `::before/::after` seçici listelerine eklenir.
- **Dar ekranda düğme metni kırılabiliyor:** `HabitEndCard`'daki seçenekler bu yüzden iki sütunlu
  ızgarada.
