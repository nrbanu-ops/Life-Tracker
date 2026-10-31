package app.lifetracker;

import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.net.Uri;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.provider.MediaStore;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.widget.Toast;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

/**
 * window.LifeTrackerAndroid in the web app (src/lib/android.ts). Files go to
 * Downloads/LifeTracker/ through MediaStore, so no storage permission is needed.
 */
final class Bridge {
    private static final String FOLDER = Environment.DIRECTORY_DOWNLOADS + "/LifeTracker/";

    private final Context context;
    private final Runnable retry;
    private final Handler main = new Handler(Looper.getMainLooper());

    Bridge(Context context, Runnable retry) {
        this.context = context.getApplicationContext();
        this.retry = retry;
    }

    @JavascriptInterface
    public int version() {
        return BuildConfig.VERSION_CODE;
    }

    @JavascriptInterface
    public void retry() {
        retry.run();
    }

    /** A one-off download (manual backup); always a new file. */
    @JavascriptInterface
    public boolean saveFile(String name, String mimeType, String base64) {
        try {
            byte[] bytes = Base64.decode(base64, Base64.DEFAULT);
            Uri uri = insert(safeName(name), mimeType);
            write(uri, bytes);
            toast("İndirilenler/LifeTracker klasörüne kaydedildi");
            return true;
        } catch (Exception e) {
            toast("Dosya kaydedilemedi");
            return false;
        }
    }

    /** The automatic backup: overwrites the same file each time. */
    @JavascriptInterface
    public boolean writeText(String name, String text) {
        try {
            String file = safeName(name);
            Uri uri = find(file);
            if (uri == null) uri = insert(file, "application/json");
            write(uri, text.getBytes(StandardCharsets.UTF_8));
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    private Uri insert(String name, String mimeType) {
        ContentValues values = new ContentValues();
        values.put(MediaStore.MediaColumns.DISPLAY_NAME, name);
        values.put(MediaStore.MediaColumns.MIME_TYPE, mimeType);
        values.put(MediaStore.MediaColumns.RELATIVE_PATH, FOLDER);
        Uri uri = context.getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
        if (uri == null) throw new IllegalStateException("insert failed");
        return uri;
    }

    /** A file this app created earlier (apps only see their own files here). */
    private Uri find(String name) {
        ContentResolver resolver = context.getContentResolver();
        String[] columns = {MediaStore.MediaColumns._ID};
        String where = MediaStore.MediaColumns.DISPLAY_NAME + "=? AND " + MediaStore.MediaColumns.RELATIVE_PATH + "=?";
        try (Cursor c = resolver.query(MediaStore.Downloads.EXTERNAL_CONTENT_URI, columns, where, new String[] {name, FOLDER}, null)) {
            if (c != null && c.moveToFirst()) {
                return Uri.withAppendedPath(MediaStore.Downloads.EXTERNAL_CONTENT_URI, String.valueOf(c.getLong(0)));
            }
        }
        return null;
    }

    private void write(Uri uri, byte[] bytes) throws Exception {
        try (OutputStream out = context.getContentResolver().openOutputStream(uri, "wt")) {
            if (out == null) throw new IllegalStateException("no stream");
            out.write(bytes);
        }
    }

    private static String safeName(String name) {
        String clean = name == null ? "" : name.replaceAll("[\\\\/:*?\"<>|]", "_").trim();
        return clean.isEmpty() ? "life-tracker" : clean;
    }

    private void toast(String text) {
        main.post(() -> Toast.makeText(context, text, Toast.LENGTH_SHORT).show());
    }
}
