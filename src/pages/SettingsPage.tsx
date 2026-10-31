import { useState } from 'react'
import { useNavigate } from 'react-router'
import { BackupSection } from '../components/BackupSection'
import { BackIcon } from '../components/icons'
import { PageHeader } from '../components/PageHeader'
import { resetAllData } from '../db/backup'
import { PLAN_INSTRUCTIONS } from '../lib/aiPlan'
import { androidBridge } from '../lib/android'
import { setAiSettings, useAiSettings } from '../lib/assistant'
import { copyText } from '../lib/clipboard'
import { askGemini } from '../lib/gemini'
import { getTmdbKey, setTmdbKey } from '../lib/library'
import { setLevelingOn, useLevelingOn } from '../lib/levelingSetting'
import { checkForUpdate, type UpdateResult } from '../lib/update'

export function SettingsPage() {
  const navigate = useNavigate()
  const [copied, setCopied] = useState<boolean>()
  const [showText, setShowText] = useState(false)
  const ai = useAiSettings()
  const levelingOn = useLevelingOn()

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
        <BackupSection />

        <GeminiSection />

        <section id="claude" className="rounded-2xl border border-border bg-surface p-4">
          <Switch
            label="Claude ile planlama"
            checked={ai.claude}
            onChange={(claude) => setAiSettings({ claude })}
          />
          <p className="mt-1 text-sm text-muted">
            Projelerini claude.ai hesabınla planlarsın; mesajı kopyalayıp cevabı geri yapıştırırsın, ek
            ücret yok.
          </p>
          {ai.claude && (
            <>
          <p className="mt-3 text-sm text-muted">Bir kere kurman yeterli:</p>
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
            </>
          )}
        </section>

        <section id="seviye" className="rounded-2xl border border-border bg-surface p-4">
          <Switch label="Seviye sistemi" checked={levelingOn} onChange={setLevelingOn} />
          <p className="mt-1 text-sm text-muted">
            Habit'ler, görevler ve günlük XP kazandırır; seviye, rank ve statlar Bugün ekranında ve Profil'de.
            Kapatınca hiçbir yerde görünmez.
          </p>
        </section>

        <TmdbKeySection />

        <UpdateSection />

        <ResetSection />
      </div>
    </>
  )
}

/** Deletes all entered data, behind a typed confirmation. */
function ResetSection() {
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const ready = typed.trim().toLocaleUpperCase('tr') === 'SİL'

  return (
    <section id="sifirla" className="rounded-2xl border border-p1/40 bg-surface p-4">
      <h2 className="font-medium">Tüm verileri sıfırla</h2>
      <p className="mt-1 text-sm text-muted">
        Habit'ler, işaretlemeler, projeler, görevler, günlük, ruh hali, kütüphane, başarımlar ve XP kalıcı olarak silinir.
      </p>
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className="mt-3 rounded-xl border border-p1 px-4 py-2 text-sm font-medium text-p1">
          Sıfırla…
        </button>
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          <p className="rounded-xl bg-bg p-3 text-sm">
            Bu geri alınamaz. Önce yukarıdan <b>Yedeği indir</b>'e bas. Otomatik yedek de kapanır, böylece son yedek
            dosyan boş verilerle ezilmez. API anahtarların ve ayarların kalır.
          </p>
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder="Onaylamak için SİL yaz"
            aria-label="Onaylamak için SİL yaz"
            className="w-full rounded-xl border border-border bg-bg px-3 py-2.5 outline-none focus:border-p1"
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={!ready || busy}
              onClick={async () => {
                setBusy(true)
                await resetAllData()
                // A fresh start: every screen and watcher reads the empty database.
                window.location.assign(import.meta.env.BASE_URL)
              }}
              className="flex-1 rounded-xl bg-p1 py-2.5 text-sm font-medium text-surface disabled:opacity-40"
            >
              {busy ? 'Siliniyor…' : 'Hepsini sil'}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                setTyped('')
              }}
              className="rounded-xl px-4 py-2.5 text-sm text-muted"
            >
              Vazgeç
            </button>
          </div>
        </div>
      )}
    </section>
  )
}

/** In-app planning chat with the user's own Gemini key; the key never leaves this device except to Google. */
const UPDATE_MESSAGES: Record<UpdateResult, string> = {
  latest: 'Son sürümü kullanıyorsun ✓',
  updating: 'Yeni sürüm yükleniyor, uygulama birazdan yenilenecek…',
  offline: 'İnternet yok. Bağlanınca tekrar dene.',
  unsupported: 'Bu ortamda güncelleme yok (geliştirme sürümü).',
  failed: 'Kontrol edilemedi, biraz sonra tekrar dene.',
}

