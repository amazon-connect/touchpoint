/* eslint-disable jsdoc/require-jsdoc */
import { type FC } from "react";
import { useIcons } from "../utils/useIcons";

export const ErrorMessage: FC<{
  message: string;
}> = ({ message }) => {
  const { Warning } = useIcons();
  return (
    <div
      role="alert"
      className="bg-error-secondary text-error-primary text-base p-3 rounded-inner flex items-center gap-2"
    >
      <Warning className="w-4 h-4 flex-none" />
      <p className="text-primary">{message}</p>
    </div>
  );
};
