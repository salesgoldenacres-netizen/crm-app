import { useState } from "react";
import { Plus, Trash2, Edit3, Users, Filter, Archive, ChevronDown, ChevronUp } from "lucide-react";
import { useUsersStore, useDeletedUsersStore } from "@/features/employees/hooks/useUsersStore";
import { useTeamsStore, useAuditLogsStore } from "@/features/admin/hooks/adminStores";
import UserAccountModal from "./UserAccountModal";
import TeamConfigModal from "./TeamConfigModal";
import { User, Team, CustomRole } from "@/shared/types";
import DataTable, { ColumnDef } from "@/shared/components/DataTable";
import Badge from "@/shared/components/ui/Badge";
import Dialog from "@/shared/components/ui/Dialog";
import EmptyState from "@/shared/components/ui/EmptyState";

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

interface AdminUsersTabProps {
  user: User;
  customRoles: CustomRole[];
  isManagerial: (role: string) => boolean;
}

export default function AdminUsersTab({ user, customRoles, isManagerial }: AdminUsersTabProps) {
  const {
    users,
    addUser,
    updateUser: updateUserInStore,
    deleteUser,
  } = useUsersStore();
  const { deletedUsers } = useDeletedUsersStore();
  const { teams, addTeam, updateTeam, deleteTeam } = useTeamsStore();
  const { logAuditEvent } = useAuditLogsStore();

  // Deleted Users panel toggle
  const [showDeletedUsers, setShowDeletedUsers] = useState(false);

  // Search state for Users
  const [userSearchQuery, setUserSearchQuery] = useState("");

  // User modal state
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Team modal state: false = closed, true/team = open
  const [isTeamModalOpen, setIsTeamModalOpen] = useState<boolean | Team>(false);
  const [feedback, setFeedback] = useState<FeedbackDialog | null>(null);

  const handleOpenUserModal = (userToEdit: User | null = null) => {
    setEditingUser(userToEdit || null);
    setIsUserModalOpen(true);
  };

  const handleSaveUser = async (userForm: any) => {
    // Password is Auth-only — never audit or persist to Firestore.
    const { password: _, ...profileFields } = userForm as Record<string, unknown> & {
      password?: string;
    };
    void _;
    let changes: Record<string, { before: any; after: any }> | null = null;
    if (editingUser) {
      changes = {};
      Object.keys(profileFields).forEach((k) => {
        if ((editingUser as any)[k] !== profileFields[k]) {
          changes![k] = { before: (editingUser as any)[k] || "", after: profileFields[k] || "" };
        }
      });
      await updateUserInStore(editingUser.id, profileFields);
    } else {
      if (users.some((u) => u.username === userForm.username)) {
        setFeedback({
          mode: "alert",
          title: "Username taken",
          description: "Username already exists!",
        });
        return;
      }
      await addUser(userForm);
    }
    await logAuditEvent({
      action: editingUser ? "Modify User" : "Create User",
      details:
        `User: ${userForm.username}, Role: ${userForm.role}` +
        (changes ? ` | Changes: ${JSON.stringify(changes)}` : ""),
      user: user.username,
      changes: changes || undefined,
    });
    setIsUserModalOpen(false);
    setEditingUser(null);
  };

  const handleSaveTeam = async ({ name, leadId, memberIds }: { name: string; leadId: string; memberIds: string[] }) => {
    if (!name.trim()) {
      setFeedback({
        mode: "alert",
        title: "Team name required",
        description: "Team Name is required.",
      });
      return;
    }
    const editingTeam = typeof isTeamModalOpen === "object" && isTeamModalOpen !== null ? isTeamModalOpen : null;
    if (!editingTeam) {
      const newId = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");
      if (teams.some((t) => t.id === newId)) {
        setFeedback({
          mode: "alert",
          title: "Team already exists",
          description: "A team with a similar name already exists!",
        });
        return;
      }
      await addTeam(name, leadId, memberIds);
      await logAuditEvent({
        action: "Create Team",
        details: `Created team: ${name} led by ${users.find((u) => u.id === leadId)?.username || "No Lead"}`,
        user: user.username,
      });
    } else {
      const teamId = editingTeam.id;
      if (!teams.find((t) => t.id === teamId)) return;
      await updateTeam(teamId, { name, leadId, memberIds });
      await logAuditEvent({
        action: "Edit Team",
        details: `Updated team: ${name} led by ${users.find((u) => u.id === leadId)?.username || "No Lead"}`,
        user: user.username,
      });
    }
    setIsTeamModalOpen(false);
  };

  const handleDeleteUser = async (id: string) => {
    const userToDelete = users.find((u) => u.id === id);
    if (!userToDelete) return;
    if (isManagerial(userToDelete.role) || userToDelete.username === "admin") {
      setFeedback({
        mode: "alert",
        title: "Cannot delete user",
        description: "You cannot delete the admin user!",
      });
      return;
    }
    if (id === user.id) {
      setFeedback({
        mode: "alert",
        title: "Cannot delete user",
        description: "You cannot delete yourself!",
      });
      return;
    }
    setFeedback({
      mode: "confirm",
      title: "Delete user?",
      description: `Are you sure you want to delete user ${userToDelete.username}?`,
      confirmLabel: "Delete",
      confirmVariant: "danger",
      onConfirm: async () => {
        try {
          await deleteUser(id);
          await logAuditEvent({
            action: "Delete User",
            details: `User Name: ${userToDelete.username} (ID: ${id})`,
            user: user.username,
          });
          setFeedback(null);
        } catch (err: any) {
          setFeedback({
            mode: "alert",
            title: "Delete failed",
            description: err.message || "Failed to delete user.",
          });
        }
      },
    });
  };

  const userColumns: ColumnDef<User>[] = [
    {
      key: "username",
      header: "Username",
      sortable: true,
      render: (u) => (
        <div className="text-sm font-semibold text-theme-text">
          {u.username}
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
      sortable: true,
      render: (u) => (
        <Badge variant={isManagerial(u.role) ? "primary" : "success"}>
          {u.role?.replace(/_/g, " ")}
        </Badge>
      ),
    },
    {
      key: "permissions",
      header: "Permissions",
      render: (u) => {
        if (isManagerial(u.role)) {
          return <span className="text-xs text-theme-muted">Admin/Manager full access</span>;
        }
        return (
          <div className="flex flex-col space-y-0.5 text-xs text-theme-muted">
            <span>{u.hideFinancials ? "Price/rate hidden" : "Price/rate shown"}</span>
            <span>{u.hideEmail ? "Email hidden" : "Email shown"}</span>
            <span>{u.hideLeadSource ? "Lead source hidden" : "Lead source shown"}</span>
            <span>{u.allowExport ? "Export enabled" : "Export disabled"}</span>
          </div>
        );
      },
    },
    {
      key: "actions",
      header: "Actions",
      headerClassName: "text-right",
      render: (u) => (
        <div className="flex justify-end items-center space-x-3">
          <button
            onClick={() => handleOpenUserModal(u)}
            className="text-theme-accent hover:opacity-80 flex items-center cursor-pointer bg-transparent border-0 font-medium text-xs sm:text-sm"
            title="Edit User"
          >
            <Edit3 className="w-4 h-4 mr-1 inline" /> Edit
          </button>
          {u.id !== user.id && !isManagerial(u.role) && u.username !== "admin" && (
            <button
              onClick={() => handleDeleteUser(u.id)}
              className="text-theme-danger hover:opacity-80 flex items-center cursor-pointer bg-transparent border-0 font-medium text-xs sm:text-sm"
              title="Delete User"
            >
              <Trash2 className="w-4 h-4 inline" /> Delete
            </button>
          )}
        </div>
      ),
    },
  ];

  const deletedUserColumns: ColumnDef<any>[] = [
    {
      key: "username",
      header: "Username",
      sortable: true,
      render: (du) => <span className="font-medium text-theme-text">{du.username}</span>,
    },
    {
      key: "role",
      header: "Role",
      sortable: true,
      render: (du) => <span>{(du.role || "").replace(/_/g, " ")}</span>,
    },
    {
      key: "deletedAt",
      header: "Deleted At",
      sortable: true,
      render: (du) => (
        <span className="text-theme-muted text-xs">
          {du.deletedAt ? new Date(du.deletedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—"}
        </span>
      ),
    },
  ];

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:justify-end sm:items-center mb-3 gap-2 min-w-0">
        <div className="relative flex-grow sm:flex-grow-0 w-full sm:w-auto">
          <input
            type="text"
            placeholder="Search username or role…"
            value={userSearchQuery}
            onChange={(e) => setUserSearchQuery(e.target.value)}
            className="w-full sm:w-56 pl-8 pr-3 min-h-11 sm:min-h-0 sm:h-8 bg-theme-card border border-theme-border rounded-theme text-[11px] text-theme-text placeholder:text-theme-muted focus:outline-none focus:ring-2 focus:ring-theme-ring transition-colors"
          />
          <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-theme-muted pointer-events-none" />
        </div>
        <button
          type="button"
          onClick={() => handleOpenUserModal()}
          className="inline-flex items-center justify-center min-h-11 sm:min-h-0 sm:h-8 px-3 py-2 sm:py-0 bg-theme-accent text-theme-accent-fg rounded-theme hover:opacity-90 text-[11px] font-bold transition-colors cursor-pointer border-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring"
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Add User
        </button>
      </div>

      <DataTable
        data={users}
        columns={userColumns}
        searchQuery={userSearchQuery}
        searchFields={["username", "role"]}
        pageSize={10}
        emptyMessage="No users found matching your search."
      />

      {/* Teams & Groups Management */}
      <div className="mt-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 min-w-0">
          <h2 className="text-lg sm:text-xl font-bold text-theme-text flex items-center min-w-0">
            <Users className="w-5 h-5 mr-2 text-theme-accent shrink-0" />
            <span className="truncate">Teams & Groups Hierarchy</span>
          </h2>
          <button
            type="button"
            onClick={() => setIsTeamModalOpen(true)}
            className="inline-flex items-center justify-center min-h-11 sm:min-h-0 px-3 py-2 sm:py-1.5 bg-theme-accent hover:opacity-90 text-theme-accent-fg rounded-theme text-xs font-semibold shadow-sm transition-colors cursor-pointer border-0 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Team
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {teams.length === 0 ? (
            <div className="md:col-span-2">
              <EmptyState
                title="No teams configured yet"
                description="Create a team and assign a Team Lead."
                icon={<Users className="w-8 h-8" aria-hidden="true" />}
                className="max-w-none"
              />
            </div>
          ) : (
            teams.map((t) => {
              const leadUser = users.find((u) => u.id === t.leadId);
              return (
                <div
                  key={t.id}
                  className="bg-theme-card rounded-theme p-5 border border-theme-border shadow-elevation-sm flex flex-col justify-between space-y-4"
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="min-w-0">
                      <h3 className="type-card-title text-theme-text truncate">
                        {t.name}
                      </h3>
                      <Badge variant="primary" className="mt-1 normal-case tracking-wide">
                        Lead: {leadUser ? leadUser.username : "No Lead Assigned"}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setIsTeamModalOpen(t)}
                        className="text-xs text-theme-accent hover:opacity-80 font-semibold cursor-pointer bg-transparent border-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring rounded-theme min-h-11 sm:min-h-0 px-1"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFeedback({
                            mode: "confirm",
                            title: "Delete team?",
                            description: `Are you sure you want to delete team "${t.name}"?`,
                            confirmLabel: "Delete",
                            confirmVariant: "danger",
                            onConfirm: async () => {
                              await deleteTeam(t.id);
                              await logAuditEvent({
                                action: "Delete Team",
                                details: `Deleted team group: ${t.name}`,
                                user: user.username,
                              });
                              setFeedback(null);
                            },
                          });
                        }}
                        className="text-xs text-theme-danger hover:opacity-80 font-semibold cursor-pointer bg-transparent border-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring rounded-theme min-h-11 sm:min-h-0 px-1"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <span className="block type-label text-theme-muted">
                      Members ({t.memberIds?.length || 0})
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {t.memberIds?.map((mId) => {
                        const member = users.find((u) => u.id === mId);
                        return member ? (
                          <Badge key={mId} variant="default" className="normal-case tracking-wide font-medium">
                            {member.username}
                          </Badge>
                        ) : null;
                      })}
                      {(!t.memberIds || t.memberIds.length === 0) && (
                        <span className="text-xs text-theme-muted">
                          No members in team.
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Deleted Users Archive ─────────────────────────────── */}
      <div className="mt-8">
        <button
          onClick={() => setShowDeletedUsers((v) => !v)}
          className="flex items-center gap-2 text-sm font-semibold text-theme-muted hover:text-theme-text transition-colors cursor-pointer bg-transparent border-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring rounded-theme"
        >
          <Archive className="w-4 h-4" />
          Deleted Users Archive ({deletedUsers.length})
          {showDeletedUsers ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showDeletedUsers && (
          <div className="mt-4 animate-fadeIn">
            <DataTable
              data={deletedUsers}
              columns={deletedUserColumns}
              pageSize={5}
              emptyMessage="No deleted users on record."
            />
          </div>
        )}
      </div>

      <UserAccountModal
        key={editingUser ? editingUser.id : "new"}
        isOpen={isUserModalOpen}
        onClose={() => { setIsUserModalOpen(false); setEditingUser(null); }}
        editingUser={editingUser}
        customRoles={customRoles}
        isManagerial={isManagerial}
        onSave={handleSaveUser}
      />

      <TeamConfigModal
        key={typeof isTeamModalOpen === "object" && isTeamModalOpen !== null ? (isTeamModalOpen as Team).id : "new"}
        isOpen={!!isTeamModalOpen}
        editingTeam={typeof isTeamModalOpen === "object" && isTeamModalOpen !== null ? (isTeamModalOpen as Team) : null}
        onClose={() => setIsTeamModalOpen(false)}
        users={users}
        onSave={handleSaveTeam}
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
