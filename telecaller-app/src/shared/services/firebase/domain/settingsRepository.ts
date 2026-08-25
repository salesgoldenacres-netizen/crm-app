import { doc, setDoc, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/shared/services/firebase";
import { ListenerManager } from "../ListenerManager";
import {
  Goals,
  EventLog,
  CustomField,
  TrainingData,
  Branding,
} from "@/shared/types";
import type { Appearance } from "@/shared/types/theme";

export const SettingsRepository = {
  async setGoals(goals: Goals): Promise<void> {
    await setDoc(doc(db, "settings", "goals"), goals);
  },
  async setEvents(events: EventLog[]): Promise<void> {
    await setDoc(doc(db, "settings", "events"), { list: events });
  },
  async setCustomFields(fields: CustomField[]): Promise<void> {
    await setDoc(doc(db, "settings", "customFields"), { fields });
  },
  async setCoachingTip(text: string): Promise<void> {
    await setDoc(doc(db, "settings", "coachingTip"), { text, updatedAt: new Date().toISOString() });
  },
  async setTrainingData(data: TrainingData): Promise<void> {
    await setDoc(doc(db, "settings", "training"), {
      ...data,
      updatedAt: new Date().toISOString(),
    });
  },
  async setBranding(branding: Partial<Branding>): Promise<void> {
    await setDoc(
      doc(db, "settings", "branding"),
      {
        ...branding,
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );
  },
  async setIntegrations(integrations: Record<string, unknown>): Promise<void> {
    await setDoc(doc(db, "settings", "integrations"), integrations, { merge: true });
  },
  async setIntegrationsSecrets(secrets: Record<string, unknown>): Promise<void> {
    await setDoc(doc(db, "settings", "integrations_secrets"), secrets, { merge: true });
  },
  async setRouting(routing: Record<string, unknown>): Promise<void> {
    await setDoc(doc(db, "settings", "routing"), routing);
  },
  async setRemoteConfig(config: Record<string, unknown>): Promise<void> {
    await setDoc(doc(db, "settings", "remoteConfig"), config, { merge: true });
  },
  async getIntegrationsSecrets(): Promise<Record<string, unknown> | null> {
    const snap = await getDoc(doc(db, "settings", "integrations_secrets"));
    return snap.exists() ? (snap.data() as Record<string, unknown>) : null;
  },
  async getRouting(): Promise<Record<string, unknown> | null> {
    const snap = await getDoc(doc(db, "settings", "routing"));
    return snap.exists() ? (snap.data() as Record<string, unknown>) : null;
  },
  async getIntegrations(): Promise<Record<string, unknown> | null> {
    const snap = await getDoc(doc(db, "settings", "integrations"));
    return snap.exists() ? (snap.data() as Record<string, unknown>) : null;
  },
  subscribeGoals(callback: (goals: Goals | null) => void): () => void {
    const key = "settings_goals";
    return ListenerManager.subscribe<Goals | null>(
      key,
      (dispatch) => {
        return onSnapshot(doc(db, "settings", "goals"), (docSnap) => {
          dispatch(docSnap.exists() ? (docSnap.data() as Goals) : null);
        });
      },
      callback
    );
  },
  subscribeEvents(callback: (events: EventLog[]) => void): () => void {
    const key = "settings_events";
    return ListenerManager.subscribe<EventLog[]>(
      key,
      (dispatch) => {
        return onSnapshot(doc(db, "settings", "events"), (docSnap) => {
          dispatch(docSnap.exists() ? ((docSnap.data()?.list || []) as EventLog[]) : []);
        });
      },
      callback
    );
  },
  subscribeCoachingTip(callback: (text: string) => void): () => void {
    const key = "settings_coachingTip";
    return ListenerManager.subscribe<string>(
      key,
      (dispatch) => {
        return onSnapshot(doc(db, "settings", "coachingTip"), (docSnap) => {
          dispatch(docSnap.exists() ? docSnap.data().text || "" : "");
        });
      },
      callback
    );
  },
  subscribeCustomFields(callback: (fields: CustomField[]) => void): () => void {
    const key = "settings_customFields";
    return ListenerManager.subscribe<CustomField[]>(
      key,
      (dispatch) => {
        return onSnapshot(doc(db, "settings", "customFields"), (docSnap) => {
          dispatch(docSnap.exists() ? (docSnap.data()?.fields || []) as CustomField[] : []);
        });
      },
      callback
    );
  },
  subscribeTraining(callback: (data: TrainingData | null) => void): () => void {
    const key = "settings_training";
    return ListenerManager.subscribe<TrainingData | null>(
      key,
      (dispatch) => {
        return onSnapshot(doc(db, "settings", "training"), (docSnap) => {
          dispatch(docSnap.exists() ? (docSnap.data() as TrainingData) : null);
        });
      },
      callback
    );
  },
  subscribeRemoteConfig(callback: (data: Record<string, unknown>) => void): () => void {
    const key = "settings_remoteConfig";
    return ListenerManager.subscribe<Record<string, unknown>>(
      key,
      (dispatch) => {
        return onSnapshot(doc(db, "settings", "remoteConfig"), (docSnap) => {
          if (docSnap.exists()) dispatch(docSnap.data() as Record<string, unknown>);
        });
      },
      callback
    );
  },
  subscribeIntegrations(callback: (data: Record<string, unknown>) => void): () => void {
    const key = "settings_integrations";
    return ListenerManager.subscribe<Record<string, unknown>>(
      key,
      (dispatch) => {
        return onSnapshot(doc(db, "settings", "integrations"), (docSnap) => {
          if (docSnap.exists()) dispatch(docSnap.data() as Record<string, unknown>);
        });
      },
      callback
    );
  },
  subscribeBranding(
    callback: (branding: Branding) => void,
    mapDoc: (data: Record<string, unknown>) => Branding,
    onMissing: () => Branding
  ): () => void {
    const key = "settings_branding";
    return ListenerManager.subscribe<Branding>(
      key,
      (dispatch) => {
        return onSnapshot(
          doc(db, "settings", "branding"),
          (docSnap) => {
            if (docSnap.exists()) {
              dispatch(mapDoc(docSnap.data() as Record<string, unknown>));
            } else {
              dispatch(onMissing());
            }
          },
          (err) => {
            console.warn("Branding snapshot unavailable", err);
          }
        );
      },
      callback
    );
  }
};

export const ThemesRepository = {
  async get(userId: string): Promise<{ appearance: Appearance } | null> {
    const snap = await getDoc(doc(db, "themes", userId));
    if (!snap.exists()) return null;
    return snap.data() as { appearance: Appearance };
  },
  async set(userId: string, appearance: string): Promise<void> {
    await setDoc(doc(db, "themes", userId), { appearance }, { merge: true });
  },
  subscribe(userId: string, callback: (data: { appearance: Appearance } | null) => void): () => void {
    const key = `themes_user_${userId}`;
    return ListenerManager.subscribe<{ appearance: Appearance } | null>(
      key,
      (dispatch) => {
        return onSnapshot(doc(db, "themes", userId), (docSnap) => {
          if (docSnap.exists()) {
            dispatch(docSnap.data() as { appearance: Appearance });
          } else {
            dispatch(null);
          }
        });
      },
      callback
    );
  }
};

export const DashboardPreferencesRepository = {
  subscribe(userId: string, callback: (data: Record<string, unknown> | null) => void): () => void {
    const key = `dashboardPreferences_user_${userId}`;
    return ListenerManager.subscribe<Record<string, unknown> | null>(
      key,
      (dispatch) => {
        return onSnapshot(doc(db, "dashboardPreferences", userId), (docSnap) => {
          if (docSnap.exists()) {
            dispatch(docSnap.data() as Record<string, unknown>);
          } else {
            dispatch(null);
          }
        });
      },
      callback
    );
  },
  async set(userId: string, data: Record<string, unknown>): Promise<void> {
    await setDoc(doc(db, "dashboardPreferences", userId), data, { merge: true });
  },
  async reset(userId: string, defaultData: Record<string, unknown>): Promise<void> {
    await setDoc(doc(db, "dashboardPreferences", userId), defaultData);
  }
};
