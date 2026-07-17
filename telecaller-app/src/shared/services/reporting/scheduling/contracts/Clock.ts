// src/shared/services/reporting/scheduling/contracts/Clock.ts
export interface Clock {
  now(): Date;
}

export class SystemClock implements Clock {
  public now(): Date {
    return new Date();
  }
}
