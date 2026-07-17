import { FormEvent } from "react";
import EmptyState from "@/shared/components/ui/EmptyState";

interface Task {
  id: string;
  done: boolean;
  text: string;
}

interface TasksWidgetProps {
  backendTasks: Task[];
  addTask: (text: string) => void | Promise<void>;
  toggleTask: (id: string, done: boolean) => void | Promise<void>;
  deleteTask: (id: string) => void | Promise<void>;
  clearCompletedTasks: () => void | Promise<void>;
}

export default function TasksWidget({
  backendTasks,
  addTask,
  toggleTask,
  deleteTask,
  clearCompletedTasks,
}: TasksWidgetProps) {
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const input = form.elements.namedItem("taskText") as HTMLInputElement;
    const text = input.value.trim();
    if (!text) return;
    addTask(text);
    form.reset();
  };

  return (
    <div className="flex h-full w-full flex-col justify-between gap-widget">
      <form onSubmit={handleSubmit} className="flex shrink-0 gap-1.5">
        <input
          type="text"
          name="taskText"
          placeholder="Add a task…"
          className="flex-1 rounded-theme border border-theme-border bg-theme-card px-2 py-1.5 text-[11px] text-theme-text outline-none focus:ring-1 focus:ring-theme-ring"
        />
        <button
          type="submit"
          className="cursor-pointer rounded-theme bg-theme-accent px-2.5 py-1.5 text-[11px] font-bold text-theme-accent-fg hover:opacity-90"
        >
          Add
        </button>
      </form>

      <div className="max-h-[140px] flex-1 space-y-1.5 overflow-y-auto pr-0.5">
        {backendTasks.map((task) => (
          <div
            key={task.id}
            className="flex items-center justify-between border-b border-theme-border py-1 text-[11px] last:border-0"
          >
            <label className="flex min-w-0 flex-1 cursor-pointer items-center space-x-2 pr-2">
              <input
                type="checkbox"
                checked={task.done}
                onChange={() => {
                  toggleTask(task.id, !task.done);
                }}
                className="h-3.5 w-3.5 cursor-pointer rounded-theme border-theme-border text-theme-accent focus:ring-theme-ring"
              />
              <span
                className={`select-none truncate ${
                  task.done
                    ? "text-theme-muted line-through"
                    : "font-medium text-theme-text"
                }`}
              >
                {task.text}
              </span>
            </label>
            <button
              type="button"
              onClick={() => {
                deleteTask(task.id);
              }}
              className="cursor-pointer border-0 bg-transparent text-[9px] font-semibold text-theme-danger hover:underline"
            >
              Delete
            </button>
          </div>
        ))}
        {backendTasks.length === 0 && (
          <EmptyState
            variant="compact"
            preset="tasks"
            hideIcon
            className="border-0 bg-transparent py-4"
          />
        )}
      </div>

      {backendTasks.some((t) => t.done) && (
        <button
          type="button"
          onClick={() => {
            clearCompletedTasks();
          }}
          className="mt-1 w-full shrink-0 cursor-pointer border-x-0 border-b-0 border-t border-theme-border bg-transparent py-0.5 text-center text-[9px] font-bold text-theme-accent hover:underline"
        >
          Clear Completed Tasks
        </button>
      )}
    </div>
  );
}
