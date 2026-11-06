# Değişiklikler

Yeniden eskiye. Her madde bir ya da birkaç commit; ayrıntı için `git log`.
Geri dönüş noktaları git etiketi olarak durur (ör. `kayit-2026-10-31`).

## 2026-11-06

### iPhone / iPad
- **Ana ekran ikonu düzeldi.** iOS, SVG ikonları yok saydığı için uygulamayı ana ekrana ekleyince
  ikon yerine sayfanın ekran görüntüsü çıkıyordu; artık PNG `apple-touch-icon` var.
  Ana ekranda adı "Life Tracker" görünüyor, durum çubuğu tema rengine uyuyor.
- Android/Chrome için de PNG ikonlar eklendi (192, 512 ve maskeli 512); maskeli ikon artık
  köşeleri kırpılmayacak şekilde tam kare.
- **Yedek kaydetme iPhone'da çalışıyor:** iOS'ta otomatik yedek mümkün olmadığı için "Yedeği kaydet"
  artık paylaşım sayfasını açıyor; oradan "Dosyalara Kaydet", iCloud Drive, AirDrop ya da e-posta
  seçebilirsin. Ayarlar'da bu cihazda otomatik yedek olmadığını anlatan bir not var.
- **Yedek alınmadığı halde "alındı" denmiyor:** dosya kaydetme artık gerçekten ne olduğunu bildiriyor.
  Paylaşım sayfasını kapatırsan yedek sayılmıyor, hatırlatma sıfırlanmıyor. Tarayıcı indirmesi de
  daha sağlam: bağlantı sayfaya ekleniyor ve indirme başlamadan iptal edilmiyor.
  (Android'de hiçbir şey değişmedi: kabuk uygulaması İndirilenler'e, Chrome doğrudan indirmeye devam.)

### Zamanlayıcı
- Geri sayım bitiş sesi, uygulama arka plandan döndüğünde de çalmaya çalışıyor (iOS ses motorunu
  arka planda donduruyordu). Süre hesabı zaten doğruydu, değişmedi.

## 2026-11-01

### Seviye sistemi
- **Ceza:** planlanıp yapılmayan habit, yapınca kazandıracağı kadar XP götürüyor (günde en fazla 100).
  Atlanan gün ve minimum cezasız, kısmi yarı ceza; haftalık hedefte eksik kalan her kez hafta bitince.
  Dünü sonradan işaretlersen ceza kalkıyor. Seviye ve rank düşebilir, statlar düşmüyor. Sabah
  "Görev tamamlanmadı" penceresi dünün cezasını gösteriyor. Ayarlar'dan kapatılabilir; açıldığı günden
  itibaren sayılıyor. Haftalık hedef cezası pencerede "haftalık hedef" diye işaretli.
- Seviye eğrisi yavaşladı, eskisinin yaklaşık yarı hızında (`xpToNext` = 60·n^1,1).
  Düzenli bir kullanıcı 1 haftada Lv 3, 1 ayda 6, 3 ayda ~11 (D-Rank), 1 yılda ~23 (C-Rank) oluyor.
  Kazanılmış XP değişmez; seviye yeni eğriye göre yeniden hesaplanır.
- Bir habit'in işaretini kaldırıp yeniden koymak artık ikinci kez "+XP" ya da "Seviye atladın"
  göstermiyor (`LevelWatcher` en yüksek noktayı hatırlıyor). XP zaten günde bir kez sayılıyordu.
- Başarımlar 25 XP. Sadece bir şey eklemekle kazanılanlar (ilk habit, ilk proje) XP vermiyor;
  önceden bir proje eklemek tek seferde 3 seviye atlatıyordu.
