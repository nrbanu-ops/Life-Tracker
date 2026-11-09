# Değişiklikler

Yeniden eskiye. Her madde bir ya da birkaç commit; ayrıntı için `git log`.
Geri dönüş noktaları git etiketi olarak durur (ör. `kayit-2026-10-31`).

## 2026-11-09

### Ses notu: neden başlamadığını söylüyor (düzeltme)
- "Kayıt başlatılamadı. Mikrofonu başka bir uygulama kullanıyor olabilir." mesajı her türlü
  hatada çıkıyordu ve asıl sebebi gizliyordu. Artık ayrım yapıyor: **izin verilmedi** (Android
  ayarlarında nereye bakılacağını yazıyor), **mikrofon bulunamadı**, **mikrofon meşgul**, ve
  bunların hiçbiri değilse hatanın kendi adı.
- **Uygulama sürümü çok eskiyse bunu söylüyor:** ses notu için kabuğun mikrofon iznini
  verebilmesi gerekiyor (v6 ve üstü). Eski kabukta artık "yeni APK'yı kur" yazıyor.
- Kayıt biçimini reddeden telefonlarda kayıt seçeneksiz bir kez daha deneniyor; bu durumda
  ses notu hiç hata vermeden çalışıyor.

### Fotoğraf eklenmemesi düzeltildi (düzeltme)
- **Telefonda galeriden fotoğraf seçip "bitti" demek hiçbir şey eklemiyordu.** Sebebi çoklu
  fotoğraf özelliğiydi: Android'de galeri, birden fazla seçime izin verildiğinde seçimi
  `ClipData` içinde geri veriyor, WebView'in kendi sonuç çözücüsü ise oraya hiç bakmıyor —
  yani sayfaya "hiçbir şey seçilmedi" diye dönüyordu. Dün tek fotoğraf seçildiği için bu
  sorun yoktu.
- **Hemen çalışan çözüm (APK beklemeden):** eski kabuklarda fotoğraflar tek tek seçiliyor;
  "Fotoğraf ekle"ye tekrar basarak 10'a kadar eklenebiliyor.
- **Yeni APK'da (v7):** kabuk seçimi artık kendisi okuyor, bir seferde birden fazla fotoğraf
  seçilebiliyor. Kabuk bunu yapabildiğini web tarafına söylüyor (`multiPhoto`), o yüzden eski
  ve yeni kabuk aynı sürümle doğru çalışıyor.

### Fotoğraf ve ses notu: sessiz hata yok (düzeltme)
- **Kaydetme başarısız olursa artık sebebi yazıyor.** Fotoğraf ya da ses notu kaydetmek, bir
  günlük yazısının binlerce katı yer tuttuğu için telefonda gerçekten başarısız olabiliyor
  (dolu cihaz, küçük depolama izni). Bu durumda "Kaydet" sessizce kilitleniyordu: hiçbir şey
  olmuyor, hiçbir şey yazmıyordu. Artık hata metniyle birlikte görünüyor, yazı ve fotoğraflar
  ekranda kalıyor ve tekrar denenebiliyor. Yer sorunuysa ne yapılacağını da söylüyor.
- **Ayarlar → Tanılama**: fotoğraf ve ses notunun geçtiği bütün adımları bu telefonda tek tek
  deniyor (depolama alanı, fotoğraf boyutunda yazma, fotoğrafı çözme ve küçültme, ses kaydı
  desteği, istenirse mikrofon izni) ve hangisinin takıldığını yazıyor. Sonuç "Sonucu kopyala"
  ile kopyalanıp iletilebiliyor.
- Telefonun hiç okuyamadığı bir fotoğraf (galerinin boş verdiği dosya) artık "Telefon bu
  fotoğrafı okuyamadı" diye söylenip atlanıyor; aynı seçimdeki diğer fotoğraflar eklenmeye
  devam ediyor.

### Günlük sayfası telefonda çökmesin (düzeltme)
- **Fotoğraflı günlük artık sayfa sayfa yükleniyor** (son 10 gün, altta "Daha eskisini göster").
  Bir güne 10 fotoğraf girilebildiğinden beri sayfa hepsini birden açmaya çalışıyordu; 200
  fotoğraflı bir günlükte telefonun tarayıcısı buna yetişemeyip boş ekran bırakabiliyordu.
- Fotoğraflar artık sadece ekrana geldiklerinde çözülüyor (`loading="lazy"`): aynı günlükte
  aynı anda 200 yerine ~30 fotoğraf işleniyor.
- **Bir ekran açılamazsa artık boş kalmıyor:** sebebi yazan bir kutu, "Yenile" ve "Hatayı
  kopyala" butonları çıkıyor.
- Yeni sürüm yayınlandıktan hemen sonra eski sayfanın takılması durumu kendiliğinden
  çözülüyor (bir kez yenileniyor).
- **Fotoğraf eklenemezse sebebi yazıyor** ("Bu fotoğraf açılamadı (image/heic)" gibi).
  Çevirilemeyen biçimler için ikinci bir yöntem deneniyor, yan yatmış fotoğraflar da düzeliyor.

