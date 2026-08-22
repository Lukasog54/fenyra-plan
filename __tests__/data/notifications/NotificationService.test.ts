import * as Notifications from "expo-notifications";
import { notifyNewChangeEvents, notifySyncError, addNotificationTapListener } from "../../../src/data/notifications/NotificationService";
import { markEventsNotified } from "../../../src/data/database/repositories/changeEventRepository";
import { useSettingsStore } from "../../../src/stores/useSettingsStore";
import type { SubstitutionChangeEvent } from "../../../src/data/models/SubstitutionChangeEvent";

jest.mock("../../../src/data/database/repositories/changeEventRepository");
const mockedMarkNotified = markEventsNotified as jest.Mock;
const mockedSchedule = Notifications.scheduleNotificationAsync as jest.Mock;

function makeEvent(overrides: Partial<SubstitutionChangeEvent>): SubstitutionChangeEvent {
  return {
    id: `evt_${Math.random()}`,
    lessonId: "l1",
    date: "2026-08-19",
    className: "10a",
    field: "status",
    previousValue: "normal",
    newValue: "cancelled",
    detectedAt: "2026-08-19T10:00:00.000Z",
    acknowledged: false,
    notified: false,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  useSettingsStore.setState({
    notificationsEnabled: true,
    notificationCategories: {
      vertretungen: true,
      ausfaelle: true,
      raumaenderungen: true,
      lehreraenderungen: true,
      syncFehler: true,
      updates: true,
    },
  });
});

describe("notifyNewChangeEvents", () => {
  it("does nothing when the master switch is off", async () => {
    useSettingsStore.setState({ notificationsEnabled: false });
    await notifyNewChangeEvents([makeEvent({})]);
    expect(mockedSchedule).not.toHaveBeenCalled();
  });

  it("sends one notification for a genuine status-change event and marks it notified", async () => {
    const event = makeEvent({ field: "status", newValue: "cancelled" });
    await notifyNewChangeEvents([event]);

    expect(mockedSchedule).toHaveBeenCalledTimes(1);
    expect(mockedMarkNotified).toHaveBeenCalledWith([event.id]);
  });

  it("attaches the affected date so a tap can deep-link to it", async () => {
    const event = makeEvent({ field: "status", newValue: "cancelled", date: "2026-08-24" });
    await notifyNewChangeEvents([event]);

    expect(mockedSchedule).toHaveBeenCalledWith(expect.objectContaining({ content: expect.objectContaining({ data: { date: "2026-08-24" } }) }));
  });

  it("does not re-notify an event that was already notified", async () => {
    await notifyNewChangeEvents([makeEvent({ notified: true })]);
    expect(mockedSchedule).not.toHaveBeenCalled();
  });

  it("does not notify a plain lesson appearance with status normal (e.g. the first-ever sync)", async () => {
    await notifyNewChangeEvents([makeEvent({ field: "status", previousValue: null, newValue: "normal" })]);
    expect(mockedSchedule).not.toHaveBeenCalled();
  });

  it("does not notify a lesson disappearing (newValue null)", async () => {
    await notifyNewChangeEvents([makeEvent({ field: "status", previousValue: "normal", newValue: null })]);
    expect(mockedSchedule).not.toHaveBeenCalled();
  });

  it("does not notify field-level room/teacher/subject/note events (would duplicate the matching status event)", async () => {
    await notifyNewChangeEvents([makeEvent({ field: "room", previousValue: "204", newValue: "301" })]);
    expect(mockedSchedule).not.toHaveBeenCalled();
  });

  it("respects a disabled category toggle", async () => {
    useSettingsStore.setState({
      notificationCategories: {
        vertretungen: true,
        ausfaelle: false,
        raumaenderungen: true,
        lehreraenderungen: true,
        syncFehler: true,
        updates: true,
      },
    });
    await notifyNewChangeEvents([makeEvent({ field: "status", newValue: "cancelled" })]);
    expect(mockedSchedule).not.toHaveBeenCalled();
  });
});

