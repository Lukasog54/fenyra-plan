import type { SchoolDataSource, DataSourceConfig } from "../models/SchoolDataSource";
import { Stundenplan24Adapter } from "./stundenplan24/adapter";

export function resolveAdapter(config: DataSourceConfig): SchoolDataSource {
  return new Stundenplan24Adapter(config);
}
