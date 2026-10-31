import { useState } from 'react'
import { useNavigate } from 'react-router'
import { BackIcon } from '../components/icons'
import { PageHeader } from '../components/PageHeader'
import { PLAN_INSTRUCTIONS } from '../lib/aiPlan'
import { copyText } from '../lib/clipboard'
import { getTmdbKey, setTmdbKey } from '../lib/library'

export function SettingsPage() {
  const navigate = useNavigate()
  const [copied, setCopied] = useState<boolean>()
  const [showText, setShowText] = useState(false)

  return (
    <>
      <PageHeader
        title="Ayarlar"
        action={
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Geri"
            className="-mr-2 rounded-full p-2 text-muted transition-colors hover:text-text"
          >
            <BackIcon width={22} height={22} />
          </button>
        }
      />

      <div className="flex flex-col gap-4">
        <section id="claude" className="rounded-2xl border border-border bg-surface p-4">
          <h2 className="font-medium">Claude ile planlama</h2>
          <p className="mt-1 text-sm text-muted">
            Projelerini Claude hesabınla planlarsın; ek ücret yok. Bir kere kurman yeterli:
          </p>
          <ol className="mt-3 flex list-decimal flex-col gap-2 pl-5 text-sm">
            <li>
              <a
                href="https://claude.ai/projects"
                target="_blank"
                rel="noreferrer"
                className="text-accent underline"
              >
                claude.ai/projects
              </a>{' '}
              sayfasında yeni bir proje oluştur, adını <b>Life Tracker Planlayıcı</b> koy.
            </li>
            <li>Aşağıdaki talimatı kopyala.</li>
            <li>
              Claude'daki projede <b>talimatlar</b> (instructions) bölümüne yapıştırıp kaydet.
            </li>
          </ol>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={async () => setCopied(await copyText(PLAN_INSTRUCTIONS))}
              className="flex-1 rounded-xl bg-accent py-2.5 font-medium text-surface"
            >
              {copied ? 'Kopyalandı ✓' : 'Talimatı kopyala'}
            </button>
            <button
              type="button"
              onClick={() => setShowText((v) => !v)}
              aria-expanded={showText}
              className="rounded-xl bg-bg px-4 py-2.5 text-sm"
            >
              {showText ? 'Gizle' : 'Göster'}
            </button>
          </div>
          {copied === false && (
            <p className="mt-2 text-sm text-p1">
              Kopyalanamadı. "Göster" ile metni açıp elle kopyalayabilirsin.
            </p>
          )}
          {(showText || copied === false) && (
            <pre className="mt-3 max-h-80 overflow-auto rounded-xl bg-bg p-3 text-xs whitespace-pre-wrap">
              {PLAN_INSTRUCTIONS}
            </pre>
          )}
          <p className="mt-3 text-sm text-muted">
            Sonra Projeler sekmesinde <b>✨ Claude ile planla</b> butonunu kullan.
          </p>
        </section>

        <TmdbKeySection />

        <section className="rounded-2xl border border-border bg-surface p-4">
          <h2 className="font-medium">Verilerin</h2>
          <p className="mt-1 text-sm text-muted">
            Tüm veriler sadece bu cihazda saklanıyor. Dışa ve içe aktarma yakında burada olacak.
          </p>
        </section>
      </div>
    </>
  )
}

/** Film posters come from TMDB, which needs the user's own free key; it stays on this device. */
function TmdbKeySection() {
  const [key, setKey] = useState(() => getTmdbKey() ?? '')
  const [saved, setSaved] = useState(() => Boolean(getTmdbKey()))

  return (
    <section id="tmdb" className="rounded-2xl border border-border bg-surface p-4">
      <h2 className="font-medium">Film afişleri (TMDB)</h2>
      <p className="mt-1 text-sm text-muted">
        Kitap ve dizi afişleri kendiliğinden gelir. Filmler için ücretsiz bir TMDB anahtarı gerekiyor:
      </p>
      <ol className="mt-3 flex list-decimal flex-col gap-2 pl-5 text-sm">
        <li>
          <a
            href="https://www.themoviedb.org/signup"
            target="_blank"
            rel="noreferrer"
            className="text-accent underline"
          >
            themoviedb.org
          </a>{' '}
          sitesinde ücretsiz hesap aç.
        </li>
        <li>
          <a
            href="https://www.themoviedb.org/settings/api"
            target="_blank"
            rel="noreferrer"
            className="text-accent underline"
          >
            Ayarlar → API
          </a>{' '}
          sayfasından bir anahtar iste (kişisel kullanım).
        </li>
        <li>
          <b>API Key</b> ya da <b>API Read Access Token</b> değerini kopyalayıp buraya yapıştır.
        </li>
      </ol>
      <div className="mt-4 flex gap-2">
        <input
          value={key}
          onChange={(e) => {
            setKey(e.target.value)
            setSaved(false)
          }}
          placeholder="TMDB anahtarı"
          aria-label="TMDB anahtarı"
          autoComplete="off"
          spellCheck={false}
          className="min-w-0 flex-1 rounded-xl border border-border bg-bg px-3 py-2.5 text-sm outline-none focus:border-accent"
        />
        <button
          type="button"
          onClick={() => {
            setTmdbKey(key)
            setSaved(Boolean(key.trim()))
          }}
          className="rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-surface"
        >
          {saved ? 'Kayıtlı ✓' : 'Kaydet'}
        </button>
      </div>
      <p className="mt-2 text-xs text-muted">Anahtar sadece bu cihazda saklanır.</p>
    </section>
  )
}
