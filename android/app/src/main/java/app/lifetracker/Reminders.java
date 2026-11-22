package app.lifetracker;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;

/**
 * Daily reminders, set from the web app (Ayarlar → Hatırlatıcılar). Two slots: the daily one
 * ("" — its keys predate slots, so they stay unprefixed) and the weigh-in one (WEIGH), which
 * stays quiet on a day the web app has already reported a weigh-in for (markWeighed).
 *
 * The alarm is inexact on purpose: Android may move it by a few minutes, which costs nothing for
 * a nudge and avoids the exact-alarm permission. The time is kept here as well so the reminder
 * survives a reboot, when the system drops every alarm.
 */
final class Reminders {
    static final String CHANNEL = "daily";
    static final String EXTRA_TEXT = "text";
    static final String EXTRA_SLOT = "slot";
    static final String WEIGH = "weigh_";

    private static final String PREFS = "reminders";
    private static final String KEY_ON = "on";
    private static final String KEY_HOUR = "hour";
    private static final String KEY_MINUTE = "minute";
    private static final String KEY_TEXT = "text";
    private static final String KEY_WEIGHED = "weighed";
    private static final int REQUEST = 101;
    private static final int REQUEST_WEIGH = 102;

    private Reminders() {}

    /** Shown the first time a notification is posted; a channel must exist before then. */
    static void createChannel(Context context) {
        NotificationChannel channel =
                new NotificationChannel(CHANNEL, "Günlük hatırlatma", NotificationManager.IMPORTANCE_DEFAULT);
        channel.setDescription("Seçtiğin saatte günü işaretlemeyi hatırlatır.");
        context.getSystemService(NotificationManager.class).createNotificationChannel(channel);
    }

    static boolean schedule(Context context, int hour, int minute, String text) {
        return schedule(context, "", hour, minute, text);
    }

    static boolean schedule(Context context, String slot, int hour, int minute, String text) {
        if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return false;
        String message = text == null || text.trim().isEmpty() ? defaultText(slot) : text.trim();
        prefs(context)
                .edit()
                .putBoolean(slot + KEY_ON, true)
                .putInt(slot + KEY_HOUR, hour)
                .putInt(slot + KEY_MINUTE, minute)
                .putString(slot + KEY_TEXT, message)
                .apply();
        return arm(context, slot, hour, minute, message);
    }

    static boolean cancel(Context context) {
        return cancel(context, "");
    }

    static boolean cancel(Context context, String slot) {
        prefs(context).edit().putBoolean(slot + KEY_ON, false).apply();
        try {
            context.getSystemService(AlarmManager.class).cancel(intent(context, slot, null));
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    /** The day (yyyy-MM-dd) the web app last saw a weigh-in for today; "" clears it. */
    static void markWeighed(Context context, String day) {
        prefs(context).edit().putString(KEY_WEIGHED, day == null ? "" : day).apply();
    }

    /** After a reboot the alarms are gone; this puts the saved ones back. */
    static void rearm(Context context) {
        rearm(context, "");
        rearm(context, WEIGH);
    }

    private static void rearm(Context context, String slot) {
        SharedPreferences prefs = prefs(context);
        if (!prefs.getBoolean(slot + KEY_ON, false)) return;
        int hour = prefs.getInt(slot + KEY_HOUR, WEIGH.equals(slot) ? 8 : 21);
        int minute = prefs.getInt(slot + KEY_MINUTE, 0);
        arm(context, slot, hour, minute, prefs.getString(slot + KEY_TEXT, ""));
    }

    private static boolean arm(Context context, String slot, int hour, int minute, String text) {
        Calendar when = Calendar.getInstance();
        when.set(Calendar.HOUR_OF_DAY, hour);
        when.set(Calendar.MINUTE, minute);
        when.set(Calendar.SECOND, 0);
        when.set(Calendar.MILLISECOND, 0);
        // Today's time has passed: start tomorrow rather than firing at once.
        if (when.getTimeInMillis() <= System.currentTimeMillis()) when.add(Calendar.DAY_OF_YEAR, 1);
        try {
            context.getSystemService(AlarmManager.class)
                    .setInexactRepeating(
                            AlarmManager.RTC_WAKEUP,
                            when.getTimeInMillis(),
                            AlarmManager.INTERVAL_DAY,
                            intent(context, slot, text));
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    private static int request(String slot) {
        return WEIGH.equals(slot) ? REQUEST_WEIGH : REQUEST;
    }

    private static String defaultText(String slot) {
        return WEIGH.equals(slot) ? "Bugün tartılmayı unutma" : "Bugünü işaretlemeyi unutma";
    }

    private static PendingIntent intent(Context context, String slot, String text) {
        Intent broadcast = new Intent(context, ReminderReceiver.class);
        // Matching ignores extras, so the request code is what keeps the two alarms apart.
        broadcast.putExtra(EXTRA_SLOT, slot);
        if (text != null) broadcast.putExtra(EXTRA_TEXT, text);
        return PendingIntent.getBroadcast(
                context, request(slot), broadcast, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    /** Posts the reminder; tapping it opens the app. The weigh-in one keeps quiet once weighed today. */
    static void show(Context context, String slot, String text) {
        String which = slot == null ? "" : slot;
        if (WEIGH.equals(which)) {
            String today = new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
            if (today.equals(prefs(context).getString(KEY_WEIGHED, ""))) return;
        }
        createChannel(context);
        PendingIntent open =
                PendingIntent.getActivity(
                        context,
                        0,
                        new Intent(context, MainActivity.class)
                                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP),
                        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Notification notification =
                new Notification.Builder(context, CHANNEL)
                        .setSmallIcon(R.drawable.ic_notification)
                        .setContentTitle("Life Tracker")
                        .setContentText(text == null || text.isEmpty() ? defaultText(which) : text)
                        .setContentIntent(open)
                        .setAutoCancel(true)
                        .build();
        context.getSystemService(NotificationManager.class).notify(request(which), notification);
    }

    private static SharedPreferences prefs(Context context) {
        return context.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }
}