describe("notifySyncError", () => {
  it("sends a notification when enabled", async () => {
    await notifySyncError("Verbindung fehlgeschlagen");
    expect(mockedSchedule).toHaveBeenCalledTimes(1);
  });

  it("does nothing when the syncFehler category is disabled", async () => {
    useSettingsStore.setState({
      notificationCategories: {
        vertretungen: true,
        ausfaelle: true,
        raumaenderungen: true,
        lehreraenderungen: true,
        syncFehler: false,
        updates: true,
      },
    });
    await notifySyncError("Verbindung fehlgeschlagen");
    expect(mockedSchedule).not.toHaveBeenCalled();
  });
});

describe("addNotificationTapListener", () => {
  it("calls onDateTap with the date from a freshly tapped notification", () => {
    const mockedAddListener = Notifications.addNotificationResponseReceivedListener as jest.Mock;
    let capturedHandler: ((response: unknown) => void) | undefined;
    mockedAddListener.mockImplementation((handler) => {
      capturedHandler = handler;
      return { remove: jest.fn() };
    });
    const onDateTap = jest.fn();

    addNotificationTapListener(onDateTap);
    capturedHandler?.({ notification: { request: { content: { data: { date: "2026-08-24" } } } } });

    expect(onDateTap).toHaveBeenCalledWith("2026-08-24");
  });

  it("ignores a tap response with no date payload", () => {
    const mockedAddListener = Notifications.addNotificationResponseReceivedListener as jest.Mock;
    let capturedHandler: ((response: unknown) => void) | undefined;
    mockedAddListener.mockImplementation((handler) => {
      capturedHandler = handler;
      return { remove: jest.fn() };
    });
    const onDateTap = jest.fn();

    addNotificationTapListener(onDateTap);
    capturedHandler?.({ notification: { request: { content: {} } } });

    expect(onDateTap).not.toHaveBeenCalled();
  });

  it("also checks for a cold-start tap via getLastNotificationResponseAsync", async () => {
    const mockedGetLast = Notifications.getLastNotificationResponseAsync as jest.Mock;
    mockedGetLast.mockResolvedValue({ notification: { request: { content: { data: { date: "2026-08-25" } } } } });
    const onDateTap = jest.fn();

    addNotificationTapListener(onDateTap);
    await Promise.resolve();
    await Promise.resolve();

    expect(onDateTap).toHaveBeenCalledWith("2026-08-25");
  });
});

describe("Expo Go detection", () => {
  // Regression test: expo-notifications doesn't just throw synchronously when required under
  // Expo Go - it also schedules an async push-token registration as a side effect of being
  // required, which fails *asynchronously* and isn't catchable by a synchronous try/catch around
  // require(). This crashed live once addNotificationTapListener started calling loadNotifications()
  // unconditionally on every app start. The fix is to never require("expo-notifications") at all
  // when Constants.appOwnership === "expo", checked up front.
  afterEach(() => {
    jest.dontMock("expo-constants");
  });

  it("never touches expo-notifications when running inside Expo Go", () => {
    jest.resetModules();
    jest.doMock("expo-constants", () => ({
      __esModule: true,
      default: { appOwnership: "expo" },
      AppOwnership: { Expo: "expo" },
    }));
    const NotificationsMock = require("expo-notifications");
    const freshService = require("../../../src/data/notifications/NotificationService");

    const unsubscribe = freshService.addNotificationTapListener(jest.fn());

    expect(NotificationsMock.addNotificationResponseReceivedListener).not.toHaveBeenCalled();
    expect(NotificationsMock.getLastNotificationResponseAsync).not.toHaveBeenCalled();
    expect(() => unsubscribe()).not.toThrow();
  });

  it("still loads expo-notifications normally outside Expo Go (e.g. a real device/EAS build)", () => {
    jest.resetModules();
    jest.doMock("expo-constants", () => ({
      __esModule: true,
      default: { appOwnership: null },
      AppOwnership: { Expo: "expo" },
    }));
    const NotificationsMock = require("expo-notifications");
    const freshService = require("../../../src/data/notifications/NotificationService");

    freshService.addNotificationTapListener(jest.fn());

    expect(NotificationsMock.addNotificationResponseReceivedListener).toHaveBeenCalled();
  });
});
