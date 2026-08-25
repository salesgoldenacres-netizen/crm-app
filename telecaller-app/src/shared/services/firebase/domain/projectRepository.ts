import { doc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { projectsRef } from "../converters";
import { Project } from "@/shared/types";

export const ProjectsRepository = {
  async add(project: Project): Promise<void> {
    await setDoc(doc(projectsRef, project.id), project);
  },
  async set(id: string, project: Project): Promise<void> {
    await setDoc(doc(projectsRef, id), project);
  },
  async update(id: string, updates: Partial<Project>): Promise<void> {
    await updateDoc(doc(projectsRef, id), updates);
  },
  async delete(id: string): Promise<void> {
    await deleteDoc(doc(projectsRef, id));
  },
};
