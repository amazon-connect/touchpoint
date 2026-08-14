/* eslint-disable jsdoc/require-jsdoc */
import { createContext, useContext } from "react";
import { type Copy } from "../interface";

export const defaultCopy = (languageCode: string): Copy => {
  if (languageCode.startsWith("es")) {
    return {
      escalationAttemptNotice:
        "Estoy intentando transferir tu conversación a un agente.",
      escalationNotice: "Su conversación ha sido transferida a un agente",
      restartConversationButtonLabel: "Reiniciar conversación",
      startNewConversationButtonLabel: "Iniciar nueva conversación",
      downloadTranscriptButtonLabel: "Descargar transcripción",
      endConversationButtonLabel: "Finalizar conversación",
      endConversationConfirm: {
        title: "¿Estás seguro?",
        body: "Estás a punto de finalizar la conversación actual. Esta acción no se puede deshacer.",
        confirm: "Finalizar conversación",
        cancel: "Cancelar",
      },
      escalationButtonLabel: "Hablar con un agente",
      sendMessageButtonLabel: "Enviar mensaje",
      participants: {
        you: "Tú",
        bot: "IA",
        agent: "Agente",
      },
      messageStatus: {
        sending: "Enviando",
        sent: "Enviado",
        delivered: "Entregado",
        read: "Leído",
        failed: "Error",
      },
      guide: {
        label: "Guía",
        defaultTitle: "Guía",
        defaultSubtitle: "",
        loading: "Cargando guía…",
        error: "No se pudo cargar la guía",
        placeholder: "Esta guía se abrirá aquí.",
        close: "Cerrar",
        status: {
          notStarted: "Sin iniciar",
          inProgress: "En progreso",
          complete: "Completada",
        },
      },
    };
  }
  // TODO: add default copy for other languages
  return {
    escalationAttemptNotice:
      "I'm attempting to transfer your conversation to an agent",
    escalationNotice: "Your conversation has been transferred to an agent",
    restartConversationButtonLabel: "Restart conversation",
    startNewConversationButtonLabel: "Start new conversation",
    downloadTranscriptButtonLabel: "Download transcript",
    endConversationButtonLabel: "End conversation",
    endConversationConfirm: {
      title: "Are you sure?",
      body: "You are about to end the current conversation. This action can't be undone.",
      confirm: "End conversation",
      cancel: "Cancel",
    },
    escalationButtonLabel: "Talk to the agent",
    sendMessageButtonLabel: "Send message",
    participants: {
      you: "You",
      bot: "AI",
      agent: "Agent",
    },
    messageStatus: {
      sending: "Sending",
      sent: "Sent",
      delivered: "Delivered",
      read: "Read",
      failed: "Failed",
    },
    guide: {
      label: "Guide",
      defaultTitle: "Guide",
      defaultSubtitle: "",
      loading: "Loading guide…",
      error: "Couldn't load the guide",
      placeholder: "This guide will open here.",
      close: "Close",
      status: {
        notStarted: "Not started",
        inProgress: "In progress",
        complete: "Complete",
      },
    },
  };
};

const CopyContext = createContext<Copy>(defaultCopy("en-US"));

export const CopyProvider = CopyContext.Provider;

export const useCopy = (): Copy => useContext(CopyContext);
