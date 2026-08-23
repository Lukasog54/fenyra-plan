import type { SchoolDataSource, DataSourceConfig } from "../models/SchoolDataSource";
import { BackendAdapter } from "./backend/adapter";

export function resolveAdapter(config: DataSourceConfig): SchoolDataSource {
  return new BackendAdapter(config);
}
