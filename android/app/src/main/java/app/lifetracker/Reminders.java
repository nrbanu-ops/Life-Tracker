package app.lifetracker;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import java.util.Calendar;

/**
 * One daily reminder, set from the web app (Settings → Hatırlatıcılar).
 *
 * The alarm is inexact on purpose: Android may move it by a few minutes, which costs nothing for
 * a nudge and avoids the exact-alarm permission. The time is kept here as well so the reminder
 * survives a reboot, when the system drops every alarm.
 */
final class Reminders {
    static final String CHANNEL = "daily";
    static final String EXTRA_TEXT = "text";

    private static final String PREFS = "reminders";
    private static final String KEY_ON = "on";
    private static final String KEY_HOUR = "hour";
    private static final String KEY_MINUTE = "minute";
    private static final String KEY_TEXT = "text";
    private static final int REQUEST = 101;

    private Reminders() {}

    /** Shown the first time a notification is posted; a channel must exist before then. */
    static void createChannel(Context context) {
        NotificationChannel channel =
                new NotificationChannel(CHANNEL, "Günlük hatırlatma", NotificationManager.IMPORTANCE_DEFAULT);
        channel.setDescription("Seçtiğin saatte günü işaretlemeyi hatırlatır.");
        context.getSystemService(NotificationManager.class).createNotificationChannel(channel);
    }

    static boolean schedule(Context context, int hour, int minute, String text) {
        if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return false;
        String message = text == null || text.trim().isEmpty() ? "Bugünü işaretlemeyi unutma" : text.trim();
        prefs(context)
                .edit()
                .putBoolean(KEY_ON, true)
                .putInt(KEY_HOUR, hour)
                .putInt(KEY_MINUTE, minute)
                .putString(KEY_TEXT, message)
                .apply();
        return arm(context, hour, minute, message);
    }

    static boolean cancel(Context context) {
        prefs(context).edit().putBoolean(KEY_ON, false).apply();
        try {
            context.getSystemService(AlarmManager.class).cancel(intent(context, null));
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    /** After a reboot the alarm is gone; this puts the saved one back. */
    static void rearm(Context context) {
        SharedPreferences prefs = prefs(context);
        if (!prefs.getBoolean(KEY_ON, false)) return;
        arm(context, prefs.getInt(KEY_HOUR, 21), prefs.getInt(KEY_MINUTE, 0), prefs.getString(KEY_TEXT, ""));
    }

    private static boolean arm(Context context, int hour, int minute, String text) {
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
                            intent(context, text));
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    private static PendingIntent intent(Context context, String text) {
        Intent broadcast = new Intent(context, ReminderReceiver.class);
        if (text != null) broadcast.putExtra(EXTRA_TEXT, text);
        return PendingIntent.getBroadcast(
                context, REQUEST, broadcast, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    /** Posts the reminder; tapping it opens the app. */
    static void show(Context context, String text) {
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
                        .setContentText(text == null || text.isEmpty() ? "Bugünü işaretlemeyi unutma" : text)
                        .setContentIntent(open)
                        .setAutoCancel(true)
                        .build();
        context.getSystemService(NotificationManager.class).notify(REQUEST, notification);
    }

    private static SharedPreferences prefs(Context context) {
        return context.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }
}
