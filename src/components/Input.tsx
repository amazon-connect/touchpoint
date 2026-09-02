/* eslint-disable jsdoc/require-jsdoc */
import {
  type ChangeEventHandler,
  type FC,
  useRef,
  useState,
  useMemo,
  useEffect,
} from "react";
import TextareaAutosize from "react-textarea-autosize";
import { type UploadUrl, type Subscriber, ResponseType } from "@nlxai/core";
import { clsx } from "clsx";

import { type ConnectConversationHandler } from "../connect";

import { useCopy } from "../utils/useCopy";
import { IconButton } from "./ui/IconButton";
import { Send, Attachment, Delete, Check, Error } from "./ui/Icons";
import { useTailwindMediaQuery } from "../utils/useTailwindMediaQuery";

interface InputProps {
  className?: string;
  handler: ConnectConversationHandler;
  uploadUrl?: UploadUrl;
  onFileUpload: (val: { uploadId: string; file: File }) => void;
  enabled: boolean;
  /**
   * Whether file attachments are offered (Amazon Connect). Attachments are only
   * supported while chatting with a human agent, so this is gated on agent presence.
   */
  attachmentsEnabled?: boolean;
}

interface FileInfo {
  name: string;
  size: number;
  type: string;
}

const MAX_INPUT_FILE_SIZE_IN_MB = 8;

