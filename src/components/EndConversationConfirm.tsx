import { type FC } from "react";

import { Close, LogOut, Warning } from "./ui/Icons";
import { useCopy } from "../utils/useCopy";
import { TextButton } from "./ui/TextButton";
import { IconButton } from "./ui/IconButton";

interface EndConversationConfirmProps {
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Overlay asking the customer to confirm ending the conversation. Covers the
 * nearest positioned ancestor.
 */
export const EndConversationConfirm: FC<EndConversationConfirmProps> = ({
  onCancel,
  onConfirm,
}) => {
  const copy = useCopy();
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-secondary60 p-4">
      <div className="w-full max-w-sm rounded-outer bg-background backdrop-blur-overlay p-4 space-y-6 border border-solid border-primary-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary">
            <Warning className="size-5 flex-none" />
            <span className="text-xl">{copy.endConversationConfirm.title}</span>
          </div>
          <IconButton
            type="ghost"
            Icon={Close}
            label={copy.endConversationConfirm.cancel}
            onClick={onCancel}
          />
        </div>
        <p className="text-sm text-primary">
          {copy.endConversationConfirm.body}
        </p>
        <div className="space-y-2">
          <TextButton
            label={copy.endConversationConfirm.cancel}
            Icon={Close}
            type="ghost"
            onClick={onCancel}
          />
          <TextButton
            label={copy.endConversationConfirm.confirm}
            Icon={LogOut}
            type="error"
            onClick={onConfirm}
          />
        </div>
      </div>
    </div>
  );
};
