import { describe, it, expect } from 'vitest';
import { MovieStatus } from '../enums/movie-status.enum.js';
import { canTransitionStatus } from './movie-status.rules.js';

describe('MovieStatusRules (Domain)', () => {
  it('should allow UPCOMING to transition to SHOWING and ENDED', () => {
    expect(canTransitionStatus(MovieStatus.UPCOMING, MovieStatus.SHOWING)).toBe(true);
    expect(canTransitionStatus(MovieStatus.UPCOMING, MovieStatus.ENDED)).toBe(true);
  });

  it('should not allow UPCOMING to transition to UPCOMING', () => {
    expect(canTransitionStatus(MovieStatus.UPCOMING, MovieStatus.UPCOMING)).toBe(false);
  });

  it('should allow SHOWING to transition to ENDED only', () => {
    expect(canTransitionStatus(MovieStatus.SHOWING, MovieStatus.ENDED)).toBe(true);
    expect(canTransitionStatus(MovieStatus.SHOWING, MovieStatus.UPCOMING)).toBe(false);
    expect(canTransitionStatus(MovieStatus.SHOWING, MovieStatus.SHOWING)).toBe(false);
  });

  it('should not allow ENDED to transition to any other status (Terminal state)', () => {
    expect(canTransitionStatus(MovieStatus.ENDED, MovieStatus.UPCOMING)).toBe(false);
    expect(canTransitionStatus(MovieStatus.ENDED, MovieStatus.SHOWING)).toBe(false);
    expect(canTransitionStatus(MovieStatus.ENDED, MovieStatus.ENDED)).toBe(false);
  });
});

