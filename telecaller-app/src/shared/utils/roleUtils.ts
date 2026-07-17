import { CustomRole } from "../types";

const DEFAULT_MANAGERIAL_ROLES = [
  "admin",
  "upper_management",
  "middle_management",
  "lower_management",
];

/**
 * Determine whether a given role code corresponds to a managerial role.
 *
 * @param roleCode - The role identifier to check (e.g. 'admin', 'telecaller').
 * @param customRoles - The live custom roles array from the store.
 */
export function isManagerial(roleCode: string, customRoles: CustomRole[] = []): boolean {
  const found = customRoles.find((r) => r.id === roleCode);
  return found
    ? found.isManagerial
    : DEFAULT_MANAGERIAL_ROLES.includes(roleCode);
}
