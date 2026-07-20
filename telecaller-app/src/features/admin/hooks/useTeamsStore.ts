import { useState, useEffect } from "react";
import { Team } from "@/shared/types";
import { TeamsRepository } from "@/shared/services/firebase/repositories";

export function useTeamsStore() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const unsubscribe = TeamsRepository.subscribe((list) => {
      setTeams(list);
      setIsLoaded(true);
    });
    return () => unsubscribe();
  }, []);

  const addTeam = async (
    name: string,
    leadId: string,
    memberIds: string[] = []
  ) => {
    const id = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-");
    await TeamsRepository.add({
      id,
      name,
      leadId,
      memberIds,
      createdAt: new Date().toISOString(),
    });
  };

  const updateTeam = async (id: string, updatedFields: Partial<Team>) => {
    await TeamsRepository.update(id, updatedFields);
  };

  const deleteTeam = async (id: string) => {
    await TeamsRepository.delete(id);
  };

  return { teams, isLoaded, addTeam, updateTeam, deleteTeam };
}