export const Input: FC<InputProps> = ({
  className,
  handler,
  uploadUrl,
  onFileUpload,
  enabled,
  attachmentsEnabled = false,
}) => {
  const copy = useCopy();

  // Text state
  const [isTextAreaInFocus, setIsTextAreaInFocus] = useState(false);
  const [inputValue, setInputValue] = useState("");

  // Upload state
  const [uploadErrorMessage, setUploadErrorMessage] = useState<string | null>(
    null,
  );
  const [uploadedFileInfo, setUploadedFileInfo] = useState<FileInfo | null>(
    null,
  );
  // Amazon Connect attachments upload as soon as they are picked (ChatJS sends them
  // atomically). This tracks that upload so we can show progress/failure and block the
  // send button until it resolves.
  const [attachmentState, setAttachmentState] = useState<
    "idle" | "uploading" | "error"
  >("idle");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const connectHandler = handler as unknown as {
    sendAttachment?: (file: File) => Promise<void>;
  };
  const isConnect = connectHandler.sendAttachment != null;
  // Amazon Connect only supports attachments while a human agent is in the chat.
  const canSendAttachment = isConnect && enabled && attachmentsEnabled;
  // For Connect, hide the attachment control entirely until an agent joins (rather than
  // showing it disabled). Non-Connect deployments keep their existing behavior.
  const hideAttachmentButton = isConnect && !attachmentsEnabled;

  const textInputRef = useRef<HTMLTextAreaElement>(null);

  const isMd = useTailwindMediaQuery("md");

  // Autofocus input on desktop only
  useEffect(() => {
    if (isMd) {
      textInputRef.current?.focus();
    }
  }, [isMd]);

  const isInputEmpty = useMemo(() => {
    return inputValue.trim() === "";
  }, [inputValue]);

  const [isWaiting, setIsWaiting] = useState<boolean>(false);

  // For Connect, attachments upload on pick, so the send button only handles text;
  // it's blocked while an attachment upload is in progress.
  const inputMessageSendDisabled =
    (isInputEmpty && (uploadUrl == null || uploadedFileInfo == null)) ||
    isWaiting ||
    !enabled ||
    attachmentState === "uploading";

  const submit = (): void => {
    if (inputMessageSendDisabled) {
      return;
    }

    const utterance = inputValue;
    const isStructured = uploadUrl != null && uploadedFileInfo != null;

    // Amazon Connect chat is not turn-based (the next response may be a human agent's
    // reply, whenever it comes). Clear the input immediately and keep it enabled so the
    // customer can send consecutive messages without waiting for a response.
    if (isConnect && !isStructured) {
      handler.sendText(utterance);
      setInputValue("");
      if (isMd) {
        setTimeout(() => {
          textInputRef.current?.focus();
        });
      }
      return;
    }

    // Turn-based (NLX): subscribe to the response and clear/re-enable the input only then.
    const subscriber: Subscriber = (_responses, newResponse) => {
      if (
        newResponse?.type === ResponseType.Application ||
        newResponse?.type === ResponseType.Failure
      ) {
        setIsWaiting(false);
        handler.unsubscribe(subscriber);
        setInputValue("");
        setUploadedFileInfo(null);
        if (isMd) {
          setTimeout(() => {
            textInputRef.current?.focus();
          });
        }
      }
    };
    handler.subscribe(subscriber);

    setIsWaiting(true);

    if (isStructured) {
      handler.sendStructured({
        uploadIds: [uploadUrl.uploadId],
        utterance,
      });
    } else {
      handler.sendText(utterance);
    }
  };

  const isUploadEnabled = (uploadUrl != null || canSendAttachment) && enabled;

  const setGenericUploadError = (): void => {
    setUploadErrorMessage("Something went wrong. Please try again.");
  };

  const uploadFile: ChangeEventHandler<HTMLInputElement> = (e): void => {
    const file = e.target?.files?.[0];
    if (file == null) {
      setGenericUploadError();
      return;
    }

    const { name, size, type } = file;
    setUploadedFileInfo({ name, size, type });

    if (size / 1024 ** 2 > MAX_INPUT_FILE_SIZE_IN_MB) {
      setUploadErrorMessage(
        `The file is too big. Max file size: ${MAX_INPUT_FILE_SIZE_IN_MB}mb`,
      );
      return;
    }

    if (uploadUrl != null) {
      fetch(uploadUrl.url, {
        method: "PUT",
        headers: {
          // TODO: handle other file formats
          "Content-Type": "image/jpeg",
        },
        body: file,
      })
        .then(() => {
          setUploadErrorMessage(null);
          onFileUpload({ uploadId: uploadUrl.uploadId, file });
        })
        .catch(() => {
          setGenericUploadError();
        });
    } else if (canSendAttachment && connectHandler.sendAttachment != null) {
      // Amazon Connect: upload immediately. On success the handler adds the pill to
      // the transcript and we clear the input chip; on failure we surface the error.
      setUploadErrorMessage(null);
      setAttachmentState("uploading");
      connectHandler
        .sendAttachment(file)
        .then(() => {
          setAttachmentState("idle");
          setUploadedFileInfo(null);
          if (fileInputRef.current != null) {
            fileInputRef.current.value = "";
          }
        })
        .catch(() => {
          setAttachmentState("error");
          setUploadErrorMessage("The file could not be uploaded.");
        });
    } else {
      setGenericUploadError();
    }
  };

  return (
    <div className={clsx("relative", className)}>
      <div
        className={clsx(
          "bg-primary-5 transition-colors duration-200 p-2 rounded-outer text-base font-normal border border-solid border-primary-10",
          isTextAreaInFocus ? "" : "hover:bg-secondary-20",
        )}
      >
        {uploadErrorMessage != null && (
          <div className="flex items-center gap-1 px-2 py-1 mb-2 w-full bg-error-secondary rounded-inner">
            <Error size={16} className="flex-none" />
            <span className="truncate">{uploadErrorMessage}</span>
          </div>
        )}
        {uploadedFileInfo && (
          <>
            <div className="flex items-center justify-between mb-2 w-full">
              <p className="flex items-center truncate mx-2">
                {attachmentState === "uploading" ? (
                  <span className="flex w-4 h-4 flex-none items-center justify-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary-60 animate-upload-pulse" />
                  </span>
                ) : uploadErrorMessage != null ? (
                  <Error size={16} className="flex-none text-error-primary" />
                ) : (
                  <Check size={16} className="flex-none text-primary-60" />
                )}
                <span className="truncate ml-3">{uploadedFileInfo.name}</span>
              </p>
              <IconButton
                className="flex-none"
                Icon={Delete}
                label="Delete"
                onClick={
                  isUploadEnabled
                    ? () => {
                        setUploadedFileInfo(null);
                        setUploadErrorMessage(null);
                        setAttachmentState("idle");
                        if (fileInputRef.current != null) {
                          fileInputRef.current.value = "";
                        }
                      }
                    : undefined
                }
                type="ghost"
              />
            </div>
            <hr className="border-b-px border-background mb-2 -mx-2" />
          </>
        )}
        <div className={clsx("flex items-end gap-1")}>
          {hideAttachmentButton ? null : isUploadEnabled &&
            uploadedFileInfo == null ? (
            <>
              <label
                htmlFor="file-upload"
                className="p-3 w-10 h-10 flex-none block transition-colors rounded-full bg-primary-80 hover:bg-primary-80 text-secondary-80 cursor-pointer"
              >
                <Attachment />
              </label>
              <input
                type="file"
                id="file-upload"
                className="sr-only"
                accept=".jpg, .jpeg, .png, .webp, .mp4, .mpeg4, .avi, .mov, .pdf"
                onChange={uploadFile}
                ref={fileInputRef}
              />
            </>
          ) : (
            /* Disabled attachment button */
            <IconButton
              className="flex-none"
              Icon={Attachment}
              label="Upload file"
              type="ghost"
            />
          )}
          <TextareaAutosize
            disabled={isWaiting || !enabled}
            className={clsx(
              "h-10 w-full resize-none mr-2 px-2 py-2 outline-hidden scrollbar-none",
              "bg-transparent text-primary-80 placeholder:text-primary-40 caret-accent",
              "disabled:text-primary-40",
            )}
            placeholder="Type something"
            maxRows={10}
            onFocus={() => {
              setIsTextAreaInFocus(true);
            }}
            onBlur={() => {
              setIsTextAreaInFocus(false);
            }}
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              if (e.target.value !== "") {
                (
                  handler as unknown as { sendTyping?: () => void }
                ).sendTyping?.();
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            ref={textInputRef}
          />
          <IconButton
            className="flex-none"
            label={copy.sendMessageButtonLabel}
            onClick={
              inputMessageSendDisabled
                ? undefined
                : () => {
                    submit();
                  }
            }
            type="activated"
            Icon={Send}
          />
        </div>
      </div>
    </div>
  );
};
