import { describe, expect, it } from 'vitest';
import { DEFAULT_WORDS } from '../server/words/defaultWords';
import { fiveLetterDictionary, parseWordList } from '../server/words/dictionary';

describe('built-in word list', () => {
  it('has a healthy number of words', () => {
    expect(DEFAULT_WORDS.length).toBeGreaterThan(500);
  });

  it('contains only unique, uppercase five-letter words', () => {
    for (const w of DEFAULT_WORDS) expect(w).toMatch(/^[A-Z]{5}$/);
    expect(new Set(DEFAULT_WORDS).size).toBe(DEFAULT_WORDS.length);
  });

  it('every word is a real English word from the dictionary', () => {
    const dict = fiveLetterDictionary();
    const missing = DEFAULT_WORDS.filter((w) => !dict.has(w));
    expect(missing).toEqual([]);
  });
});

describe('parseWordList', () => {
  it('accepts newline, comma and space separated words and uppercases them', () => {
    const r = parseWordList('apple\nBrain, chair  dream;eagle');
    expect(r.accepted).toEqual(['APPLE', 'BRAIN', 'CHAIR', 'DREAM', 'EAGLE']);
    expect(r.rejected).toEqual([]);
  });

  it('drops duplicates and rejects wrong lengths or characters', () => {
    const r = parseWordList('apple,APPLE,cat,bananas,ab-cd,héllo');
    expect(r.accepted).toEqual(['APPLE']);
    expect(r.duplicates).toBe(1);
    expect(r.rejected.map((x) => x.word)).toEqual(['cat', 'bananas', 'ab-cd', 'héllo']);
  });

  it('rejects non-dictionary words unless allowUnknown is set', () => {
    expect(parseWordList('zzqxj').accepted).toEqual([]);
    expect(parseWordList('zzqxj', { allowUnknown: true }).accepted).toEqual(['ZZQXJ']);
  });

  it('handles CSV with quotes and a BOM', () => {
    const r = parseWordList('﻿"apple","brain"\r\n"chair"');
    expect(r.accepted).toEqual(['APPLE', 'BRAIN', 'CHAIR']);
  });
});