function UpdateSection() {
  const [result, setResult] = useState<UpdateResult | 'checking'>()

  async function check() {
    setResult('checking')
    setResult(await checkForUpdate())
  }

  return (
    <div className="flex flex-col items-center gap-2 py-2 text-center text-xs text-muted">
      <p>
        Sürüm {__APP_VERSION__}
        {androidBridge && ` · Android uygulaması ${androidBridge.version()}`}
        <br />
        Yeni sürümler kendiliğinden yüklenir.
      </p>
      <button
        type="button"
        onClick={check}
        disabled={result === 'checking' || result === 'updating'}
        className="rounded-xl border border-border bg-surface px-4 py-2 text-sm font-medium text-text disabled:opacity-60"
      >
        {result === 'checking' ? 'Kontrol ediliyor…' : 'Güncellemeleri kontrol et'}
      </button>
      {result && result !== 'checking' && <p className="text-sm">{UPDATE_MESSAGES[result]}</p>}
    </div>
  )
}

function GeminiSection() {
  const ai = useAiSettings()
  const [key, setKey] = useState(ai.geminiKey)
  const saved = key.trim() === ai.geminiKey && ai.geminiKey !== ''
  const [check, setCheck] = useState<{ ok: boolean; text: string } | 'checking'>()

  async function saveAndCheck() {
    setAiSettings({ geminiKey: key })
    if (!key.trim()) return setCheck(undefined)
    setCheck('checking')
    try {
      await askGemini(key, 'Tek kelimeyle cevap ver.', [{ role: 'user', text: 'Merhaba' }])
      setCheck({ ok: true, text: 'Anahtar çalışıyor ✓' })
    } catch (e) {
      setCheck({ ok: false, text: (e as Error).message })
    }
  }

  return (
    <section id="yapay-zeka" className="rounded-2xl border border-border bg-surface p-4">
      <Switch label="Gemini asistanı" checked={ai.gemini} onChange={(gemini) => setAiSettings({ gemini })} />
      <p className="mt-1 text-sm text-muted">
        Uygulamanın içinde sohbet ederek hedef planla; plan hazır olunca adımlar, habit'ler ve görevler tek
        dokunuşla eklenir. Kendi ücretsiz Gemini anahtarınla çalışır.
      </p>
      {ai.gemini && (
        <>
          <ol className="mt-3 flex list-decimal flex-col gap-2 pl-5 text-sm">
            <li>
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-accent underline"
              >
                aistudio.google.com/apikey
              </a>{' '}
              sayfasında Google hesabınla <b>Create API key</b> de.
            </li>
            <li>Anahtarı kopyalayıp buraya yapıştır.</li>
          </ol>
          <div className="mt-4 flex gap-2">
            <input
              value={key}
              onChange={(e) => setKey(e.target.value)}
              type="password"
              placeholder="Gemini API anahtarı"
              aria-label="Gemini API anahtarı"
              autoComplete="off"
              spellCheck={false}
              className="min-w-0 flex-1 rounded-xl border border-border bg-bg px-3 py-2.5 text-sm outline-none focus:border-accent"
            />
            <button
              type="button"
              onClick={saveAndCheck}
              disabled={check === 'checking'}
              className="rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-surface disabled:opacity-60"
            >
              {check === 'checking' ? 'Deneniyor…' : saved ? 'Tekrar dene' : 'Kaydet'}
            </button>
          </div>
          {check && check !== 'checking' && (
            <p className={`mt-2 text-sm ${check.ok ? 'text-accent' : 'text-red-600 dark:text-red-400'}`}>{check.text}</p>
          )}
          <p className="mt-2 text-xs text-muted">
            Anahtar sadece bu cihazda saklanır, yedeğe girmez. Sohbetler doğrudan Google'a gider.
          </p>
          {ai.geminiKey && (
            <p className="mt-2 text-sm text-muted">
              Projeler sekmesinde <b>💬 Gemini ile planla</b> butonunu kullan.
            </p>
          )}
        </>
      )}
    </section>
  )
}

function Switch({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3">
      <span className="font-medium">{label}</span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className="relative h-7 w-12 shrink-0 rounded-full bg-border transition-colors peer-checked:bg-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent after:absolute after:top-1 after:left-1 after:h-5 after:w-5 after:rounded-full after:bg-surface after:shadow after:transition-transform peer-checked:after:translate-x-5"
      />
    </label>
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
