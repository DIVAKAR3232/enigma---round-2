import { readFileSync } from 'node:fs';
import wordListPath from 'word-list';

let dictionary: Set<string> | null = null;

/** All five-letter words from the full English word list (~270k words), uppercased. Loaded once. */
export function fiveLetterDictionary(): Set<string> {
  if (!dictionary) {
    const text = readFileSync(wordListPath, 'utf8');
    dictionary = new Set(
      text
        .split(/\r?\n/)
        .filter((w) => /^[a-z]{5}$/.test(w))
        .map((w) => w.toUpperCase()),
    );
  }
  return dictionary;
}

export function isDictionaryWord(word: string): boolean {
  return fiveLetterDictionary().has(word.toUpperCase());
}

export interface ParsedWordList {
  accepted: string[];
  rejected: { word: string; reason: string }[];
  duplicates: number;
}

/**
 * Parses an uploaded list (plain text or CSV: words separated by newlines, commas, semicolons,
 * tabs or spaces). Keeps only five-letter A–Z words; by default also requires a dictionary match.
 */
export function parseWordList(text: string, opts: { allowUnknown?: boolean } = {}): ParsedWordList {
  const tokens = text
    .replace(/^﻿/, '')
    .split(/[\s,;|]+/)
    .map((t) => t.trim().replace(/^["']|["']$/g, ''))
    .filter(Boolean);

  const seen = new Set<string>();
  const accepted: string[] = [];
  const rejected: { word: string; reason: string }[] = [];
  let duplicates = 0;

  for (const token of tokens) {
    const word = token.toUpperCase();
    if (!/^[A-Z]{5}$/.test(word)) {
      rejected.push({ word: token, reason: 'Not exactly five letters A–Z' });
      continue;
    }
    if (seen.has(word)) {
      duplicates++;
      continue;
    }
    seen.add(word);
    if (!opts.allowUnknown && !isDictionaryWord(word)) {
      rejected.push({ word: token, reason: 'Not found in the English dictionary' });
      continue;
    }
    accepted.push(word);
  }
  return { accepted, rejected, duplicates };
}
