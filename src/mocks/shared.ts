import { ResponseType, type Response, type ConversationHandler } from "../core";

import { type Theme } from "../interface";

export const mockTheme: Partial<Theme> = {
  fontFamily: "monospace",
};

export const mockConversationHandler: ConversationHandler = {
  sendText: () => {},
  sendSlots: () => {},
  sendChoice: () => {},
  sendWelcomeFlow: () => {},
  sendWelcomeIntent: () => {},
  sendFlow: () => {},
  sendIntent: () => {},
  sendStructured: () => {},
  sendContext: async () => {
    await Promise.reject(new Error("Mock implementation"));
  },
  getVoiceCredentials: async () => {
    return await Promise.reject(new Error("Mock implementation"));
  },
  submitFeedback: async () => {
    await Promise.reject(new Error("Mock implementation"));
  },
  appendMessageToTranscript: () => {},
  subscribe: () => () => {},
  unsubscribe: () => {},
  unsubscribeAll: () => {},
  currentConversationId: () => undefined,
  setLanguageCode: () => {},
  reset: () => {},
  destroy: () => {},
  currentLanguageCode: () => "en-US",
  setRequestOverride: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  sendVoicePlusContext: () => {},
  setInterimMessage: () => {},
};

export const responses: Response[] = [
  {
    type: ResponseType.User,
    receivedAt: 1774542161833,
    payload: {
      type: "structured",
      intentId: "NLX.Welcome",
    },
  },
  {
    type: ResponseType.Application,
    receivedAt: 1774542162360,
    payload: {
      messages: [
        {
          nodeId: "93afd14e-a9d1-4e67-bb48-74edf01f0610",
          messageId:
            "c8f9aa4d00fb808d6d94ae68e4f78c69b14ba90554e4240a4186e7d34cad3301",
          text: "Hello",
          choices: [],
        },
        {
          nodeId: "93afd14e-a9d1-4e67-bb48-74edf01f0610",
          messageId:
            "93d54dc2fe5c3428e75be331bd190d5b7492ccf6707286d4f380a9aa190e0c88",
          text: "What's your name?",
          choices: [],
        },
      ],
      conversationId: "84746211-c932-4e96-a9a7-7c374bd7a218",
      expirationTimestamp: 1774542462283,
      modalities: {
        DefaultCarousel: {
          $saveAs: {
            type: "slot",
            id: "FirstName",
          },
          cards: [
            {
              thumbnail: null,
              id: "one",
              rows: [
                {
                  value: "value",
                  label: "key",
                },
              ],
              thumbnailAlt: null,
            },
            {
              thumbnail: null,
              id: "two",
              rows: [
                {
                  value: "value",
                  label: "key",
                },
              ],
              thumbnailAlt: null,
            },
          ],
        },
      },
      metadata: {
        hasPendingDataRequest: false,
        uploadUrls: [],
        intentId: "TestFlow",
        escalation: false,
        frustration: false,
        incomprehension: false,
      },
    },
  },
  {
    type: ResponseType.User,
    receivedAt: 1774542181426,
    payload: {
      type: "text",
      text: "My name is Paul",
    },
  },
  {
    type: ResponseType.Application,
    receivedAt: 1774542182586,
    payload: {
      messages: [
        {
          nodeId: "f89ef7e2-aefa-4f3b-9e22-4ff8dc36cf70",
          messageId:
            "280166ea2824e8d087daf3bde696b3d1396f8a51a4524c8c75ac48e957a36e27",
          text: "Hello, Paul",
          choices: [],
        },
      ],
      conversationId: "84746211-c932-4e96-a9a7-7c374bd7a218",
      expirationTimestamp: 1774542462309,
      modalities: {},
      metadata: {
        hasPendingDataRequest: false,
        uploadUrls: [],
        intentId: "TestFlow",
        escalation: false,
        frustration: false,
        incomprehension: false,
      },
    },
  },
  {
    type: ResponseType.User,
    receivedAt: 1774542201000,
    payload: {
      type: "text",
      text: "Thanks! I'm planning a trip next month and I'd like to know what my options are. I'll be traveling with my partner and two kids, we'd like to stay somewhere close to the beach, and we need a place that's friendly to young children and has a kitchen, since the little one has some dietary restrictions.",
    },
  },
  {
    type: ResponseType.Application,
    receivedAt: 1774542202500,
    payload: {
      messages: [
        {
          nodeId: "5c1d2f0e-7b3a-4c58-9d10-2a6e8f4b7c91",
          messageId:
            "a1b2c3d4e5f60718293a4b5c6d7e8f9012345678901234567890abcdef123456",
          text: "That sounds like a wonderful trip! Based on what you've told me, there are a few things worth considering before we pick a destination. Beachfront family rentals tend to book up quickly in peak season, so flexibility on dates can make a big difference in both availability and price. Many of them include a full kitchen, a fenced yard, and are within walking distance of calm, shallow water that suits young swimmers.",
          choices: [],
        },
        {
          nodeId: "5c1d2f0e-7b3a-4c58-9d10-2a6e8f4b7c91",
          messageId:
            "b2c3d4e5f60718293a4b5c6d7e8f9012345678901234567890abcdef1234567a",
          text: "I can also look at resorts with kids' clubs, or at smaller family-run guesthouses where the hosts can help accommodate dietary needs. Which of these would you like to explore first?",
          choices: [],
        },
      ],
      conversationId: "84746211-c932-4e96-a9a7-7c374bd7a218",
      expirationTimestamp: 1774542502500,
      modalities: {},
      metadata: {
        hasPendingDataRequest: false,
        uploadUrls: [],
        intentId: "TestFlow",
        escalation: false,
        frustration: false,
        incomprehension: false,
      },
    },
  },
  {
    type: ResponseType.User,
    receivedAt: 1774542221000,
    payload: {
      type: "text",
      text: "Show me some options",
    },
  },
  {
    type: ResponseType.Application,
    receivedAt: 1774542222000,
    payload: {
      messages: [
        {
          nodeId: "8e4f6a2b-1c3d-4e5f-8a9b-0c1d2e3f4a5b",
          messageId:
            "c3d4e5f60718293a4b5c6d7e8f9012345678901234567890abcdef12345678ab",
          text: "Which kind of stay would you like to explore?",
          choices: [
            { choiceId: "rentals", choiceText: "Beachfront rentals" },
            { choiceId: "resorts", choiceText: "Family resorts" },
            { choiceId: "guesthouses", choiceText: "Family-run guesthouses" },
          ],
          selectedChoiceId: "resorts",
        },
      ],
      conversationId: "84746211-c932-4e96-a9a7-7c374bd7a218",
      expirationTimestamp: 1774542522000,
      modalities: {},
      metadata: {
        hasPendingDataRequest: false,
        uploadUrls: [],
        intentId: "TestFlow",
        escalation: false,
        frustration: false,
        incomprehension: false,
      },
    },
  },
];
