# Başka bir cihazdan geliştirme

Her şey GitHub'da: kod, kurallar ([CLAUDE.md](../CLAUDE.md)), değişiklik listesi
([CHANGELOG.md](../CHANGELOG.md)), yayın ve APK derleme. Bir bilgisayarda olup GitHub'da olmayan
tek şey Android imza anahtarının yedeği (aşağıda); geliştirmek için ona gerek yok.

## Kurulum (bir kere)

1. [Git](https://git-scm.com) ve [Node.js](https://nodejs.org) 22 ya da üstü kur.
2. Depoyu indir ve bağımlılıkları kur:

   ```bash
   git clone https://github.com/nrbanu-ops/Life-Tracker.git
   cd Life-Tracker
   npm install
   ```

3. Push için GitHub'a giriş: ilk `git push`'ta tarayıcı açılır (Git Credential Manager),
   ya da GitHub Desktop / VS Code ile giriş yap. Şifre ya da token'ı hiçbir dosyaya yazma.

## Her çalışmada

```bash
git pull         # önce diğer cihazdaki değişiklikleri al
npm run dev      # http://localhost:5173
npm test
npm run build
git add -A
git commit -m "Ne değişti"
git push         # push = yayın
```

- `main`'e her push `deploy` iş akışını çalıştırır: gizli bilgi taraması, test, build, GitHub Pages.
  Telefondaki ve tarayıcıdaki uygulama yeni sürüme kendisi geçer.
- `android/` klasörü değişirse `android` iş akışı yeni APK'yı derler, **GitHub Secrets'taki anahtarla
  imzalar** ve Releases'a koyar. Bilgisayarda Android Studio, Java ya da anahtar gerekmez.
- Bir iş akışının sonucu: depo → **Actions** sekmesi.

## Claude Code ile

Depo klasöründe Claude Code'u aç; proje kurallarını `CLAUDE.md`'den okur (Türkçe arayüz, küçük adımlar,
her adımda build + test, commit + push, kütüphane eklemeden önce sor, anahtar paylaşma).
Claude Code'un kendi notları (hafıza) cihaza özel ve GitHub'a gitmez; kalıcı olması gereken her kural
`CLAUDE.md`'ye yazılır. Önizleme sunucusu `.claude/launch.json` içinde (`dev`, port 5173).

Yeni bir değişiklikten sonra `CHANGELOG.md`'nin en üstüne kısa bir madde ekle.

## Cihazdan cihaza gitmeyen şeyler

| Ne | Nerede durur | Yeni cihazda |
|---|---|---|
| Uygulama verileri (habit'ler, günlük…) | O tarayıcının / telefonun IndexedDB'si | Ayarlar → Yedeği indir, öbür cihazda Yedekten geri yükle |
| Gemini ve TMDB anahtarları | O cihazın localStorage'ı | Ayarlar'da yeniden yapıştır |
| Android imza anahtarı | GitHub Secrets (asıl) + bir bilgisayarda `%USERPROFILE%\.lifetracker\` (yedek) | Gerek yok; APK'yı GitHub imzalar |

## Güvenlik

Depo herkese açık. API anahtarı, şifre, token ya da imza anahtarı **hiçbir zaman** commit'lenmez:
`.gitignore` `*.p12`, `*.jks`, `*.keystore`, `*.pem`, `.env` dosyalarını dışarıda tutar ve `deploy`
iş akışındaki tarama bilinen anahtar biçimlerini görürse yayını durdurur.

## Geri dönmek

Büyük değişikliklerden önce etiket atılır (`git tag`, ör. `kayit-2026-10-31`). Bir etiketin haline
bakmak için `git checkout kayit-2026-10-31`; `main`'i geri almak gibi kalıcı adımlardan önce emin ol.
