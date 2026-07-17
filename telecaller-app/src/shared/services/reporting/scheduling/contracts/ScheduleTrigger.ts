// src/shared/services/reporting/scheduling/contracts/ScheduleTrigger.ts
import { ScheduleService } from "../ScheduleService";

export interface ScheduleTrigger {
  start(service: ScheduleService): Promise<void>;
  stop(): Promise<void>;
}
