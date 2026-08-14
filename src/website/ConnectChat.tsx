/* eslint-disable jsdoc/require-jsdoc */
import { useState, useEffect, useRef, type FC } from "react";
import { clsx } from "clsx";
import { ProviderStack } from "../ProviderStack";
import { type ColorMode, type Input } from "../interface";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      "nlx-touchpoint": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
    }
  }
}

interface ConnectChatConfig {
  instanceUrl: string;
  endpoint: string;
  voiceEndpoint: string;
  instanceId: string;
  contactFlowId: string;
  displayName: string;
  region: string;
  stage: string;
}

/** Input mode is selected separately (not a free-text field). */
type VoiceInput = Extract<Input, "text" | "voice" | "voiceMini">;

const inputOptions: Array<{ value: VoiceInput; label: string }> = [
  { value: "text", label: "Chat" },
  { value: "voice", label: "Voice" },
  { value: "voiceMini", label: "Voice mini" },
];

const colorModeOptions: Array<{ value: ColorMode; label: string }> = [
  { value: "dark", label: "Dark" },
  { value: "light", label: "Light" },
  { value: "light dark", label: "System" },
];

const defaults: Partial<ConnectChatConfig> = {
  displayName: "Customer",
  region: "us-east-1",
};

const fields: Array<{
  key: keyof ConnectChatConfig;
  label: string;
  placeholder: string;
}> = [
  {
    key: "instanceUrl",
    label: "Instance URL",
    placeholder: "https://your-instance.my.connect.aws",
  },
  {
    key: "endpoint",
    label: "API Gateway Endpoint URL (chat)",
    placeholder: "https://abc123.execute-api.us-east-1.amazonaws.com/Prod",
  },
  {
    key: "voiceEndpoint",
    label: "StartWebRTCContact Endpoint URL (voice)",
    placeholder: "https://abc123.execute-api.us-east-1.amazonaws.com/Voice",
  },
  {
    key: "instanceId",
    label: "Instance ID",
    placeholder: "11111111-1111-1111-1111-111111111111",
  },
  {
    key: "contactFlowId",
    label: "Contact Flow ID",
    placeholder: "22222222-2222-2222-2222-222222222222",
  },
  {
    key: "displayName",
    label: "Display Name",
    placeholder: "Customer",
  },
  {
    key: "region",
    label: "Region",
    placeholder: "us-east-1",
  },
  {
    key: "stage",
    label: "Stage (optional)",
    placeholder: "leave blank for production",
  },
];

