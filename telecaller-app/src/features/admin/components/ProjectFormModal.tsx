import React, { useState } from "react";
import { Upload } from "lucide-react";
import { Project, ProximityItem, CompetitorItem } from "@/shared/types";
import { logger } from "@/shared/utils/logger";
import { uploadFile } from "@/shared/utils/uploadFile";
import Input from "@/shared/components/ui/Input";
import Select from "@/shared/components/ui/Select";
import Button from "@/shared/components/ui/Button";
import Modal from "@/shared/components/ui/Modal";
import FormActions from "@/shared/components/ui/FormActions";
import { FIELD_CONTROL_CLASS } from "@/shared/components/ui/formField";

interface ProjectFormState {
  name: string;
  location: string;
  totalPlots: string;
  image: string;
  proximity: ProximityItem[];
  competitors: CompetitorItem[];
}

const DEFAULT_FORM: ProjectFormState = {
  name: "",
  location: "",
  totalPlots: "",
  image: "/golden_acres_layout.png",
  proximity: [],
  competitors: [],
};

interface ProjectFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingProject: Project | null;
  onSave: (formData: ProjectFormState) => void | Promise<void>;
}

const PROJECT_FORM_ID = "project-form-modal-form";
const SECTION_TITLE =
  "type-label font-semibold text-theme-accent uppercase tracking-widest border-b border-theme-border pb-1.5";

