import { useState, useEffect } from "react";
import { onSnapshot } from "firebase/firestore";
import { createSecondaryUser } from "@/shared/services/auth";
import { useDatabase } from "@/shared/services/DatabaseContext";
import { User, DeletedUserRecord } from "@/shared/types";
import { UsersRepository } from "@/shared/services/firebase/repositories";
import { deletedUsersRef } from "@/shared/services/firebase/converters";
import { useCustomRolesStore } from "@/features/admin/hooks/useCustomRolesStore";

export function useUsersStore() {
  const { users, isUsersLoaded: isLoaded, leads } = useDatabase();
  const { roles } = useCustomRolesStore();

  const addUser = async (user: Omit<User, "id"> & { password?: string }): Promise<void> => {
    const newId = Date.now().toString();
    const email =
      user.email ||
      (user.username.includes("@")
        ? user.username
        : `${user.username.toLowerCase()}@goldenacres.app`);

    const authPassword = user.password;
    if (!authPassword) {
      throw new Error("Password is required to create a Firebase Auth account.");
    }

    let authUid = "";
    try {
      const authUser = await createSecondaryUser(email, authPassword);
      authUid = authUser.uid;
    } catch (authErr) {
      console.error("Failed to create user in Firebase Auth:", authErr);
      throw authErr;
    }

    // Never persist password to Firestore — Auth holds credentials.
    const { password: _authOnly, ...profile } = user;
    const newUser: User = {
      ...profile,
      id: newId,
      email,
      uid: authUid,
      isMigrated: true,
      createdAt: new Date().toISOString(),
    };

    await UsersRepository.add(newUser);
    await UsersRepository.addAuthRole(authUid, user.role || "telecaller");
  };

  const updateUser = async (
    id: string,
    updatedFields: Partial<User> & { password?: string },
  ): Promise<void> => {
    const { password: _authOnly, ...safeFields } = updatedFields;
    await UsersRepository.update(id, safeFields);
    if (updatedFields.role) {
      const existingUser = users.find((u: User) => u.id === id);
      if (existingUser && existingUser.uid) {
        await UsersRepository.updateUserRole(existingUser.uid, updatedFields.role);
      }
    }
  };

  const deleteUser = async (id: string): Promise<void> => {
    const userToDelete = users.find((u: User) => u.id === id);
    if (!userToDelete) throw new Error("User not found.");

    const roleObj = roles.find((r) => r.id === (userToDelete.role || ""));
    const isManagerialRole = roleObj
      ? roleObj.isManagerial
      : [
          "admin",
          "upper_management",
          "middle_management",
          "lower_management",
        ].includes(userToDelete.role);

    if (isManagerialRole || userToDelete.username === "admin") {
      throw new Error("Cannot delete admin or managerial user!");
    }

    const { username, uid } = userToDelete;

    // Strip any legacy password field before archiving to deletedUsers
    const { password: _legacy, ...safeUser } = userToDelete as User & {
      password?: string;
    };
    const deletedRecord: DeletedUserRecord = {
      ...safeUser,
      nickname: username,
      deletedAt: new Date().toISOString(),
    };

    const leadIdsToUnassign = leads
      .filter((l) => l.assignedTo === id)
      .map((l) => l.id);

    await UsersRepository.deleteUserTransaction(id, uid, deletedRecord, leadIdsToUnassign);
  };

  return { users, isLoaded, addUser, updateUser, deleteUser };
}

export function useDeletedUsersStore() {
  const [deletedUsers, setDeletedUsers] = useState<DeletedUserRecord[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      deletedUsersRef,
      (snapshot) => {
        const list: DeletedUserRecord[] = [];
        snapshot.forEach((d) => list.push(d.data()));
        list.sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());
        setDeletedUsers(list);
        setIsLoaded(true);
      },
      (err) => console.error("Error fetching deletedUsers:", err)
    );
    return () => unsubscribe();
  }, []);

  return { deletedUsers, isLoaded };
}
