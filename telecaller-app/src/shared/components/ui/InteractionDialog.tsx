import { useId, useState } from "react";
import Dialog from "./Dialog";
import Input from "./Input";

export type InteractionDialogState =
  | {
      mode: "alert";
      title: string;
      description: string;
    }
  | {
      mode: "confirm";
      title: string;
      description: string;
      confirmLabel?: string;
      confirmVariant?: "primary" | "danger" | "success";
      onConfirm: () => void | Promise<void>;
      onCancel?: () => void;
    }
  | {
      mode: "prompt";
      title: string;
      description?: string;
      defaultValue?: string;
      inputLabel?: string;
      confirmLabel?: string;
      confirmVariant?: "primary" | "danger" | "success";
      onConfirm: (value: string) => void | Promise<void>;
      onCancel?: () => void;
    };

interface InteractionDialogProps {
  state: InteractionDialogState | null;
  onClose: () => void;
}

/**
 * Shared host for alert / confirm / prompt overlays (Wave 10 Agent 4).
 * Composes Dialog + Input — do not invent a parallel dialog system.
 *
 * Remount via `key` when a new request opens so prompt defaults reset
 * without setState-in-effect.
 */
export default function InteractionDialog({
  state,
  onClose,
}: InteractionDialogProps) {
  const requestKey = state
    ? `${state.mode}:${state.title}:${state.mode === "prompt" ? state.defaultValue ?? "" : ""}`
    : "closed";

  return (
    <InteractionDialogInner
      key={requestKey}
      state={state}
      onClose={onClose}
    />
  );
}

function InteractionDialogInner({
  state,
  onClose,
}: InteractionDialogProps) {
  const inputId = useId();
  const [promptValue, setPromptValue] = useState(
    state?.mode === "prompt" ? (state.defaultValue ?? "") : ""
  );
  const [isLoading, setIsLoading] = useState(false);

  const handleClose = () => {
    if (isLoading) return;
    if (state && (state.mode === "confirm" || state.mode === "prompt")) {
      state.onCancel?.();
    }
    onClose();
  };

  const handleConfirm = async () => {
    if (!state || state.mode === "alert") return;
    setIsLoading(true);
    try {
      if (state.mode === "prompt") {
        const trimmed = promptValue.trim();
        if (!trimmed) return; // keep open until a value is provided
        await state.onConfirm(trimmed);
      } else {
        await state.onConfirm();
      }
      onClose();
    } catch {
      // Caller surfaces errors via toast; keep dialog open for retry.
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog
      isOpen={!!state}
      onClose={handleClose}
      title={state?.title ?? ""}
      description={
        state?.mode === "prompt" ? state.description : state?.description
      }
      cancelLabel={state?.mode === "alert" ? "OK" : "Cancel"}
      confirmLabel={
        state?.mode === "confirm" || state?.mode === "prompt"
          ? state.confirmLabel ?? "Confirm"
          : undefined
      }
      confirmVariant={
        state?.mode === "confirm" || state?.mode === "prompt"
          ? state.confirmVariant ?? "primary"
          : undefined
      }
      onConfirm={
        state?.mode === "confirm" || state?.mode === "prompt"
          ? handleConfirm
          : undefined
      }
      isLoading={isLoading}
    >
      {state?.mode === "prompt" && (
        <Input
          id={inputId}
          label={state.inputLabel ?? "Value"}
          value={promptValue}
          onChange={(e) => setPromptValue(e.target.value)}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void handleConfirm();
            }
          }}
        />
      )}
    </Dialog>
  );
}