export default function ProjectFormModal({
  isOpen,
  onClose,
  editingProject,
  onSave,
}: ProjectFormModalProps) {
  const [projectForm, setProjectForm] = useState<ProjectFormState>(() =>
    editingProject
      ? {
          name: editingProject.name,
          location: editingProject.location,
          totalPlots: editingProject.totalPlots.toString(),
          image: editingProject.image || "",
          proximity: editingProject.proximity || [],
          competitors: editingProject.competitors || [],
        }
      : { ...DEFAULT_FORM }
  );
  const [uploadingImage, setUploadingImage] = useState(false);
  const [tempProximity, setTempProximity] = useState<ProximityItem>({
    category: "schools",
    name: "",
    distance: "",
  });
  const [tempCompetitor, setTempCompetitor] = useState<CompetitorItem>({
    name: "",
    advantage: "",
    pitch: "",
  });

  const handleAddProximity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempProximity.name.trim() || !tempProximity.distance.trim()) return;
    setProjectForm((prev) => ({
      ...prev,
      proximity: [...(prev.proximity || []), { ...tempProximity }],
    }));
    setTempProximity({ category: "schools", name: "", distance: "" });
  };

  const handleRemoveProximity = (idxToRemove: number) => {
    setProjectForm((prev) => ({
      ...prev,
      proximity: (prev.proximity || []).filter((_, idx) => idx !== idxToRemove),
    }));
  };

  const handleAddCompetitor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempCompetitor.name.trim()) return;
    setProjectForm((prev) => ({
      ...prev,
      competitors: [...(prev.competitors || []), { ...tempCompetitor }],
    }));
    setTempCompetitor({ name: "", advantage: "", pitch: "" });
  };

  const handleRemoveCompetitor = (idxToRemove: number) => {
    setProjectForm((prev) => ({
      ...prev,
      competitors: (prev.competitors || []).filter(
        (_, idx) => idx !== idxToRemove
      ),
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const downloadUrl = await uploadFile("layouts", file);
      setProjectForm((prev) => ({ ...prev, image: downloadUrl }));
    } catch (err: any) {
      logger.error("ProjectFormModal", "Image upload failed:", err);
      alert("Failed to upload image: " + err.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(projectForm);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingProject ? "Edit Project Details" : "Add New Project"}
      size="xl"
      className="max-w-2xl"
      footer={
        <FormActions>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form={PROJECT_FORM_ID} variant="primary">
            Save Project
          </Button>
        </FormActions>
      }
    >
      <form id={PROJECT_FORM_ID} onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className={SECTION_TITLE}>General Info</h4>
            <Input
              label="Project Name"
              type="text"
              required
              value={projectForm.name}
              onChange={(e) =>
                setProjectForm({ ...projectForm, name: e.target.value })
              }
              placeholder="e.g. Golden Acres Melakondaiyure"
            />
            <Input
              label="Location"
              type="text"
              required
              value={projectForm.location}
              onChange={(e) =>
                setProjectForm({ ...projectForm, location: e.target.value })
              }
              placeholder="e.g. Melakondaiyure"
            />
            <Input
              label="Total Plot Count"
              type="number"
              required
              value={projectForm.totalPlots}
              onChange={(e) =>
                setProjectForm({
                  ...projectForm,
                  totalPlots: e.target.value,
                })
              }
              placeholder="e.g. 120"
            />
            <div className="flex gap-2 items-end">
              <Input
                label="Layout Image URL / Path"
                type="text"
                required
                value={projectForm.image}
                onChange={(e) =>
                  setProjectForm({ ...projectForm, image: e.target.value })
                }
                placeholder="e.g. /golden_acres_layout.png"
                wrapperClassName="flex-1"
              />
              <div className="relative pb-0.5">
                <input
                  type="file"
                  accept="image/*"
                  id="layout-file-upload"
                  className="hidden"
                  onChange={handleImageUpload}
                />
                <label
                  htmlFor="layout-file-upload"
                  className="inline-flex items-center px-3 py-2 border border-theme-border rounded-theme text-xs font-semibold text-theme-text bg-theme-card hover:bg-theme-surface cursor-pointer h-[38px] focus-within:ring-2 focus-within:ring-theme-ring"
                >
                  <Upload className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
                  {uploadingImage ? "…" : "Upload"}
                </label>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              <h4 className={SECTION_TITLE}>Proximity Insights</h4>
              <div className="grid grid-cols-3 gap-2 bg-theme-surface p-2.5 rounded-theme border border-theme-border">
                <Select
                  aria-label="Proximity category"
                  value={tempProximity.category}
                  onChange={(e) =>
                    setTempProximity({
                      ...tempProximity,
                      category: e.target.value,
                    })
                  }
                  className="text-[10px] py-1"
                  options={[
                    { value: "schools", label: "Schools" },
                    { value: "hospitals", label: "Hospitals" },
                    { value: "transit", label: "Transit" },
                    { value: "tech_parks", label: "Tech Parks" },
                  ]}
                />
                <input
                  type="text"
                  aria-label="Proximity name"
                  placeholder="Name (e.g. DPS)"
                  value={tempProximity.name}
                  onChange={(e) =>
                    setTempProximity({ ...tempProximity, name: e.target.value })
                  }
                  className={`${FIELD_CONTROL_CLASS} text-[10px] py-1`}
                />
                <div className="flex gap-1.5 items-center">
                  <input
                    type="text"
                    aria-label="Proximity distance"
                    placeholder="2.5 km"
                    value={tempProximity.distance}
                    onChange={(e) =>
                      setTempProximity({
                        ...tempProximity,
                        distance: e.target.value,
                      })
                    }
                    className={`${FIELD_CONTROL_CLASS} text-[10px] py-1`}
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddProximity}
                    className="px-2 py-1 text-[10px]"
                    aria-label="Add proximity"
                  >
                    +
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                {(projectForm.proximity || []).map((item, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center px-2 py-0.5 rounded-theme text-[10px] font-semibold bg-theme-accent-muted text-theme-accent border border-theme-accent/25"
                  >
                    <span className="capitalize text-theme-muted mr-1">
                      {item.category}:
                    </span>{" "}
                    {item.name} ({item.distance})
                    <button
                      type="button"
                      onClick={() => handleRemoveProximity(idx)}
                      className="ml-1 text-theme-muted hover:text-theme-accent font-semibold bg-transparent border-0 cursor-pointer"
                      aria-label="Remove proximity"
                    >
                      ×
                    </button>
                  </span>
                ))}
                {(projectForm.proximity || []).length === 0 && (
                  <p className="text-[10px] text-theme-muted italic">
                    No custom proximity points added (will use global
                    defaults).
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <h4 className={SECTION_TITLE}>Competitor Advantage Matrix</h4>
              <div className="space-y-2 bg-theme-surface p-2.5 rounded-theme border border-theme-border">
                <input
                  type="text"
                  aria-label="Competitor name"
                  placeholder="Competitor Name (e.g. Silver Sands)"
                  value={tempCompetitor.name}
                  onChange={(e) =>
                    setTempCompetitor({
                      ...tempCompetitor,
                      name: e.target.value,
                    })
                  }
                  className={`${FIELD_CONTROL_CLASS} text-[10px] py-1`}
                />
                <input
                  type="text"
                  aria-label="Our advantage"
                  placeholder="Our Advantage (e.g. 40ft roads)"
                  value={tempCompetitor.advantage}
                  onChange={(e) =>
                    setTempCompetitor({
                      ...tempCompetitor,
                      advantage: e.target.value,
                    })
                  }
                  className={`${FIELD_CONTROL_CLASS} text-[10px] py-1`}
                />
                <div className="flex gap-1.5 items-center">
                  <input
                    type="text"
                    aria-label="Competitor pitch"
                    placeholder="Their Pitch (e.g. Slightly cheaper but hidden fees)"
                    value={tempCompetitor.pitch}
                    onChange={(e) =>
                      setTempCompetitor({
                        ...tempCompetitor,
                        pitch: e.target.value,
                      })
                    }
                    className={`${FIELD_CONTROL_CLASS} text-[10px] py-1`}
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddCompetitor}
                    className="px-2 py-1 text-[10px]"
                    aria-label="Add competitor"
                  >
                    +
                  </Button>
                </div>
              </div>
              <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                {(projectForm.competitors || []).map((item, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-start bg-theme-surface p-2 rounded-theme border border-theme-border text-[10px]"
                  >
                    <div className="space-y-0.5">
                      <span className="font-semibold text-theme-text">
                        {item.name}
                      </span>
                      <p className="text-theme-muted">
                        <strong className="text-theme-accent">Us:</strong>{" "}
                        {item.advantage}
                      </p>
                      <p className="text-theme-muted">
                        <strong className="text-theme-danger">Them:</strong>{" "}
                        {item.pitch}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveCompetitor(idx)}
                      className="text-theme-danger hover:opacity-80 font-semibold ml-2 bg-transparent border-0 cursor-pointer"
                      aria-label="Remove competitor"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {(projectForm.competitors || []).length === 0 && (
                  <p className="text-[10px] text-theme-muted italic">
                    No custom competitors added (will use global defaults).
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
}
