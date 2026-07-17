import { useState } from "react";
import { Link } from "react-router-dom";
import { Map as MapIcon, Plus, Trash2, Edit3 } from "lucide-react";
import { useProjectsStore } from "@/features/plots/hooks/useProjectsStore";
import { useAuditLogsStore } from "@/features/admin/hooks/adminStores";
import ProjectFormModal from "./ProjectFormModal";
import { Project, User } from "@/shared/types";
import DataTable, { ColumnDef } from "@/shared/components/DataTable";
import Dialog from "@/shared/components/ui/Dialog";

type FeedbackDialog =
  | { mode: "alert"; title: string; description: string }
  | {
      mode: "confirm";
      title: string;
      description: string;
      confirmLabel?: string;
      confirmVariant?: "primary" | "danger" | "success";
      onConfirm: () => void | Promise<void>;
    };

interface AdminProjectsTabProps {
  user: User;
}

export default function AdminProjectsTab({ user }: AdminProjectsTabProps) {
  const { projects, addProject, updateProject, deleteProject } =
    useProjectsStore();
  const { logAuditEvent } = useAuditLogsStore();

  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [feedback, setFeedback] = useState<FeedbackDialog | null>(null);

  const handleOpenProjectModal = (projectToEdit: Project | null = null) => {
    setEditingProject(projectToEdit || null);
    setIsProjectModalOpen(true);
  };

  const handleSaveProject = async (projectForm: any) => {
    let changes: Record<string, { before: any; after: any }> | null = null;
    const totalPlotsNum = parseInt(projectForm.totalPlots) || 0;
    if (editingProject) {
      changes = {};
      if (editingProject.name !== projectForm.name)
        changes.name = {
          before: editingProject.name || "",
          after: projectForm.name || "",
        };
      if (editingProject.location !== projectForm.location)
        changes.location = {
          before: editingProject.location || "",
          after: projectForm.location || "",
        };
      if (editingProject.totalPlots !== totalPlotsNum)
        changes.totalPlots = {
          before: editingProject.totalPlots || 0,
          after: totalPlotsNum,
        };
      if (editingProject.image !== projectForm.image)
        changes.image = {
          before: editingProject.image || "",
          after: projectForm.image || "",
        };

      await updateProject(editingProject.id, {
        ...editingProject,
        name: projectForm.name,
        location: projectForm.location,
        totalPlots: totalPlotsNum,
        image: projectForm.image,
        proximity: projectForm.proximity || [],
        competitors: projectForm.competitors || [],
      });
    } else {
      const newId = projectForm.name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-");
      if (projects[newId]) {
        setFeedback({
          mode: "alert",
          title: "Project already exists",
          description: "A project with a similar name already exists!",
        });
        return;
      }
      await addProject({
        name: projectForm.name,
        location: projectForm.location,
        totalPlots: totalPlotsNum,
        image: projectForm.image,
        plots: [],
        proximity: projectForm.proximity || [],
        competitors: projectForm.competitors || [],
      });
    }
    await logAuditEvent({
      action: editingProject ? "Modify Project" : "Create Project",
      details:
        `Project: ${projectForm.name}, Location: ${projectForm.location}` +
        (changes ? ` | Changes: ${JSON.stringify(changes)}` : ""),
      user: user.username,
      changes: changes || undefined,
    });
    setIsProjectModalOpen(false);
    setEditingProject(null);
  };

  const handleDeleteProject = async (projectId: string) => {
    setFeedback({
      mode: "confirm",
      title: "Delete project?",
      description:
        "Are you sure you want to delete this project? All mapped plots and settings for this project will be lost permanently.",
      confirmLabel: "Delete",
      confirmVariant: "danger",
      onConfirm: async () => {
        await deleteProject(projectId);
        await logAuditEvent({
          action: "Delete Project",
          details: `Project ID: ${projectId}`,
          user: user.username,
        });
        setFeedback(null);
      },
    });
  };

  const columns: ColumnDef<Project>[] = [
    {
      key: "name",
      header: "Project Name",
      sortable: true,
      render: (project) => (
        <div className="text-sm font-semibold text-theme-text">
          {project.name}
        </div>
      ),
    },
    {
      key: "location",
      header: "Location",
      sortable: true,
      render: (project) => (
        <div className="text-sm text-theme-muted">
          {project.location}
        </div>
      ),
    },
    {
      key: "plots",
      header: "Plots",
      render: (project) => (
        <div className="text-sm text-theme-muted">
          {project.plots?.length || 0} / {project.totalPlots} Mapped
        </div>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      headerClassName: "text-right",
      render: (project) => (
        <div className="flex justify-end items-center space-x-3 text-xs sm:text-sm font-medium">
          <button
            onClick={() => handleOpenProjectModal(project)}
            className="text-theme-accent hover:opacity-80 flex items-center font-medium transition-colors cursor-pointer bg-transparent border-0"
            title="Edit Project Details"
          >
            <Edit3 className="w-4 h-4 mr-1 inline" /> Edit Details
          </button>
          <Link
            to={`/admin/project/${project.id}/edit`}
            className="text-theme-success hover:opacity-80 flex items-center font-medium transition-colors"
            title="Map Editor"
          >
            <MapIcon className="w-4 h-4 mr-1 inline" /> Map Editor
          </Link>
          <button
            onClick={() => handleDeleteProject(project.id)}
            className="text-theme-danger hover:opacity-80 flex items-center font-medium transition-colors cursor-pointer bg-transparent border-0"
            title="Delete Project"
          >
            <Trash2 className="w-4 h-4 inline" /> Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="flex justify-end mb-3">
        <button
          type="button"
          onClick={() => handleOpenProjectModal()}
          className="inline-flex items-center px-2.5 h-8 bg-theme-accent hover:opacity-90 text-theme-accent-fg rounded-theme text-[11px] font-bold transition-colors cursor-pointer border-0"
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Project
        </button>
      </div>

      <DataTable
        data={Object.values(projects)}
        columns={columns}
        pageSize={10}
      />

      <ProjectFormModal
        key={editingProject ? editingProject.id : "new"}
        isOpen={isProjectModalOpen}
        onClose={() => { setIsProjectModalOpen(false); setEditingProject(null); }}
        editingProject={editingProject}
        onSave={handleSaveProject}
      />

      <Dialog
        isOpen={!!feedback}
        onClose={() => setFeedback(null)}
        title={feedback?.title ?? ""}
        description={feedback?.description}
        cancelLabel={feedback?.mode === "alert" ? "OK" : "Cancel"}
        confirmLabel={
          feedback?.mode === "confirm"
            ? feedback.confirmLabel ?? "Confirm"
            : undefined
        }
        confirmVariant={
          feedback?.mode === "confirm"
            ? feedback.confirmVariant ?? "primary"
            : undefined
        }
        onConfirm={
          feedback?.mode === "confirm" ? feedback.onConfirm : undefined
        }
      />
    </>
  );
}