### Her yerde arama
- **Üstteki büyüteç** tek kutuda her şeyi arıyor: habit'ler, projeler, proje adımları, görevler,
  günlük yazıları ve kütüphane (adı, yazarı ve senin yorumun).
- Sonuçlar türe göre gruplanıyor; bir günlük sonucuna dokununca takvimde o gün açılıyor.
- Arşivlenmiş habit'ler ve biten görevler de bulunuyor, ama listenin altında.

### Günlük hatırlatma (Android)
- **Ayarlar'da "Günlük hatırlatma":** seçtiğin saatte telefona bildirim gelir, dokununca uygulama
  açılır. Telefon yeniden başlasa da kurulu kalır.
- Pil için bildirim birkaç dakika sapabilir; karşılığında "tam alarm" izni istemiyor.
- Sadece Android uygulamasında görünür — tarayıcıdaki sürüm telefonu uyandıramaz.
- **Yeni APK gerekiyor:** bu özellik kabuğun içinde, web güncellemesiyle gelmiyor.

### Yıl özeti
- **Bir yılın tamamı tek sayfada** (İstatistik → "2026 özeti"): kaç gün bir şeyler yaptığın,
  habit işaretlerin, kusursuz günlerin, biten görevlerin, günlük yazıların, XP'n, başarımların.
- Altında ayrıntı: en çok yaptığın habit, yılın en uzun serisi, en çok yazdığın ay, kaç kelime
  yazdığın, ruh hali ortalaman ve en iyi ayın, bitirdiğin kitap/film/dizi/yerler ve beş yıldız
  verdiklerin, biten projeler ve adımlar.
- **Aralık'tan 15 Ocak'a kadar Bugün ekranında bir kart** çıkıyor; sonrasında İstatistik'ten
  ulaşılıyor. Önceki yıllar da üstteki yıl seçicisinden açılıyor.

### Günlüğe ses notu
- **Yazacak hâlin yoksa konuş:** günlük kutusunda "🎤 Ses notu" ile kaydediyorsun, akışta
  doğrudan dinleniyor. Girdi başına bir ses notu, en fazla 5 dakika.
- Kaydederken süre görünüyor, "Vazgeç" ile atıyorsun; sonradan açıp kaldırabiliyorsun.
- Ses notları da yedeğe giriyor ve Ayarlar'daki depolama sayımında ayrı satır olarak görünüyor.
- Android uygulamasında mikrofon izni ekleniyor (yeni APK gerekiyor).

