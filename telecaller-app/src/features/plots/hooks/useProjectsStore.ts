import { useDatabase } from "@/shared/services/DatabaseContext";
import { Project, Plot } from "@/shared/types";
import { ProjectsRepository } from "@/shared/services/firebase/repositories";

export function useProjectsStore() {
  const { projects, isProjectsLoaded: isLoaded } = useDatabase();

  const updateProject = async (projectId: string, updatedProject: Project): Promise<void> => {
    try {
      await ProjectsRepository.set(projectId, updatedProject);
    } catch (err) {
      console.error("Error updating project in Firestore: ", err);
    }
  };

  const addProject = async (projectData: Partial<Project> & { name: string; location: string }): Promise<void> => {
    try {
      const id = projectData.name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-");
      const newProject: Project = {
        id,
        name: projectData.name,
        location: projectData.location,
        image: projectData.image || "/golden_acres_layout.png",
        totalPlots: Number(projectData.totalPlots) || 0,
        plots: (projectData.plots || []) as Plot[],
      };
      await ProjectsRepository.add(newProject);
    } catch (err) {
      console.error("Error adding project to Firestore: ", err);
    }
  };

  const deleteProject = async (projectId: string): Promise<void> => {
    try {
      await ProjectsRepository.delete(projectId);
    } catch (err) {
      console.error("Error deleting project from Firestore: ", err);
    }
  };

  return { projects, isLoaded, updateProject, addProject, deleteProject };
}
