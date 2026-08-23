/* eslint-disable jsdoc/require-jsdoc */
import { createContext, useContext } from "react";
import { type Copy } from "../interface";

// Localized UI copy for the locales the Amazon Connect chat interface supports:
// de_DE, en_US, es_ES, fr_FR, id_ID, it_IT, ja_JP, ko_KR, pt_BR, zh_CN, zh_TW.

const en: Copy = {
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
  authentication: {
    heading: "Please authenticate",
    authenticate: "Authenticate",
    continueWithoutSigningIn: "Continue without signing in",
    lockedInputHint: "Complete or skip authentication before continuing.",
    status: {
      prompt: "Please authenticate",
      in_progress: "Authentication in progress",
      success: "Authentication successful",
      failed: "Authentication failed",
      expired: "Authentication expired",
      cancelled: "Authentication cancelled",
    },
  },
  participants: { you: "You", bot: "AI", agent: "Agent" },
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

const es: Copy = {
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
  authentication: {
    heading: "Por favor, autentícate",
    authenticate: "Autenticar",
    continueWithoutSigningIn: "Continuar sin iniciar sesión",
    lockedInputHint: "Completa u omite la autenticación antes de continuar.",
    status: {
      prompt: "Por favor, autentícate",
      in_progress: "Autenticación en curso",
      success: "Autenticación exitosa",
      failed: "Error de autenticación",
      expired: "La autenticación expiró",
      cancelled: "Autenticación cancelada",
    },
  },
  participants: { you: "Tú", bot: "IA", agent: "Agente" },
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

const de: Copy = {
  escalationAttemptNotice:
    "Ich versuche, Ihre Unterhaltung an einen Mitarbeiter weiterzuleiten.",
  escalationNotice: "Ihre Unterhaltung wurde an einen Mitarbeiter weitergeleitet",
  restartConversationButtonLabel: "Unterhaltung neu starten",
  startNewConversationButtonLabel: "Neue Unterhaltung starten",
  downloadTranscriptButtonLabel: "Transkript herunterladen",
  endConversationButtonLabel: "Unterhaltung beenden",
  endConversationConfirm: {
    title: "Sind Sie sicher?",
    body: "Sie sind dabei, die aktuelle Unterhaltung zu beenden. Diese Aktion kann nicht rückgängig gemacht werden.",
    confirm: "Unterhaltung beenden",
    cancel: "Abbrechen",
  },
  escalationButtonLabel: "Mit einem Mitarbeiter sprechen",
  sendMessageButtonLabel: "Nachricht senden",
  authentication: {
    heading: "Bitte authentifizieren",
    authenticate: "Authentifizieren",
    continueWithoutSigningIn: "Ohne Anmeldung fortfahren",
    lockedInputHint:
      "Bitte die Authentifizierung abschließen oder überspringen, um fortzufahren.",
    status: {
      prompt: "Bitte authentifizieren",
      in_progress: "Authentifizierung läuft",
      success: "Authentifizierung erfolgreich",
      failed: "Authentifizierung fehlgeschlagen",
      expired: "Authentifizierung abgelaufen",
      cancelled: "Authentifizierung abgebrochen",
    },
  },
  participants: { you: "Sie", bot: "KI", agent: "Mitarbeiter" },
  messageStatus: {
    sending: "Wird gesendet",
    sent: "Gesendet",
    delivered: "Zugestellt",
    read: "Gelesen",
    failed: "Fehlgeschlagen",
  },
  guide: {
    label: "Leitfaden",
    defaultTitle: "Leitfaden",
    defaultSubtitle: "",
    loading: "Leitfaden wird geladen…",
    error: "Leitfaden konnte nicht geladen werden",
    placeholder: "Dieser Leitfaden wird hier geöffnet.",
    close: "Schließen",
    status: {
      notStarted: "Nicht begonnen",
      inProgress: "In Bearbeitung",
      complete: "Abgeschlossen",
    },
  },
};

const fr: Copy = {
  escalationAttemptNotice:
    "Je tente de transférer votre conversation à un agent.",
  escalationNotice: "Votre conversation a été transférée à un agent",
  restartConversationButtonLabel: "Redémarrer la conversation",
  startNewConversationButtonLabel: "Démarrer une nouvelle conversation",
  downloadTranscriptButtonLabel: "Télécharger la transcription",
  endConversationButtonLabel: "Terminer la conversation",
  endConversationConfirm: {
    title: "Êtes-vous sûr ?",
    body: "Vous êtes sur le point de terminer la conversation en cours. Cette action est irréversible.",
    confirm: "Terminer la conversation",
    cancel: "Annuler",
  },
  escalationButtonLabel: "Parler à un agent",
  sendMessageButtonLabel: "Envoyer le message",
  authentication: {
    heading: "Veuillez vous authentifier",
    authenticate: "S'authentifier",
    continueWithoutSigningIn: "Continuer sans se connecter",
    lockedInputHint:
      "Terminez ou ignorez l'authentification avant de continuer.",
    status: {
      prompt: "Veuillez vous authentifier",
      in_progress: "Authentification en cours",
      success: "Authentification réussie",
      failed: "Échec de l'authentification",
      expired: "Authentification expirée",
      cancelled: "Authentification annulée",
    },
  },
  participants: { you: "Vous", bot: "IA", agent: "Agent" },
  messageStatus: {
    sending: "Envoi en cours",
    sent: "Envoyé",
    delivered: "Distribué",
    read: "Lu",
    failed: "Échec",
  },
  guide: {
    label: "Guide",
    defaultTitle: "Guide",
    defaultSubtitle: "",
    loading: "Chargement du guide…",
    error: "Impossible de charger le guide",
    placeholder: "Ce guide s'ouvrira ici.",
    close: "Fermer",
    status: {
      notStarted: "Non commencé",
      inProgress: "En cours",
      complete: "Terminé",
    },
  },
};

const id: Copy = {
  escalationAttemptNotice:
    "Saya sedang mencoba mengalihkan percakapan Anda ke agen.",
  escalationNotice: "Percakapan Anda telah dialihkan ke agen",
  restartConversationButtonLabel: "Mulai ulang percakapan",
  startNewConversationButtonLabel: "Mulai percakapan baru",
  downloadTranscriptButtonLabel: "Unduh transkrip",
  endConversationButtonLabel: "Akhiri percakapan",
  endConversationConfirm: {
    title: "Apakah Anda yakin?",
    body: "Anda akan mengakhiri percakapan saat ini. Tindakan ini tidak dapat dibatalkan.",
    confirm: "Akhiri percakapan",
    cancel: "Batal",
  },
  escalationButtonLabel: "Bicara dengan agen",
  sendMessageButtonLabel: "Kirim pesan",
  authentication: {
    heading: "Silakan lakukan autentikasi",
    authenticate: "Autentikasi",
    continueWithoutSigningIn: "Lanjutkan tanpa masuk",
    lockedInputHint:
      "Selesaikan atau lewati autentikasi sebelum melanjutkan.",
    status: {
      prompt: "Silakan lakukan autentikasi",
      in_progress: "Autentikasi sedang berlangsung",
      success: "Autentikasi berhasil",
      failed: "Autentikasi gagal",
      expired: "Autentikasi kedaluwarsa",
      cancelled: "Autentikasi dibatalkan",
    },
  },
  participants: { you: "Anda", bot: "AI", agent: "Agen" },
  messageStatus: {
    sending: "Mengirim",
    sent: "Terkirim",
    delivered: "Terkirim ke penerima",
    read: "Dibaca",
    failed: "Gagal",
  },
  guide: {
    label: "Panduan",
    defaultTitle: "Panduan",
    defaultSubtitle: "",
    loading: "Memuat panduan…",
    error: "Tidak dapat memuat panduan",
    placeholder: "Panduan ini akan terbuka di sini.",
    close: "Tutup",
    status: {
      notStarted: "Belum dimulai",
      inProgress: "Sedang berlangsung",
      complete: "Selesai",
    },
  },
};

const it: Copy = {
  escalationAttemptNotice:
    "Sto provando a trasferire la tua conversazione a un operatore.",
  escalationNotice: "La tua conversazione è stata trasferita a un operatore",
  restartConversationButtonLabel: "Riavvia conversazione",
  startNewConversationButtonLabel: "Avvia nuova conversazione",
  downloadTranscriptButtonLabel: "Scarica trascrizione",
  endConversationButtonLabel: "Termina conversazione",
  endConversationConfirm: {
    title: "Sei sicuro?",
    body: "Stai per terminare la conversazione corrente. Questa azione non può essere annullata.",
    confirm: "Termina conversazione",
    cancel: "Annulla",
  },
  escalationButtonLabel: "Parla con un operatore",
  sendMessageButtonLabel: "Invia messaggio",
  authentication: {
    heading: "Autenticati",
    authenticate: "Autentica",
    continueWithoutSigningIn: "Continua senza accedere",
    lockedInputHint: "Completa o salta l'autenticazione prima di continuare.",
    status: {
      prompt: "Autenticati",
      in_progress: "Autenticazione in corso",
      success: "Autenticazione riuscita",
      failed: "Autenticazione non riuscita",
      expired: "Autenticazione scaduta",
      cancelled: "Autenticazione annullata",
    },
  },
  participants: { you: "Tu", bot: "IA", agent: "Operatore" },
  messageStatus: {
    sending: "Invio in corso",
    sent: "Inviato",
    delivered: "Consegnato",
    read: "Letto",
    failed: "Non riuscito",
  },
  guide: {
    label: "Guida",
    defaultTitle: "Guida",
    defaultSubtitle: "",
    loading: "Caricamento della guida…",
    error: "Impossibile caricare la guida",
    placeholder: "Questa guida si aprirà qui.",
    close: "Chiudi",
    status: {
      notStarted: "Non iniziato",
      inProgress: "In corso",
      complete: "Completato",
    },
  },
};

const ja: Copy = {
  escalationAttemptNotice: "会話をオペレーターに転送しています。",
  escalationNotice: "会話はオペレーターに転送されました",
  restartConversationButtonLabel: "会話を再開",
  startNewConversationButtonLabel: "新しい会話を開始",
  downloadTranscriptButtonLabel: "履歴をダウンロード",
  endConversationButtonLabel: "会話を終了",
  endConversationConfirm: {
    title: "よろしいですか？",
    body: "現在の会話を終了しようとしています。この操作は取り消せません。",
    confirm: "会話を終了",
    cancel: "キャンセル",
  },
  escalationButtonLabel: "オペレーターと話す",
  sendMessageButtonLabel: "メッセージを送信",
  authentication: {
    heading: "認証してください",
    authenticate: "認証する",
    continueWithoutSigningIn: "サインインせずに続行",
    lockedInputHint: "続行する前に認証を完了またはスキップしてください。",
    status: {
      prompt: "認証してください",
      in_progress: "認証中",
      success: "認証に成功しました",
      failed: "認証に失敗しました",
      expired: "認証の有効期限が切れました",
      cancelled: "認証がキャンセルされました",
    },
  },
  participants: { you: "あなた", bot: "AI", agent: "オペレーター" },
  messageStatus: {
    sending: "送信中",
    sent: "送信済み",
    delivered: "配信済み",
    read: "既読",
    failed: "失敗",
  },
  guide: {
    label: "ガイド",
    defaultTitle: "ガイド",
    defaultSubtitle: "",
    loading: "ガイドを読み込んでいます…",
    error: "ガイドを読み込めませんでした",
    placeholder: "このガイドはここで開きます。",
    close: "閉じる",
    status: {
      notStarted: "未開始",
      inProgress: "進行中",
      complete: "完了",
    },
  },
};

const ko: Copy = {
  escalationAttemptNotice: "대화를 상담원에게 연결하고 있습니다.",
  escalationNotice: "대화가 상담원에게 연결되었습니다",
  restartConversationButtonLabel: "대화 다시 시작",
  startNewConversationButtonLabel: "새 대화 시작",
  downloadTranscriptButtonLabel: "대화 내용 다운로드",
  endConversationButtonLabel: "대화 종료",
  endConversationConfirm: {
    title: "확실합니까?",
    body: "현재 대화를 종료하려고 합니다. 이 작업은 취소할 수 없습니다.",
    confirm: "대화 종료",
    cancel: "취소",
  },
  escalationButtonLabel: "상담원과 대화하기",
  sendMessageButtonLabel: "메시지 보내기",
  authentication: {
    heading: "인증해 주세요",
    authenticate: "인증",
    continueWithoutSigningIn: "로그인하지 않고 계속",
    lockedInputHint: "계속하기 전에 인증을 완료하거나 건너뛰세요.",
    status: {
      prompt: "인증해 주세요",
      in_progress: "인증 진행 중",
      success: "인증 성공",
      failed: "인증 실패",
      expired: "인증 만료됨",
      cancelled: "인증 취소됨",
    },
  },
  participants: { you: "나", bot: "AI", agent: "상담원" },
  messageStatus: {
    sending: "보내는 중",
    sent: "보냄",
    delivered: "전달됨",
    read: "읽음",
    failed: "실패",
  },
  guide: {
    label: "가이드",
    defaultTitle: "가이드",
    defaultSubtitle: "",
    loading: "가이드를 불러오는 중…",
    error: "가이드를 불러올 수 없습니다",
    placeholder: "이 가이드가 여기에 열립니다.",
    close: "닫기",
    status: {
      notStarted: "시작 안 함",
      inProgress: "진행 중",
      complete: "완료",
    },
  },
};

const pt: Copy = {
  escalationAttemptNotice:
    "Estou tentando transferir sua conversa para um agente.",
  escalationNotice: "Sua conversa foi transferida para um agente",
  restartConversationButtonLabel: "Reiniciar conversa",
  startNewConversationButtonLabel: "Iniciar nova conversa",
  downloadTranscriptButtonLabel: "Baixar transcrição",
  endConversationButtonLabel: "Encerrar conversa",
  endConversationConfirm: {
    title: "Tem certeza?",
    body: "Você está prestes a encerrar a conversa atual. Esta ação não pode ser desfeita.",
    confirm: "Encerrar conversa",
    cancel: "Cancelar",
  },
  escalationButtonLabel: "Falar com um agente",
  sendMessageButtonLabel: "Enviar mensagem",
  authentication: {
    heading: "Autentique-se",
    authenticate: "Autenticar",
    continueWithoutSigningIn: "Continuar sem fazer login",
    lockedInputHint: "Conclua ou ignore a autenticação antes de continuar.",
    status: {
      prompt: "Autentique-se",
      in_progress: "Autenticação em andamento",
      success: "Autenticação bem-sucedida",
      failed: "Falha na autenticação",
      expired: "Autenticação expirada",
      cancelled: "Autenticação cancelada",
    },
  },
  participants: { you: "Você", bot: "IA", agent: "Agente" },
  messageStatus: {
    sending: "Enviando",
    sent: "Enviado",
    delivered: "Entregue",
    read: "Lido",
    failed: "Falhou",
  },
  guide: {
    label: "Guia",
    defaultTitle: "Guia",
    defaultSubtitle: "",
    loading: "Carregando guia…",
    error: "Não foi possível carregar o guia",
    placeholder: "Este guia será aberto aqui.",
    close: "Fechar",
    status: {
      notStarted: "Não iniciado",
      inProgress: "Em andamento",
      complete: "Concluído",
    },
  },
};

const zhCN: Copy = {
  escalationAttemptNotice: "正在尝试将您的对话转接给人工客服。",
  escalationNotice: "您的对话已转接给人工客服",
  restartConversationButtonLabel: "重新开始对话",
  startNewConversationButtonLabel: "开始新对话",
  downloadTranscriptButtonLabel: "下载对话记录",
  endConversationButtonLabel: "结束对话",
  endConversationConfirm: {
    title: "确定吗？",
    body: "您即将结束当前对话。此操作无法撤消。",
    confirm: "结束对话",
    cancel: "取消",
  },
  escalationButtonLabel: "联系人工客服",
  sendMessageButtonLabel: "发送消息",
  authentication: {
    heading: "请进行身份验证",
    authenticate: "验证",
    continueWithoutSigningIn: "不登录继续",
    lockedInputHint: "请先完成或跳过身份验证，然后再继续。",
    status: {
      prompt: "请进行身份验证",
      in_progress: "身份验证进行中",
      success: "身份验证成功",
      failed: "身份验证失败",
      expired: "身份验证已过期",
      cancelled: "身份验证已取消",
    },
  },
  participants: { you: "您", bot: "AI", agent: "客服" },
  messageStatus: {
    sending: "发送中",
    sent: "已发送",
    delivered: "已送达",
    read: "已读",
    failed: "失败",
  },
  guide: {
    label: "指南",
    defaultTitle: "指南",
    defaultSubtitle: "",
    loading: "正在加载指南…",
    error: "无法加载指南",
    placeholder: "此指南将在此处打开。",
    close: "关闭",
    status: {
      notStarted: "未开始",
      inProgress: "进行中",
      complete: "已完成",
    },
  },
};

const zhTW: Copy = {
  escalationAttemptNotice: "正在嘗試將您的對話轉接給真人客服。",
  escalationNotice: "您的對話已轉接給真人客服",
  restartConversationButtonLabel: "重新開始對話",
  startNewConversationButtonLabel: "開始新對話",
  downloadTranscriptButtonLabel: "下載對話記錄",
  endConversationButtonLabel: "結束對話",
  endConversationConfirm: {
    title: "確定嗎？",
    body: "您即將結束目前的對話。此操作無法復原。",
    confirm: "結束對話",
    cancel: "取消",
  },
  escalationButtonLabel: "聯絡真人客服",
  sendMessageButtonLabel: "傳送訊息",
  authentication: {
    heading: "請進行驗證",
    authenticate: "驗證",
    continueWithoutSigningIn: "不登入繼續",
    lockedInputHint: "請先完成或略過驗證，然後再繼續。",
    status: {
      prompt: "請進行驗證",
      in_progress: "驗證進行中",
      success: "驗證成功",
      failed: "驗證失敗",
      expired: "驗證已過期",
      cancelled: "驗證已取消",
    },
  },
  participants: { you: "您", bot: "AI", agent: "客服" },
  messageStatus: {
    sending: "傳送中",
    sent: "已傳送",
    delivered: "已送達",
    read: "已讀",
    failed: "失敗",
  },
  guide: {
    label: "指南",
    defaultTitle: "指南",
    defaultSubtitle: "",
    loading: "正在載入指南…",
    error: "無法載入指南",
    placeholder: "此指南將在此處開啟。",
    close: "關閉",
    status: {
      notStarted: "未開始",
      inProgress: "進行中",
      complete: "已完成",
    },
  },
};

const BY_LANGUAGE: Record<string, Copy> = {
  en,
  es,
  de,
  fr,
  id,
  it,
  ja,
  ko,
  pt,
};

/**
 * Resolves localized copy for a BCP-47 language code, matching the locales the
 * Amazon Connect chat interface supports. Falls back to English.
 */
export const defaultCopy = (languageCode: string): Copy => {
  const code = (languageCode || "en").toLowerCase().replace(/_/g, "-");
  if (code === "zh-tw" || code.startsWith("zh-hant")) return zhTW;
  if (code.startsWith("zh")) return zhCN;
  return BY_LANGUAGE[code.split("-")[0]] ?? en;
};

const CopyContext = createContext<Copy>(defaultCopy("en-US"));

export const CopyProvider = CopyContext.Provider;

export const useCopy = (): Copy => useContext(CopyContext);
