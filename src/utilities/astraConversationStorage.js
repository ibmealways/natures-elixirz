import { notifyCloudChange } from "./cloudChange";
import { sanitizeAstraKernelTransfer } from "./astraKernelTransfer";

const PREFIX = "naturesElixirz.astraConversation.v1";
const MAX_MESSAGES = 40;
const MAX_CONTENT_LENGTH = 6000;

const keyFor = (scope = "guest") => `${PREFIX}.${scope}`;

function sanitizeMessages(messages = []) {
  return (Array.isArray(messages) ? messages : [])
    .filter((message) => ["user", "assistant"].includes(message?.role) && String(message?.content || "").trim())
    .map((message) => {
      const transfer = message.role === "assistant" ? sanitizeAstraKernelTransfer(message.transfer) : null;
      return {
        role: message.role,
        content: String(message.content).slice(0, MAX_CONTENT_LENGTH),
        ...(transfer ? { transfer } : {}),
        createdAt: message.createdAt || new Date().toISOString(),
      };
    })
    .slice(-MAX_MESSAGES);
}

export function getAstraConversation(scope = "guest") {
  try {
    return sanitizeMessages(JSON.parse(localStorage.getItem(keyFor(scope)))?.messages);
  } catch {
    return [];
  }
}

export function saveAstraConversation(messages, scope = "guest") {
  const safeMessages = sanitizeMessages(messages);
  localStorage.setItem(keyFor(scope), JSON.stringify({ messages: safeMessages, updatedAt: new Date().toISOString() }));
  notifyCloudChange(scope);
  return safeMessages;
}

export function restoreAstraConversation(value, scope = "guest") {
  const safeMessages = sanitizeMessages(value?.messages || value);
  localStorage.setItem(keyFor(scope), JSON.stringify({ messages: safeMessages, updatedAt: value?.updatedAt || new Date().toISOString() }));
  return safeMessages;
}

export function getAstraConversationBundle(scope = "guest") {
  return { messages: getAstraConversation(scope), updatedAt: new Date().toISOString() };
}

export function clearAstraConversation(scope = "guest") {
  localStorage.removeItem(keyFor(scope));
  notifyCloudChange(scope);
}
