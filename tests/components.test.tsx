// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { GameState } from '../shared/types';
import { Keyboard } from '../src/components/Keyboard';
import { GameStage } from '../src/components/GameStage';
import { GameControls } from '../src/components/GameControls';

afterEach(cleanup);

const base: GameState = {
  status: 'RUNNING',
  durationMs: 120_000,
  remainingMs: 120_000,
  endsAt: null,
  currentWord: 'CHAIR',
  round: 3,
  version: 1,
  serverNow: 0,
  eventName: 'Keyboard Ball Challenge',
  highlightLetters: true,
};

describe('Keyboard', () => {
  it('renders all 26 letters in QWERTY order', () => {
    render(<Keyboard />);
    const keys = screen.getAllByTestId(/^key-/).map((k) => k.textContent).join('');
    expect(keys).toBe('QWERTYUIOPASDFGHJKLZXCVBNM');
  });

  it('highlights only the requested letters', () => {
    render(<Keyboard highlight={new Set(['C', 'H'])} />);
    expect(screen.getByTestId('key-C').dataset.lit).toBe('true');
    expect(screen.getByTestId('key-H').dataset.lit).toBe('true');
    expect(screen.getByTestId('key-Q').dataset.lit).toBeUndefined();
  });
});

describe('GameStage', () => {
  it('shows round, timer and the target word while running', () => {
    render(<GameStage state={base} status="RUNNING" remaining={65_000} />);
    expect(screen.getByTestId('round').textContent).toContain('3');
    expect(screen.getByTestId('timer').textContent).toBe('1:05');
    expect(screen.getByTestId('target-word').textContent).toBe('CHAIR');
  });

  it('shows the READY screen and hides the word before start', () => {
    render(<GameStage state={{ ...base, status: 'READY', round: 0 }} status="READY" remaining={120_000} />);
    expect(screen.getAllByText('READY').length).toBeGreaterThan(0);
    expect(screen.getByTestId('target-word').textContent).not.toContain('CHAIR');
  });

  it('shows GAME OVER when time is up', () => {
    render(<GameStage state={base} status="OVER" remaining={0} />);
    expect(screen.getAllByText('GAME OVER').length).toBeGreaterThan(0);
    expect(screen.getByTestId('timer').textContent).toBe('0:00');
  });

  it('has no hit-judging controls', () => {
    render(<GameStage state={base} status="RUNNING" remaining={1000} />);
    expect(screen.queryByText(/correct hit|wrong hit|hit/i)).toBeNull();
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });
});

describe('GameControls', () => {
  it('projector variant has START/PAUSE/RESUME/RESTART but no NEXT WORD', () => {
    render(<GameControls status="RUNNING" onAction={async () => true} />);
    for (const label of ['START', 'PAUSE', 'RESUME', 'RESTART']) expect(screen.getByText(label)).toBeTruthy();
    expect(screen.queryByText('NEXT WORD')).toBeNull();
  });

  it('organizer variant includes NEXT WORD and enables only valid actions', () => {
    render(<GameControls status="PAUSED" onAction={async () => true} showNextWord />);
    const btn = (label: string) => screen.getByText(label) as HTMLButtonElement;
    expect(btn('START').disabled).toBe(true);
    expect(btn('PAUSE').disabled).toBe(true);
    expect(btn('RESUME').disabled).toBe(false);
    expect(btn('NEXT WORD').disabled).toBe(false);
  });

  it('sends the chosen action', () => {
    const onAction = vi.fn(async () => true);
    render(<GameControls status="READY" onAction={onAction} showNextWord />);
    fireEvent.click(screen.getByText('START'));
    expect(onAction).toHaveBeenCalledWith('start');
  });
});
