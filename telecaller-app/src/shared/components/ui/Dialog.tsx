import React, { useId } from "react";
import Modal, { ModalProps } from "./Modal";
import Button from "./Button";
import FormActions from "./FormActions";

export interface DialogProps extends Omit<ModalProps, "title" | "children"> {
  title: string;
  description?: string;
  children?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  confirmVariant?: "primary" | "secondary" | "danger" | "success";
  isLoading?: boolean;
}

export default function Dialog({
  isOpen,
  onClose,
  title,
  description,
  children,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  confirmVariant = "primary",
  isLoading = false,
  size = "sm",
  closeOnBackdrop,
  ...props
}: DialogProps) {
  const descriptionId = useId();
  // Destructive confirms: backdrop opt-out by default (Modal/Drawer contract draft).
  const resolvedCloseOnBackdrop =
    closeOnBackdrop ?? confirmVariant !== "danger";

  // Command Surface §3d via FormActions: Cancel outline → Confirm primary/danger/success
  const footer = (
    <FormActions>
      <Button variant="outline" onClick={onClose} disabled={isLoading}>
        {cancelLabel}
      </Button>
      {onConfirm && (
        <Button
          variant={confirmVariant}
          onClick={onConfirm}
          disabled={isLoading}
        >
          {isLoading ? "Processing..." : confirmLabel}
        </Button>
      )}
    </FormActions>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size={size}
      footer={footer}
      descriptionId={description ? descriptionId : undefined}
      closeOnBackdrop={resolvedCloseOnBackdrop}
      {...props}
    >
      <div className="space-y-3">
        {description && (
          <p
            id={descriptionId}
            className="text-xs sm:text-sm text-theme-muted"
          >
            {description}
          </p>
        )}
        {children}
      </div>
    </Modal>
  );
}
