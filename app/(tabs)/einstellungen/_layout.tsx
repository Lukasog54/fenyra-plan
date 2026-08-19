import { Stack } from "expo-router";
import { useTheme } from "../../../src/theme/ThemeProvider";

const TITLES: Record<string, string> = {
  profil: "Profil",
  schule: "Schule",
  datenquelle: "Datenquelle",
  synchronisierung: "Synchronisierung",
  benachrichtigungen: "Benachrichtigungen",
  darstellung: "Darstellung",
  "offline-daten": "Offline-Daten",
  diagnose: "Daten-Diagnose",
  datenschutz: "Datenschutz",
  "ueber-die-app": "Über die App",
};

export default function EinstellungenLayout() {
  const { palette } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: palette.surface },
        headerTintColor: palette.text,
        headerTitleStyle: { color: palette.text, fontWeight: "700" },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      {Object.entries(TITLES).map(([name, title]) => (
        <Stack.Screen key={name} name={name} options={{ title }} />
      ))}
    </Stack>
  );
}
