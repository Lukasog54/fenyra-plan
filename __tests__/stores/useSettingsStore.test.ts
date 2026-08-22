import { useSettingsStore } from "../../src/stores/useSettingsStore";
import { resetStores } from "../../test-utils/resetStores";
import { STUNDENPLAN24_SOURCE_ID, STUNDENPLAN24_BASE_URL } from "../../src/data/constants";

beforeEach(() => {
  resetStores();
});

describe("useSettingsStore defaults", () => {
  it("has the expected default state shape", () => {
    const state = useSettingsStore.getState();
    expect(state.theme).toBe("system");
    expect(state.syncIntervalMinutes).toBe(30);
    expect(state.wifiOnlySync).toBe(false);
    expect(state.notificationsEnabled).toBe(false);
    expect(state.dismissedUpdateVersion).toBeNull();
    expect(state.selectedClassName).toBeNull();
    expect(state.displayName).toBe("");
  });

  it("defaults all notification categories to true", () => {
    const { notificationCategories } = useSettingsStore.getState();
    expect(notificationCategories).toEqual({
      vertretungen: true,
      ausfaelle: true,
      raumaenderungen: true,
      lehreraenderungen: true,
      syncFehler: true,
      updates: true,
    });
  });

  it("defaults schoolConfig to the stundenplan24 source with the fixed base URL and empty credentials", () => {
    const { schoolConfig } = useSettingsStore.getState();
    expect(schoolConfig).toEqual({
      id: STUNDENPLAN24_SOURCE_ID,
      displayName: "Stundenplan24",
      kind: "stundenplan24",
      stundenplan24: { baseUrl: STUNDENPLAN24_BASE_URL, schoolId: "", username: "" },
    });
  });
});

describe("useSettingsStore setters", () => {
  it("setTheme updates theme", () => {
    useSettingsStore.getState().setTheme("dark");
    expect(useSettingsStore.getState().theme).toBe("dark");
  });

  it("setSyncIntervalMinutes updates syncIntervalMinutes", () => {
    useSettingsStore.getState().setSyncIntervalMinutes(15);
    expect(useSettingsStore.getState().syncIntervalMinutes).toBe(15);
  });

  it("setWifiOnlySync updates wifiOnlySync", () => {
    useSettingsStore.getState().setWifiOnlySync(true);
    expect(useSettingsStore.getState().wifiOnlySync).toBe(true);
  });

  it("setNotificationsEnabled updates notificationsEnabled", () => {
    useSettingsStore.getState().setNotificationsEnabled(true);
    expect(useSettingsStore.getState().notificationsEnabled).toBe(true);
  });

  it("setNotificationCategory flips a single category without touching the others", () => {
    useSettingsStore.getState().setNotificationCategory("ausfaelle", false);
    const { notificationCategories } = useSettingsStore.getState();
    expect(notificationCategories.ausfaelle).toBe(false);
    expect(notificationCategories.vertretungen).toBe(true);
    expect(notificationCategories.raumaenderungen).toBe(true);
    expect(notificationCategories.lehreraenderungen).toBe(true);
    expect(notificationCategories.syncFehler).toBe(true);
    expect(notificationCategories.updates).toBe(true);
  });

  it("setDismissedUpdateVersion sets and clears the version", () => {
    useSettingsStore.getState().setDismissedUpdateVersion("1.0.9");
    expect(useSettingsStore.getState().dismissedUpdateVersion).toBe("1.0.9");
    useSettingsStore.getState().setDismissedUpdateVersion(null);
    expect(useSettingsStore.getState().dismissedUpdateVersion).toBeNull();
  });

  it("setSelectedClassName sets and clears the class name", () => {
    useSettingsStore.getState().setSelectedClassName("10a");
    expect(useSettingsStore.getState().selectedClassName).toBe("10a");
    useSettingsStore.getState().setSelectedClassName(null);
    expect(useSettingsStore.getState().selectedClassName).toBeNull();
  });

  it("setDisplayName updates displayName", () => {
    useSettingsStore.getState().setDisplayName("Max");
    expect(useSettingsStore.getState().displayName).toBe("Max");
  });
});

describe("useSettingsStore updateSchoolConfig", () => {
  it("merges partial stundenplan24 fields on top of the current config", () => {
    useSettingsStore.getState().updateSchoolConfig({ schoolId: "12345" });
    useSettingsStore.getState().updateSchoolConfig({ username: "max.mustermann" });
    expect(useSettingsStore.getState().schoolConfig.stundenplan24).toEqual({
      baseUrl: STUNDENPLAN24_BASE_URL,
      schoolId: "12345",
      username: "max.mustermann",
    });
  });

  it("keeps the previous schoolId when the partial omits it", () => {
    useSettingsStore.getState().updateSchoolConfig({ schoolId: "12345" });
    useSettingsStore.getState().updateSchoolConfig({ username: "someone" });
    expect(useSettingsStore.getState().schoolConfig.stundenplan24?.schoolId).toBe("12345");
  });

  it("force-overrides baseUrl to the fixed constant even if the partial tries to change it", () => {
    useSettingsStore.getState().updateSchoolConfig({ baseUrl: "https://evil.example.com" } as any);
    expect(useSettingsStore.getState().schoolConfig.stundenplan24?.baseUrl).toBe(STUNDENPLAN24_BASE_URL);
  });

  it("preserves other top-level schoolConfig fields (id, displayName, kind)", () => {
    useSettingsStore.getState().updateSchoolConfig({ schoolId: "999" });
    const { schoolConfig } = useSettingsStore.getState();
    expect(schoolConfig.id).toBe(STUNDENPLAN24_SOURCE_ID);
    expect(schoolConfig.displayName).toBe("Stundenplan24");
    expect(schoolConfig.kind).toBe("stundenplan24");
  });

  it("sets a credentialRef when provided in the partial", () => {
    useSettingsStore.getState().updateSchoolConfig({ credentialRef: "secure:cred-1" });
    expect(useSettingsStore.getState().schoolConfig.stundenplan24?.credentialRef).toBe("secure:cred-1");
  });

  it("falls back to a default stundenplan24 shape when schoolConfig.stundenplan24 is missing", () => {
    useSettingsStore.setState((state) => ({
      schoolConfig: { ...state.schoolConfig, stundenplan24: undefined },
    }));
    useSettingsStore.getState().updateSchoolConfig({ username: "fresh" });
    expect(useSettingsStore.getState().schoolConfig.stundenplan24).toEqual({
      baseUrl: STUNDENPLAN24_BASE_URL,
      schoolId: "",
      username: "fresh",
    });
  });
});
