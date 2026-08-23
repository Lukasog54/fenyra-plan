import { Platform } from "react-native";
import Constants, { AppOwnership } from "expo-constants";
import type { SubstitutionChangeEvent } from "../models/SubstitutionChangeEvent";
import type { NotificationCategory } from "./types";
import { markEventsNotified } from "../database/repositories/changeEventRepository";
import { useSettingsStore } from "../../stores/useSettingsStore";

type NotificationsModule = typeof import("expo-notifications");

/**
 * expo-notifications is broken under Expo Go on Android (remote/push functionality was removed
 * from Expo Go in SDK 53) - not just a clean thrown error either: the module schedules an async
 * push-token registration as a side effect of being required, which then fails *asynchronously*
 * and surfaces as an unhandled/logged error no synchronous try/catch around `require()` can catch
 * (confirmed live - the try/catch below did NOT stop the red-box error once something actually
 * called into notification code on every app start, e.g. registering the tap listener).
 * `Constants.appOwnership === "expo"` means "actually running inside the Expo Go client app"
 * (unlike `executionEnvironment === "storeClient"`, which also covers dev-client builds where
 * expo-notifications works fine) - checked BEFORE ever touching the module, so it's never
 * required at all in Expo Go and the broken async side effect never gets a chance to run.
 */
const isExpoGo = Constants.appOwnership === AppOwnership.Expo;

let cachedModule: NotificationsModule | null | undefined;

function loadNotifications(): NotificationsModule | null {
  if (cachedModule !== undefined) return cachedModule;
  if (isExpoGo) {
    cachedModule = null;
    return cachedModule;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod: NotificationsModule = require("expo-notifications");
    mod.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
    cachedModule = mod;
  } catch {
    cachedModule = null;
  }
  return cachedModule;
}

const ANDROID_CHANNEL_ID = "fenyra-default";

export async function ensureNotificationChannel(): Promise<void> {
  const Notifications = loadNotifications();
  if (!Notifications || Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: "Fenyra Plan",
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

/** Triggers the OS permission prompt - call only from an explicit user action (enabling the setting). */
export async function requestNotificationPermission(): Promise<boolean> {
  const Notifications = loadNotifications();
  if (!Notifications) return false;
  const existing = await Notifications.getPermissionsAsync();
  if (existing.status === "granted") return true;
  const result = await Notifications.requestPermissionsAsync();
  return result.status === "granted";
}

/**
 * Maps a change event to a notification category, or null if it isn't notification-worthy.
 * Only `status` transitions into an actual substitution kind qualify - a lesson simply
 * *appearing* with status "normal" (e.g. the very first sync ever, which diffs against an empty
 * previous set) is not a substitution and would otherwise spam hundreds of notifications.
 * Field-level room/teacher/subject/note events are intentionally excluded here too: they fire
 * alongside the matching status event for the same lesson transition, so notifying on both would
 * duplicate the same real-world change.
 */
function categoryForEvent(event: SubstitutionChangeEvent): NotificationCategory | null {
  if (event.field !== "status") return null;
  switch (event.newValue) {
    case "cancelled":
      return "ausfaelle";
    case "room-change":
      return "raumaenderungen";
    case "teacher-change":
      return "lehreraenderungen";
    case "subject-change":
    case "substitution":
    case "moved":
    case "unknown":
      return "vertretungen";
    default:
      return null; // "normal" (boring appearance) or null (lesson disappeared)
  }
}

function titleForEvent(event: SubstitutionChangeEvent): string {
  const classPart = event.className ? `${event.className} · ` : "";
  switch (event.newValue) {
    case "cancelled":
      return `${classPart}Stunde fällt aus`;
    case "room-change":
      return `${classPart}Raumänderung`;
    case "teacher-change":
      return `${classPart}Lehreränderung`;
    case "subject-change":
      return `${classPart}Fachänderung`;
    case "moved":
      return `${classPart}Stunde verlegt`;
    default:
      return `${classPart}Neue Vertretung`;
  }
}

/**
 * Sends local notifications for newly-detected, not-yet-notified change events, respecting the
 * user's master switch and per-category toggles, then marks them notified so a later sync that
 * still sees the same stored state (nothing new) never re-notifies for it.
 */
export async function notifyNewChangeEvents(events: SubstitutionChangeEvent[]): Promise<void> {
  const settings = useSettingsStore.getState();
  if (!settings.notificationsEnabled) return;

  const toNotify = events.filter((event) => {
    if (event.notified) return false;
    const category = categoryForEvent(event);
    return category !== null && settings.notificationCategories[category];
  });
  if (toNotify.length === 0) return;

  const Notifications = loadNotifications();
  if (!Notifications) return;

  try {
    await ensureNotificationChannel();
    for (const event of toNotify) {
      // The status event alone doesn't carry the old/new field values (that's a separate,
      // deliberately-not-notified room/teacher/subject event for the same lesson) - the title
      // already names the class and change kind, so the body just points at the app for details.
      await Notifications.scheduleNotificationAsync({
        // `date` lets a tap on this notification jump straight to the affected day in the Plan
        // tab (see addNotificationTapListener below) instead of just opening to whatever screen
        // was last open.
        content: { title: titleForEvent(event), body: "In Fenyra Plan ansehen", data: { date: event.date } },
        trigger: null,
      });
    }
    await markEventsNotified(toNotify.map((e) => e.id));
  } catch {
    // A notification failure must never break the sync it's reporting on.
  }
}

/**
 * Registers a listener for notification taps and calls `onDateTap` with the affected day (from
 * the `data.date` set in notifyNewChangeEvents above) so the caller can navigate straight to it.
 * No-ops (returns a harmless unsubscribe) when notifications aren't available on this runtime.
 * Also checks whether the app was COLD-STARTED by tapping a notification (not just resumed from
 * background), since `addNotificationResponseReceivedListener` alone misses that case.
 */
export function addNotificationTapListener(onDateTap: (date: string) => void): () => void {
  const Notifications = loadNotifications();
  if (!Notifications) return () => {};

  function handleResponse(response: { notification: { request: { content: { data?: Record<string, unknown> } } } }): void {
    const date = response.notification.request.content.data?.date;
    if (typeof date === "string") onDateTap(date);
  }

  Notifications.getLastNotificationResponseAsync()
    .then((response) => {
      if (response) handleResponse(response);
    })
    .catch(() => {});

  const subscription = Notifications.addNotificationResponseReceivedListener(handleResponse);
  return () => subscription.remove();
}

export async function notifySyncError(message: string): Promise<void> {
  const settings = useSettingsStore.getState();
  if (!settings.notificationsEnabled || !settings.notificationCategories.syncFehler) return;

  const Notifications = loadNotifications();
  if (!Notifications) return;

  try {
    await ensureNotificationChannel();
    await Notifications.scheduleNotificationAsync({
      content: { title: "Synchronisierung fehlgeschlagen", body: message },
      trigger: null,
    });
  } catch {
    // Same as above - never let a notification failure mask the real sync error.
  }
}
