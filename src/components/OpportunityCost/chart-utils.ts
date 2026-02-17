import type { Time } from 'lightweight-charts';
import type { PolicyEvent } from './types';

export const EXCESS_TIME_BASE = Math.floor(Date.UTC(2000, 0, 1) / 1000);
export const SECONDS_PER_DAY = 24 * 60 * 60;

export function readSeriesValue(data: unknown): number | null {
  if (!data || typeof data !== 'object') {
    return null;
  }

  const maybeValue = data as { value?: number; close?: number };
  if (typeof maybeValue.value === 'number') {
    return maybeValue.value;
  }

  if (typeof maybeValue.close === 'number') {
    return maybeValue.close;
  }

  return null;
}

export function formatTime(time: Time): string {
  if (typeof time === 'string') {
    return time;
  }

  if (typeof time === 'number') {
    return new Date(time * 1000).toISOString().slice(0, 10);
  }

  const month = String(time.month).padStart(2, '0');
  const day = String(time.day).padStart(2, '0');
  return `${time.year}-${month}-${day}`;
}

export function toRgba(hexColor: string, alpha: number): string {
  const normalized = hexColor.replace('#', '');
  if (normalized.length !== 6) {
    return `rgba(156, 163, 175, ${alpha})`;
  }

  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function toUnixDay(date: string): number {
  return Math.floor(Date.parse(`${date}T00:00:00Z`) / (1000 * 60 * 60 * 24));
}

export function compactPolicyEvents(
  events: PolicyEvent[],
  minDaySpacing: number,
  maxEvents: number
): PolicyEvent[] {
  if (events.length <= maxEvents) {
    return events;
  }

  const picked: PolicyEvent[] = [];
  let lastPickedDay: number | null = null;

  for (const event of events) {
    const day = toUnixDay(event.date);
    const isLegislation = event.type === 'legislation';
    const isSpacedEnough = lastPickedDay === null || day - lastPickedDay >= minDaySpacing;
    const hasRoom = picked.length < maxEvents;

    if ((isSpacedEnough && hasRoom) || isLegislation) {
      picked.push(event);
      lastPickedDay = day;
    }
  }

  if (picked.length === 0) {
    return [events[0]];
  }

  return picked
    .sort((left, right) => left.date.localeCompare(right.date))
    .slice(0, Math.max(1, maxEvents));
}
