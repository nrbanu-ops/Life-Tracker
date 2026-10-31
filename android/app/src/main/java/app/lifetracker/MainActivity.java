package app.lifetracker;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import java.io.IOException;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * The whole Android app: a full-screen WebView on the Life Tracker web app.
 *
 * Updates never need a new APK. The web app's service worker downloads each new version in the
 * background and switches to it, and keeps the app working offline. Data (IndexedDB) stays in
 * this app's WebView storage. The shell only adds what a WebView can't do alone: file picking,
 * saving files to Downloads (Bridge), opening outside links in the browser, and receiving places
 * shared from Google Maps.
 */
public class MainActivity extends Activity {
    private static final int FILE_CHOOSER = 1;

    private WebView web;
    private ValueCallback<Uri[]> pendingChooser;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        web = new WebView(this);
        web.setBackgroundColor(getColor(R.color.bg));
        setContentView(web);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setSupportZoom(false);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(true);
        s.setUserAgentString(s.getUserAgentString() + " LifeTrackerAndroid/" + BuildConfig.VERSION_CODE);
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);

        web.addJavascriptInterface(new Bridge(this, this::reload), "LifeTrackerAndroid");
        web.setWebViewClient(new Client());
        web.setWebChromeClient(new Chrome());

        if (state != null) web.restoreState(state);
        else web.loadUrl(BuildConfig.APP_URL);
        handleShare(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        handleShare(intent);
    }

    private static final Pattern SHORT_LINK = Pattern.compile("https?://(maps\\.app\\.goo\\.gl|goo\\.gl/maps)/\\S+");

    /**
     * Text shared into the app (a place from Google Maps): opens the library's add-place search
     * with it. The short link in it is swapped for the long one, which has the exact position.
     */
    private void handleShare(Intent intent) {
        if (intent == null || !Intent.ACTION_SEND.equals(intent.getAction())) return;
        String text = intent.getStringExtra(Intent.EXTRA_TEXT);
        // Handled once, not again after a rotation or a restore.
        setIntent(new Intent(Intent.ACTION_MAIN));
        if (text == null || text.trim().isEmpty()) return;
        new Thread(() -> {
            String shared = text;
            Matcher link = SHORT_LINK.matcher(text);
            if (link.find()) {
                String full = resolve(link.group());
                if (full != null) shared = text.replace(link.group(), full);
            }
            String url = BuildConfig.APP_URL + "kutuphane?paylas=" + Uri.encode(shared);
            runOnUiThread(() -> web.loadUrl(url));
        }).start();
    }

    /**
     * Follows a short link's redirects by hand (the web app can't: no CORS) up to the long
     * Google Maps URL. Null when it can't be reached; the web app then searches by name.
     */
    private static String resolve(String link) {
        String url = link;
        try {
            for (int hop = 0; hop < 6; hop++) {
                HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
                c.setInstanceFollowRedirects(false);
                c.setConnectTimeout(8000);
                c.setReadTimeout(8000);
                int code = c.getResponseCode();
                String next = c.getHeaderField("Location");
                c.disconnect();
                if (code < 300 || code >= 400 || next == null) break;
                url = new URL(new URL(url), next).toString();
                // In some countries Google first sends a consent page that carries the real URL.
                Uri uri = Uri.parse(url);
                String host = uri.getHost();
                String inner = host != null && host.startsWith("consent.") ? uri.getQueryParameter("continue") : null;
                if (inner != null) url = inner;
                if (url.contains("/maps/place/") || url.contains("/@") || url.contains("?q=")) return url;
            }
        } catch (IOException | RuntimeException ignored) {
            // No internet or an odd answer: fall back to the shared name and address.
        }
        return url.equals(link) ? null : url;
    }

    private void reload() {
        runOnUiThread(() -> web.loadUrl(BuildConfig.APP_URL));
    }

    private static boolean isAppUrl(Uri uri) {
        return uri.toString().startsWith(BuildConfig.APP_URL);
    }

    private final class Client extends WebViewClient {
        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            if (isAppUrl(uri)) return false;
            // Everything else (maps, TMDB, claude.ai, …) opens in the phone's browser or app.
            try {
                startActivity(new Intent(Intent.ACTION_VIEW, uri));
            } catch (ActivityNotFoundException ignored) {
                // Nothing can open it; stay on the page.
            }
            return true;
        }

        @Override
        public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
            // Only reached when the page isn't cached yet (first start without internet).
            if (request.isForMainFrame()) view.loadDataWithBaseURL(null, OFFLINE_PAGE, "text/html", "utf-8", null);
        }
    }

    private final class Chrome extends WebChromeClient {
        @Override
        public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
            if (pendingChooser != null) pendingChooser.onReceiveValue(null);
            pendingChooser = callback;
            try {
                startActivityForResult(params.createIntent(), FILE_CHOOSER);
                return true;
            } catch (ActivityNotFoundException e) {
                pendingChooser = null;
                return false;
            }
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == FILE_CHOOSER && pendingChooser != null) {
            pendingChooser.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(resultCode, data));
            pendingChooser = null;
            return;
        }
        super.onActivityResult(requestCode, resultCode, data);
    }

    @Override
    public void onBackPressed() {
        if (web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.onResume();
    }

    @Override
    protected void onPause() {
        // Lets the page see it's hidden: the automatic backup runs then.
        web.onPause();
        super.onPause();
    }

    @Override
    protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        web.saveState(out);
    }

    @Override
    protected void onDestroy() {
        web.destroy();
        super.onDestroy();
    }

    private static final String OFFLINE_PAGE =
        "<!doctype html><html lang=tr><meta name=viewport content='width=device-width,initial-scale=1'>"
            + "<style>body{font-family:system-ui,sans-serif;display:flex;flex-direction:column;align-items:center;"
            + "justify-content:center;height:100vh;margin:0;padding:24px;box-sizing:border-box;text-align:center;"
            + "background:#f8f5ec;color:#1d2420}@media(prefers-color-scheme:dark){body{background:#1c211d;color:#e6ebe8}}"
            + "p{color:#6b756f;max-width:280px}button{margin-top:16px;border:0;border-radius:12px;padding:12px 24px;"
            + "font-size:16px;background:#3f6b5c;color:#fff}</style>"
            + "<h2>İnternet bağlantısı yok</h2>"
            + "<p>Life Tracker ilk açılışta bir kere internetten yüklenir, sonra internetsiz de çalışır.</p>"
            + "<button onclick='LifeTrackerAndroid.retry()'>Tekrar dene</button></html>";
}
