# Android uygulaması

## Nasıl çalışıyor?

Android uygulaması (`android/`) çok ince bir **kabuk**: tam ekran bir WebView, GitHub Pages'teki
Life Tracker web uygulamasını açar. Asıl uygulama web tarafında olduğu için:

- **Güncellemeler kendiliğinden gelir.** `main`'e her push'ta `deploy` iş akışı siteyi yeniden yayınlar.
  Uygulamadaki service worker yeni sürümü arka planda indirir ve hemen geçer (sayfa bir kere yenilenir).
  Uygulama açılınca ve her 30 dakikada bir yeni sürüm var mı diye bakar. APK'yı tekrar kurmak gerekmez.
- **İnternetsiz çalışır.** İlk açılışta bir kere internet gerekir; sonra her şey önbellekten açılır.
- **Veriler telefonda kalır.** IndexedDB, uygulamanın kendi WebView deposunda durur; hiçbir sunucuya gitmez.

Kabuğun web uygulamasına eklediği şeyler (`window.LifeTrackerAndroid`, `src/lib/android.ts`):

| Özellik | Nasıl |
|---|---|
| Yedeği indir | `İndirilenler/LifeTracker/` klasörüne kaydeder (MediaStore, izin gerekmez) |
| Otomatik yedek | Ayarlar → Yedekleme → "Otomatik yedeği aç": değişiklikten sonra `İndirilenler/LifeTracker/life-tracker-yedek.json` dosyasının üzerine yazar |
| Fotoğraf / dosya seçme | Sistemin dosya seçicisi |
| Dış bağlantılar | Google Haritalar, TMDB, claude.ai vb. telefonun tarayıcısında / uygulamasında açılır |

## Kurulum

1. [Releases](../../releases/latest) sayfasından **LifeTracker.apk** dosyasını telefona indir.
2. Dosyayı aç. Android "bilinmeyen kaynaklardan yükleme" izni isterse tarayıcına bu izni ver.
3. Life Tracker'ı aç, ilk yükleme için internete bağlı ol.
4. Ayarlar → Yedekleme → **Otomatik yedeği aç** (önerilir).

> Uygulamayı silmek verileri de siler. Silmeden önce `İndirilenler/LifeTracker/` içindeki yedeği sakla;
> yeniden kurunca Ayarlar → **Yedekten geri yükle** ile geri alırsın.

### Bilgisayardaki verileri telefona taşımak

Bilgisayarda Ayarlar → **Yedeği indir**, dosyayı telefona at (Drive, kablo, e-posta), telefonda
Ayarlar → **Yedekten geri yükle**.

## APK ne zaman yeniden derlenir?

Sadece `android/` klasörü değişince (`android` iş akışı). Her derleme yeni bir Release
(`android-v<numara>`) ve daha yüksek bir sürüm kodu üretir; telefonda eskisinin üzerine kurulur.

## İmza anahtarı (isteğe bağlı ama önerilir)

Android, bir uygulamanın güncellemesini sadece **aynı anahtarla** imzalanmışsa üzerine kurar.
Depo herkese açık olduğu için anahtar depoda **değil**, GitHub'ın şifreli *Secrets* alanında durur.
Secret yoksa her derleme geçici bir debug anahtarıyla imzalanır: ilk kurulum için sorun değil, ama kabuk
ileride değişirse eskisini silip (yedekle!) yenisini kurmak gerekir.

Kalıcı anahtar için bir kere (bilgisayarda, Git Bash'te):

```bash
mkdir -p ~/.lifetracker && cd ~/.lifetracker
openssl req -x509 -newkey rsa:4096 -sha256 -days 10000 -nodes -subj "/CN=Life Tracker" -keyout key.pem -out cert.pem
openssl pkcs12 -export -inkey key.pem -in cert.pem -name lifetracker -out release.p12
base64 -w0 release.p12 > release.p12.b64
```

Sonra GitHub'da depo → Settings → Secrets and variables → Actions → **New repository secret**:

| Ad | Değer |
|---|---|
| `ANDROID_KEYSTORE_B64` | `release.p12.b64` dosyasının içeriği |
| `ANDROID_KEYSTORE_PASSWORD` | `pkcs12 -export` sırasında verdiğin şifre |
| `ANDROID_KEY_ALIAS` | `lifetracker` |

`~/.lifetracker/` klasörünü güvenli bir yerde yedekle; anahtar kaybolursa yeni anahtarla imzalanan
APK eski uygulamanın üzerine kurulamaz.
