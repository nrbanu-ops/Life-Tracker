package app.lifetracker;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Receives the daily alarm, and the boot broadcast that means every alarm was forgotten. */
public final class ReminderReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        try {
            if (Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())) {
                Reminders.rearm(context);
                return;
            }
            // Alarms set before slots existed carry no slot: they are the daily one.
            Reminders.show(context, intent.getStringExtra(Reminders.EXTRA_SLOT), intent.getStringExtra(Reminders.EXTRA_TEXT));
        } catch (Exception e) {
            // A reminder is never worth crashing the app for.
        }
    }
}
