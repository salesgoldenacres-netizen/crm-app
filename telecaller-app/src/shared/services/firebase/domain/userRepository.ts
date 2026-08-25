import {
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  getDocs,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/shared/services/firebase";
import { ListenerManager } from "../ListenerManager";
import {
  usersRef,
  customRolesRef,
  teamsRef,
  rostersRef,
  deletedUsersRef,
  leadsRef,
} from "../converters";
import {
  User,
  CustomRole,
  Team,
  Roster,
  DeletedUserRecord,
} from "@/shared/types";

function stripPasswordField<T extends Record<string, unknown>>(data: T): T {
  if (!("password" in data)) return data;
  const rest = { ...data };
  delete rest.password;
  return rest as T;
}

export const UsersRepository = {
  async add(user: User): Promise<void> {
    await setDoc(doc(usersRef, user.id), stripPasswordField(user as User & Record<string, unknown>) as User);
  },
  async update(id: string, updates: Partial<User>): Promise<void> {
    await updateDoc(
      doc(usersRef, id),
      stripPasswordField(updates as Partial<User> & Record<string, unknown>) as Partial<User>,
    );
  },
  async delete(id: string): Promise<void> {
    await deleteDoc(doc(usersRef, id));
  },
  async deleteUserTransaction(
    id: string,
    uid: string | undefined,
    deletedRecord: DeletedUserRecord,
    leadIdsToUnassign: string[]
  ): Promise<void> {
    await setDoc(
      doc(deletedUsersRef, deletedRecord.username),
      stripPasswordField(deletedRecord as DeletedUserRecord & Record<string, unknown>) as DeletedUserRecord,
    );
    const batch = writeBatch(db);
    for (const leadId of leadIdsToUnassign) {
      batch.update(doc(leadsRef, leadId), {
        assignedTo: "",
        assignedToName: "Unassigned",
        assignedToUid: "",
        updatedAt: new Date().toISOString(),
      });
    }
    batch.delete(doc(usersRef, id));
    if (uid) {
      batch.delete(doc(db, "userRoles", uid));
    }
    await batch.commit();
  },
  async updateUserRole(uid: string, role: string): Promise<void> {
    await setDoc(doc(db, "userRoles", uid), { role }, { merge: true });
  },
  async addAuthRole(uid: string, role: string): Promise<void> {
    await setDoc(doc(db, "userRoles", uid), { role });
  },
  subscribeByUid(uid: string, callback: (user: User | null) => void, onError?: (err: Error) => void): () => void {
    const key = `users_uid_${uid}`;
    return ListenerManager.subscribe<User | null>(
      key,
      (dispatch) => {
        const qUid = query(usersRef, where("uid", "==", uid));
        return onSnapshot(
          qUid,
          (snapshot) => {
            if (!snapshot.empty) {
              const docSnap = snapshot.docs[0];
              dispatch({ ...docSnap.data(), id: docSnap.id } as User);
            } else {
              dispatch(null);
            }
          },
          onError
        );
      },
      callback
    );
  },
  async getByEmail(email: string): Promise<User | null> {
    const qEmail = query(usersRef, where("email", "==", email.toLowerCase()));
    const snap = await getDocs(qEmail);
    if (snap.empty) return null;
    const docSnap = snap.docs[0];
    return { ...docSnap.data(), id: docSnap.id } as User;
  },
  async getByUsername(username: string): Promise<User | null> {
    const qUsername = query(usersRef, where("username", "==", username.toLowerCase()));
    const snap = await getDocs(qUsername);
    if (snap.empty) return null;
    const docSnap = snap.docs[0];
    return { ...docSnap.data(), id: docSnap.id } as User;
  },
  subscribeDeletedUsers(callback: (list: DeletedUserRecord[]) => void, onError?: (err: Error) => void): () => void {
    const key = "users_deleted";
    return ListenerManager.subscribe<DeletedUserRecord[]>(
      key,
      (dispatch) => {
        return onSnapshot(
          deletedUsersRef,
          (snapshot) => {
            const list: DeletedUserRecord[] = [];
            snapshot.forEach((d) => list.push(d.data()));
            list.sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());
            dispatch(list);
          },
          onError
        );
      },
      callback
    );
  },
};

export const CustomRolesRepository = {
  async add(role: CustomRole): Promise<void> {
    await setDoc(doc(customRolesRef, role.id), role);
  },
  async update(id: string, updates: Partial<CustomRole>): Promise<void> {
    await updateDoc(doc(customRolesRef, id), updates);
  },
  async delete(id: string): Promise<void> {
    await deleteDoc(doc(customRolesRef, id));
  },
  subscribe(callback: (roles: CustomRole[]) => void, presets: CustomRole[]): () => void {
    const key = "customRoles";
    return ListenerManager.subscribe<CustomRole[]>(
      key,
      (dispatch) => {
        return onSnapshot(customRolesRef, (snapshot) => {
          if (snapshot.empty) {
            dispatch(presets);
            return;
          }
          const list: CustomRole[] = [];
          snapshot.forEach((d) => list.push(d.data()));
          dispatch(list);
        });
      },
      callback
    );
  }
};

export const TeamsRepository = {
  async add(team: Team): Promise<void> {
    await setDoc(doc(teamsRef, team.id), team);
  },
  async update(id: string, updates: Partial<Team>): Promise<void> {
    await updateDoc(doc(teamsRef, id), updates);
  },
  async delete(id: string): Promise<void> {
    await deleteDoc(doc(teamsRef, id));
  },
  subscribe(callback: (teams: Team[]) => void): () => void {
    const key = "teams";
    return ListenerManager.subscribe<Team[]>(
      key,
      (dispatch) => {
        return onSnapshot(teamsRef, (snapshot) => {
          const list: Team[] = [];
          snapshot.forEach((d) => list.push(d.data()));
          dispatch(list);
        });
      },
      callback
    );
  }
};

export const RostersRepository = {
  async set(weekId: string, roster: Roster): Promise<void> {
    await setDoc(doc(rostersRef, weekId), roster);
  },
  subscribe(callback: (rosters: Record<string, Roster>) => void): () => void {
    const key = "rosters";
    return ListenerManager.subscribe<Record<string, Roster>>(
      key,
      (dispatch) => {
        return onSnapshot(rostersRef, (snapshot) => {
          const rost: Record<string, Roster> = {};
          snapshot.forEach((d) => {
            rost[d.id] = d.data();
          });
          dispatch(rost);
        });
      },
      callback
    );
  }
};
