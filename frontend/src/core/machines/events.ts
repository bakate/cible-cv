/** Events emitted by machines towards the shell (side effects the UI merely executes). */
import type { Notification, NotifyLevel } from "../domain/types";

export type NotifyEvent = { type: "notify" } & Notification;
export type NavigateEvent = { type: "navigate"; to: string; replace?: boolean };
export type ShellEvent = NotifyEvent | NavigateEvent;

export const notify = (level: NotifyLevel, title: string, description?: string): NotifyEvent => ({
  type: "notify",
  level,
  title,
  description,
});

export const navigateTo = (to: string, replace = false): NavigateEvent => ({ type: "navigate", to, replace });