### "Buradayım" ile anlık konum
- **Kütüphaneye yer eklerken "📍 Buradayım"** butonu: telefonun konumunu alıp o noktanın adını
  (OpenStreetMap'ten) ve şehrini doldurur, "gittim" olarak işaretler. Adı istediğin gibi
  değiştirip kaydediyorsun — "Galata Kulesi" yerine "Galata — kahve molası" gibi.
- İnternet yoksa ya da nokta isimsizse yine de koordinat kaydediliyor, adını sen yazıyorsun.
- Android uygulamasında konum izni ekleniyor (yeni APK gerekiyor; web sürümünde zaten çalışır).

### Geri yüklemeden önce otomatik güvenlik kopyası
- **Yedekten geri yüklerken, şu anki verin önce ayrı bir dosyaya kaydediliyor**
  (`life-tracker-geri-yuklemeden-once-<tarih>.json`). Yanlış dosyayı seçersen eskisi duruyor:
  o dosyayı geri yükleyip eski haline dönebilirsin.
- **"Tüm verileri sıfırla" da aynı şekilde** önce bir kopya yazıyor
  (`life-tracker-sifirlamadan-once-<tarih>.json`).
- Kopya yazılamazsa **hiçbir şey silinmiyor**; uyarı çıkıyor ve istersen "Kopyasız geri yükle"
  ile yine de devam edebiliyorsun.
- Bu kopya "son yedek" sayılmıyor: bir saniye sonra o veri gidiyor, "az önce yedeklendi" demek
  yanlış olurdu.

### Depolama kartı (Ayarlar)
- **Uygulamanın ne kadar yer kapladığı artık görünüyor:** kullanılan alan, cihazın ayırdığı
  alanın yüzdesi ve dolmaya yaklaşınca kırmızı uyarı. Dolunca yeni fotoğraflar sessizce
  kaydedilemez olurdu; artık önceden belli.
- **"Kalıcı depolama" durumu** görünüyor; kapalıysa tek dokunuşla açılıyor (kapalıyken tarayıcı
  yer açmak için verini silebilir).
- **"Fotoğrafları say"** butonu günlükteki fotoğrafların sayısını ve boyutunu, kütüphane
  afişlerini ve **en ağır günleri** listeliyor; bir güne dokununca takvimde o gün açılıyor,
  oradan fazla fotoğrafları silebilirsin.

### Günlükte fotoğraf galerisi
- **Günlük sayfasında "Yazılar / Fotoğraflar" geçişi var.** Fotoğraflar aya göre gruplanmış bir
  ızgarada; birine dokununca ait olduğu yazı açılıyor. Arama ve habit filtresi galeride de geçerli,
  yani "konser" yazınca o günlerin fotoğrafları kalıyor.

### Takvimde ruh hali
- **Ruh halini işaretlediğin günler takvimde yüzüyle görünüyor.** Bir ayın nasıl geçtiği tek
  bakışta belli oluyor; enerji yine gün detayında. Açıklama satırına "Ruh hali" eklendi.

## 2026-11-08

### Takvimde günlük işareti
- **Günlüğe bir şey yazdığın günler takvimde sarı noktayla işaretli.** Hangi günlerde yazdığını
  görüp doğrudan o güne gidebilirsin. Açık görev noktası mavi; ikisi varsa yan yana duruyorlar.

### Yedekleme sağlamlaştırıldı
- **Otomatik yedek sessizce durmuyor artık.** Dosya silinmiş, yer kalmamış ya da yazma başka bir
  sebeple olmamışsa üstte kırmızı bir şerit çıkıyor ("Otomatik yedek yazılamadı · Tekrar dene").
  Önceden bu hatalar yutuluyordu: Ayarlar "✅ Otomatik yedek açık" derken haftalardır hiçbir şey
  yazılmamış olabiliyordu.
- **Yedek hatırlatması artık otomatik yedeğe değil, gerçekten alınmış yedeğe bakıyor.** Otomatik
  yedek açık görünse bile 7 gündür dosya yazılmadıysa Bugün ekranında uyarı çıkıyor.
- Ayarlar'da "Şimdi yedekle" başarısız olursa "Yedeklendi ✓" demiyor, ne olduğunu söylüyor.
- Yedek alırken ve geri yüklerken butonlar "Geri yükleniyor…" olup kilitleniyor; fotoğraflı büyük
  bir yedek yarım dakika sürebiliyor ve ekran donmuş gibi görünüyordu.

### Günlük fotoğrafları
- **Bir yazıya birden fazla fotoğraf eklenebiliyor** (en fazla 10). Galeriden hepsini birden
  seçebilir, sonradan tek tek ekleyip çıkarabilirsin; birden fazlaysa akışta ikili ızgarada
  görünüyorlar. Eski tek fotoğraflı yazıların olduğu gibi duruyor.

### Kütüphane takvimi
- **Takvim artık kapakları gösteriyor.** Gün hücresinde küçük renkli noktalar yerine o gün
  bitirdiğin (ya da başladığın) şeyin kapağı duruyor; aynı güne birden fazlaysa üst üste
  diziliyor, fazlası köşede "+2" olarak. Puan verdiysen kapağın altında yıldızlar.
  Başladıkların soluk ve türünün renginde çerçeveli.
- Bir şey olmayan haftalar kısaldı, ay bir ekrana sığıyor.

### Günlük
- **Yarım kalan yazı artık kaybolmuyor.** Yazdıkların kaydetmeden sayfadan çıksan da,
  uygulama yeni sürüme geçip kendini yenilese de, telefon uygulamayı arka planda kapatsa da
  kutuda duruyor. Her gün için ayrı tutulur; kaydedince temizlenir. (Fotoğraf saklanmaz,
  onu tekrar seçmek gerekir.)
- **"1 yıl önce bugün" kartı yapay zekânın haftalık bakışını göstermiyor**, sadece senin
  yazdıklarını.
- **Anı kartına dokununca o güne gidiliyor**, günlüğün en başına değil.

### Gökkuşağı teması
- **Yeni tema: Gökkuşağı.** Mercan, somon, krem, altın ve maviden akan dalgalar; arka plan artık
  çiçek fotoğrafı değil, bu renklerde çizilmiş bir desen.
- **Telefonun koyu moduna uymaz, hep aydınlık kalır.** Koyu modu açık tutup uygulamayı aydınlık
  görmek isteyenler için; diğer temalar eskisi gibi telefonun ayarını takip ediyor.
- Seviye kartı bu temada da aydınlık: krem zemin, mavi çerçeve, acil görev kırmızı.
  Rank renkleri aydınlık zeminde okunacak şekilde koyulaştırıldı.
- Görev öncelik renkleri (acil / yüksek / orta) görselin kendi kırmızı, altın ve mavisinden.

## 2026-11-07

### Renk teması
- **Ayarlar'da 7 renk teması:** Orman (eskisi, varsayılan), Şeker, Pembe, Gün batımı, Turkuaz,
  Okyanus, Lavanta. Açık ve koyu mod telefonun ayarını takip etmeye devam ediyor; tema sadece
  renkleri seçiyor, her ikisinde de. Arka plandaki çiçek fotoğrafı da temanın rengini alıyor.
- **Seviye kartları da temanın rengini alıyor.** Köşeli, çizgili "sistem penceresi" görünümü
  duruyor ama lacivert yerine seçtiğin rengin koyu tonunda ve o renkte parlıyor — koyu modda
  ekran baştan aşağı tek koyu renk olmuyor.
- Koyu moddaki renkler genel olarak daha canlı: yüzeyler renge çalıyor, vurgu renkleri parlak.
- Seçim cihaza özel (yedeğe girmiyor) ve sayfa açılır açılmaz uygulanıyor, renk parlaması yok.
  iPhone'da durum çubuğu rengi de temaya uyuyor.

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
