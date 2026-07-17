import { useState, useEffect } from "react";
import { onSnapshot } from "firebase/firestore";
import { CustomRole } from "@/shared/types";
import { customRolesRef } from "@/shared/services/firebase/converters";
import { CustomRolesRepository } from "@/shared/services/firebase/repositories";

const PRESET_ROLES: CustomRole[] = [
  { id: "admin", name: "Admin", isManagerial: true, isPreset: true },
  {
    id: "upper_management",
    name: "Upper Management",
    isManagerial: true,
    isPreset: true,
  },
  {
    id: "middle_management",
    name: "Middle Management",
    isManagerial: true,
    isPreset: true,
  },
  {
    id: "lower_management",
    name: "Lower Management",
    isManagerial: true,
    isPreset: true,
  },
  {
    id: "telecaller",
    name: "Telecaller",
    isManagerial: false,
    hideFinancials: true,
    hideEmail: false,
    hideLeadSource: false,
    allowExport: true,
    isPreset: true,
  },
  {
    id: "field_sales_manager",
    name: "Field Sales Manager",
    isManagerial: false,
    hideFinancials: false,
    hideEmail: false,
    hideLeadSource: false,
    allowExport: true,
    isPreset: true,
  },
  {
    id: "accounts",
    name: "Accounts",
    isManagerial: false,
    hideFinancials: false,
    hideEmail: false,
    hideLeadSource: false,
    allowExport: true,
    isPreset: true,
  },
  {
    id: "marketing",
    name: "Marketing",
    isManagerial: false,
    hideFinancials: false,
    hideEmail: false,
    hideLeadSource: false,
    allowExport: true,
    isPreset: true,
  },
  {
    id: "after_sales",
    name: "After Sales",
    isManagerial: false,
    hideFinancials: false,
    hideEmail: false,
    hideLeadSource: false,
    allowExport: true,
    isPreset: true,
  },
  {
    id: "legal",
    name: "Legal",
    isManagerial: false,
    hideFinancials: false,
    hideEmail: false,
    hideLeadSource: false,
    allowExport: true,
    isPreset: true,
  },
];

export function useCustomRolesStore() {
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(customRolesRef, (snapshot) => {
      if (snapshot.empty) {
        // In-memory presets only — never auto-write roles into production Firestore.
        setRoles(PRESET_ROLES);
        setIsLoaded(true);
        return;
      }
      const list: CustomRole[] = [];
      snapshot.forEach((d) => list.push(d.data()));
      setRoles(list);
      setIsLoaded(true);
    });
    return () => unsubscribe();
  }, []);

  const addCustomRole = async (roleData: {
    code: string;
    name: string;
    isManagerial?: boolean;
    hideFinancials?: boolean;
    hideEmail?: boolean;
    hideLeadSource?: boolean;
    allowExport?: boolean;
  }) => {
    const id = roleData.code
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9_]+/g, "_");
    if (!id) throw new Error("Invalid role code.");
    if (roles.some((r) => r.id === id))
      throw new Error(`Role code "${id}" already exists.`);

    await CustomRolesRepository.add({
      id,
      name: roleData.name,
      isManagerial: !!roleData.isManagerial,
      hideFinancials: roleData.isManagerial ? false : !!roleData.hideFinancials,
      hideEmail: roleData.isManagerial ? false : !!roleData.hideEmail,
      hideLeadSource: roleData.isManagerial ? false : !!roleData.hideLeadSource,
      allowExport: roleData.isManagerial
        ? true
        : roleData.allowExport !== undefined
          ? !!roleData.allowExport
          : true,
      isPreset: false,
    });
  };

  const updateCustomRole = async (
    id: string,
    updatedFields: Partial<CustomRole>
  ) => {
    const updates = { ...updatedFields };
    if (id === "admin") updates.isManagerial = true; // force true for admin
    await CustomRolesRepository.update(id, updates);
  };

  const deleteCustomRole = async (id: string) => {
    const roleToDelete = roles.find((r) => r.id === id);
    if (!roleToDelete) throw new Error("Role not found.");
    if (roleToDelete.isPreset)
      throw new Error("Cannot delete preset system roles!");
    await CustomRolesRepository.delete(id);
  };

  return { roles, isLoaded, addCustomRole, updateCustomRole, deleteCustomRole };
}
