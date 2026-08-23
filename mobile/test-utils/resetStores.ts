import { useUiStore } from "../src/stores/useUiStore";
import { useSettingsStore } from "../src/stores/useSettingsStore";

const initialUiState = useUiStore.getState();
const initialSettingsState = useSettingsStore.getState();

/** Restores both stores to their module-load defaults - call in `beforeEach` so tests don't leak state into each other. */
export function resetStores(): void {
  useUiStore.setState(initialUiState, true);
  useSettingsStore.setState(initialSettingsState, true);
}
