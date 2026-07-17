export interface LeaveRequest {
  id: string;
  userId: string;
  username: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  createdAt?: string;
  leaveType?: string;
}

export interface BreakSession {
  start: string;
  end: string | null;
  type?: string;
  agent?: string;
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  username: string;
  date: string;
  checkIn: string;
  checkOut?: string | null;
  breaks?: BreakSession[];
  totalWorkHours?: number;
  status: string;
  lateMinutes?: number;
  deviceInfo?: string;
  updatedAt?: string;
}
