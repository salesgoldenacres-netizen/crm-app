export interface User {
  id: string;
  uid?: string;
  username: string;
  role: string;
  email: string;
  group?: string;
  status?: "active" | "inactive";
  phoneNumber?: string;
  createdAt?: string;
  hideFinancials?: boolean;
  hideEmail?: boolean;
  hideLeadSource?: boolean;
  allowExport?: boolean;
  roleRestrictions?: Record<string, boolean>;
  isMigrated?: boolean;
  allowedProjects?: string[];
  organizationId?: string;
}

export interface Team {
  id: string;
  name: string;
  leadId: string;
  memberIds: string[];
  createdAt?: string;
}

export interface CustomRole {
  id: string;
  name: string;
  isManagerial: boolean;
  hideFinancials?: boolean;
  hideEmail?: boolean;
  hideLeadSource?: boolean;
  allowExport?: boolean;
  isPreset?: boolean;
}

export interface DeletedUserRecord {
  id?: string;
  username: string;
  nickname?: string;
  role?: string;
  deletedAt: string;
}

export interface AgentStatusRecord {
  userId: string;
  username: string;
  status: string;
  updatedAt: string;
  [key: string]: unknown;
}
