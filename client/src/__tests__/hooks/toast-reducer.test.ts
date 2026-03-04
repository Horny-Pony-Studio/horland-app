import { describe, it, expect } from 'vitest';
import { reducer } from '@/hooks/use-toast';

const makeToast = (id: string, title = 'Test') => ({
  id,
  title,
  open: true,
  onOpenChange: () => {},
});

describe('toast reducer', () => {
  it('ADD_TOAST adds toast to the beginning', () => {
    const state = { toasts: [] };
    const toast = makeToast('1');
    const result = reducer(state, { type: 'ADD_TOAST', toast });

    expect(result.toasts).toHaveLength(1);
    expect(result.toasts[0].id).toBe('1');
  });

  it('ADD_TOAST limits to TOAST_LIMIT (1)', () => {
    const state = { toasts: [makeToast('1')] };
    const newToast = makeToast('2', 'Second');
    const result = reducer(state, { type: 'ADD_TOAST', toast: newToast });

    // TOAST_LIMIT is 1, so only the newest toast remains
    expect(result.toasts).toHaveLength(1);
    expect(result.toasts[0].id).toBe('2');
  });

  it('UPDATE_TOAST updates matching toast', () => {
    const state = { toasts: [makeToast('1', 'Original')] };
    const result = reducer(state, {
      type: 'UPDATE_TOAST',
      toast: { id: '1', title: 'Updated' },
    });

    expect(result.toasts[0].title).toBe('Updated');
    expect(result.toasts[0].id).toBe('1');
  });

  it('UPDATE_TOAST does not affect non-matching toasts', () => {
    const state = { toasts: [makeToast('1', 'Original')] };
    const result = reducer(state, {
      type: 'UPDATE_TOAST',
      toast: { id: '999', title: 'Updated' },
    });

    expect(result.toasts[0].title).toBe('Original');
  });

  it('DISMISS_TOAST sets open to false for specific toast', () => {
    const state = { toasts: [makeToast('1')] };
    const result = reducer(state, { type: 'DISMISS_TOAST', toastId: '1' });

    expect(result.toasts[0].open).toBe(false);
  });

  it('DISMISS_TOAST without toastId dismisses all', () => {
    const state = { toasts: [makeToast('1'), makeToast('2')] };
    const result = reducer(state, { type: 'DISMISS_TOAST' });

    result.toasts.forEach((t) => expect(t.open).toBe(false));
  });

  it('REMOVE_TOAST removes specific toast', () => {
    const state = { toasts: [makeToast('1'), makeToast('2')] };
    const result = reducer(state, { type: 'REMOVE_TOAST', toastId: '1' });

    expect(result.toasts).toHaveLength(1);
    expect(result.toasts[0].id).toBe('2');
  });

  it('REMOVE_TOAST without toastId clears all', () => {
    const state = { toasts: [makeToast('1'), makeToast('2')] };
    const result = reducer(state, { type: 'REMOVE_TOAST', toastId: undefined });

    expect(result.toasts).toHaveLength(0);
  });
});