export const ConnectChat: FC = () => {
  const [config, setConfig] = useState<ConnectChatConfig>(() => {
    const params = new URLSearchParams(window.location.search);
    return {
      instanceUrl: params.get("instanceUrl") ?? "",
      endpoint: params.get("endpoint") ?? "",
      voiceEndpoint: params.get("voiceEndpoint") ?? "",
      instanceId: params.get("instanceId") ?? "",
      contactFlowId: params.get("contactFlowId") ?? "",
      displayName: params.get("displayName") ?? defaults.displayName ?? "",
      region: params.get("region") ?? defaults.region ?? "",
      stage: params.get("stage") ?? "",
    };
  });

  const [input, setInput] = useState<VoiceInput>(() => {
    const value = new URLSearchParams(window.location.search).get("input");
    return value === "voice" || value === "text" ? value : "voiceMini";
  });

  const [colorMode, setColorMode] = useState<ColorMode>(() => {
    const value = new URLSearchParams(window.location.search).get("colorMode");
    return value === "light" || value === "light dark" ? value : "dark";
  });

  const [started, setStarted] = useState(false);
  const touchpointRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const url = new URL(window.location.href);
    for (const { key } of fields) {
      const value = config[key].trim();
      if (value && value !== (defaults[key] ?? "")) {
        url.searchParams.set(key, value);
      } else {
        url.searchParams.delete(key);
      }
    }
    if (input !== "text") {
      url.searchParams.set("input", input);
    } else {
      url.searchParams.delete("input");
    }
    if (colorMode !== "dark") {
      url.searchParams.set("colorMode", colorMode);
    } else {
      url.searchParams.delete("colorMode");
    }
    history.replaceState(null, "", url);
  }, [config, input, colorMode]);

  useEffect(() => {
    if (!started || !touchpointRef.current) return;

    const {
      instanceUrl,
      endpoint,
      voiceEndpoint,
      instanceId,
      contactFlowId,
      displayName,
      region,
      stage,
    } = config;

    // Show the settings (gear) menu and the close (X) button. When configuring the
    // element directly (instead of via create()), these default to off.
    (touchpointRef.current as any).enableSettings = true;
    // Voice mini is a floating mini-widget (bottom-right); the element defaults to
    // `embedded = true` when configured directly, which disables that floating layout.
    // Match the create() path so voice mini floats as intended.
    (touchpointRef.current as any).embedded = input === "voiceMini" ? false : true;
    (touchpointRef.current as any).onClose = () => {
      setStarted(false);
    };

    (touchpointRef.current as any).touchpointConfiguration = {
      config: {
        // Instance URL, used to load the Connect view/guide renderer.
        ...(instanceUrl.trim() !== "" ? { instanceUrl: instanceUrl.trim() } : {}),
        chatEndpoint: endpoint,
        // StartWebRTCContact proxy for voice inputs.
        ...(voiceEndpoint.trim() !== ""
          ? { voiceEndpoint: voiceEndpoint.trim() }
          : {}),
        instanceId,
        contactFlowId,
        participantDisplayName:
          displayName === "" ? defaults.displayName : displayName,
        region: region === "" ? defaults.region : region,
        ...(stage.trim() !== "" ? { stage: stage.trim() } : {}),
      },
      languageCode: "en-US",
      showParticipantInfo: true,
      windowSize: "half",
      colorMode,
      input,
      chatMode: true,
      // No `theme` override — use Touchpoint's default theme (including the default accent).
      initializeConversation: () => {},
    };
  }, [started]);

  const isVoice = input === "voice" || input === "voiceMini";

  const handleSubmit = (): void => {
    if (isVoice) {
      if (!config.voiceEndpoint.trim()) {
        alert("StartWebRTCContact Endpoint URL is required for voice.");
        return;
      }
    } else if (!config.endpoint.trim()) {
      alert("API Gateway Endpoint URL is required.");
      return;
    }
    setStarted(true);
  };

  if (started) {
    return (
      <nlx-touchpoint ref={touchpointRef} className="block w-full h-screen" />
    );
  }

  return (
    <ProviderStack colorMode="light" languageCode="en-US">
      <div className="flex items-center justify-center min-h-screen bg-background p-4">
        <div className="w-full max-w-md rounded-outer bg-secondary p-8 shadow-2xl">
          <h1 className="text-xl font-semibold text-primary-80 mb-1">
            Connect Chat + Touchpoint
          </h1>
          <p className="text-sm text-primary-40 mb-6">
            Enter your Amazon Connect details to launch a chat session powered
            by Touchpoint UI.
          </p>

          <div className="mb-4">
            <span className="block text-xs font-medium text-primary-60 mb-1">
              Input mode
            </span>
            <div className="flex gap-1 rounded-inner bg-primary-5 p-1">
              {inputOptions.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setInput(value);
                  }}
                  className={clsx(
                    "flex-1 rounded-inner px-3 py-2 text-sm font-medium transition-colors",
                    input === value
                      ? "bg-accent text-secondary"
                      : "text-primary-60 hover:bg-primary-5",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <span className="block text-xs font-medium text-primary-60 mb-1">
              Color mode
            </span>
            <div className="flex gap-1 rounded-inner bg-primary-5 p-1">
              {colorModeOptions.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setColorMode(value);
                  }}
                  className={clsx(
                    "flex-1 rounded-inner px-3 py-2 text-sm font-medium transition-colors",
                    colorMode === value
                      ? "bg-accent text-secondary"
                      : "text-primary-60 hover:bg-primary-5",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {fields.map(({ key, label, placeholder }) => (
              <div key={key}>
                <label
                  htmlFor={`connect-chat-${key}`}
                  className="block text-xs font-medium text-primary-60 mb-1"
                >
                  {label}
                </label>
                <input
                  id={`connect-chat-${key}`}
                  type="text"
                  placeholder={placeholder}
                  value={config[key]}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, [key]: e.target.value }))
                  }
                  className="w-full rounded-inner border border-primary-5 bg-primary-5 px-3 py-2 text-sm text-primary-80 placeholder-primary-20 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
            ))}
          </div>

          <button
            onClick={handleSubmit}
            className="mt-6 w-full rounded-inner bg-accent px-4 py-3 text-sm font-semibold text-secondary focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background transition-colors"
          >
            {isVoice ? "Start call" : "Start chat"}
          </button>
        </div>
      </div>
    </ProviderStack>
  );
};