- Gemini haftalık bakışı günlük yazısı sayılmıyor (günlük başarımlarına ve XP'ye girmiyor).
- "Sistem penceresi" görünümü: seviye kartı, profil ve bildirimler koyu lacivert, köşeli, mavi çizgili;
  rank rozeti rank rengindeki eşkenar dörtgen.
- Arka plan resmi kartla uyumlu olsun diye maviye boyandı (iki temada da).

### Kütüphane
- Harita bütün yerleri gösteriyor: raf filtreleri (tür, dil) haritada gizli; önceden bir dil ya da "Kitap"
  seçiliyken yerler haritadan kayboluyordu. Tek yer varken daha geniş açı; haritadan "Ekle" yer ekler.
- Yeni tür: **Oyun**. Arama İngilizce Wikipedia'dan (anahtarsız), bitince 20 XP (Zekâ).
- Kütüphane takvimi bütün türleri birlikte gösteriyor: biten günler dolu, başlanan günler halka nokta,
  tür rengiyle; gün listesi "Bitirdin / Başladın" olarak ayrılıyor.

### Diğer
- GitHub iş akışları güncel eylem sürümlerine geçti (Node 24); eskime uyarıları kalktı. Android derlemesi bu yüzden yeni bir APK (aynı anahtarla imzalı) yayınladı; kurmak gerekmez.
- **Yedek hatırlatması:** otomatik yedek kapalıyken son yedek 7 günden eskiyse (hiç alınmadıysa ilk
  kullanımdan 3 gün sonra) Bugün ekranında kart: "Yedeği indir" ya da "Sonra" (3 gün gizler).
- Geçmiş bir haftadaki güne sayı/süre eklemek hata verip kaydı geri alıyordu (XP defteri işlemi); düzeldi.
- Ayarlar → **Bütün verileri sil** (SİL yazarak onaylanır; otomatik yedek de kapanır).
- Ruh hali ve enerji seçici küçüldü ve sadeleşti: gri yüzler, seçilenin adı yanında.
- Projeler sayfasındaki "Gemini ile planla" kartı anahtar yokken de görünüyor ve Ayarlar'a götürüyor
  (Gemini anahtarı her cihazda ayrı).
- Projeyle gelen habit'ler proje detayından düzenlenebiliyor (ad, sıklık, zorluk…).

## 2026-10-31

### Seviye sistemi (ilk sürüm)
- XP, seviye, rank (E→S), statlar, günlük görev, haftalık acil görev ve 14 unvan; `/profil` sayfası.
  Ayarlar'dan kapatılabilir.

### Android
- Google Haritalar'dan yer paylaşma (Paylaş → Life Tracker).
- Kalıcı imza anahtarı: APK GitHub Actions'ta, Secrets'taki anahtarla imzalanıyor
  (`android-v2` ve sonrası birbirinin üzerine kurulur).

### Günlük
- Günlük ruh hali ve enerji; İstatistik'te habit'lerle bağlantısı.
- Günlük yazısına fotoğraf, günlükte arama, "1 yıl / 6 ay / 1 ay / 1 hafta önce bugün" kartı.
- Gemini haftalık bakış (günlüğe kaydedilir).

### Kütüphane ve yerler
- Gittiğin yerler: OpenStreetMap araması, Google Haritalar linkleri ve paylaşılan metin,
  Wikipedia fotoğrafları, harita görünümü.

### Başarımlar
- Genel başarımlar ve her projeye özel, yapay zekanın belirlediği başarımlar.

### Görünüm
- Açık ve koyu temada çiçekli dal arka planı; habit tiki işaretlenince proje rengini alıyor.

### Yayın ve yapay zeka
- GitHub Pages'e otomatik yayın, kendiliğinden güncellenen service worker, Ayarlar'da
  "Güncellemeleri denetle".
- Android WebView kabuğu ve dosya köprüsü (İndirilenler'e yedek).
- Gemini planlama sohbeti (kullanıcının kendi anahtarıyla); Claude ve Gemini ayrı ayrı açılıp kapanıyor.
- İş akışında gizli bilgi taraması (API anahtarı commit'lenirse yayın durur).

### İlk sürüm
- Bugün, Habit'ler, Görevler, Takvim, Günlük, Zamanlayıcı, Projeler, Claude ile planlama, Kütüphane.
- Yedekleme: JSON indir / geri yükle, seçilen dosyaya otomatik yedek.
- İstatistik: seriler, 12 aylık ısı haritası, haftalık/aylık ve haftanın günleri oranları.
