import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Mirrors in-app screen navigation onto the browser history stack, so the
 * hardware/browser Back button steps back through the app instead of leaving
 * the page.
 *
 * Each history entry carries the view it represents, which makes `popstate`
 * handling stateless: whatever view the browser hands back is the view we
 * render. Multi-step gestures (long-press Back, swipe) and the Forward button
 * therefore work without any bookkeeping of our own.
 *
 * Only the app's root view lives at depth 0, and it owns the entry the page was
 * loaded with — so Back from the root still leaves the site, as users expect.
 */

/** Namespaced so we never mistake another script's history state for ours. */
const STATE_KEY = 'ecoHeroNav';

interface NavEntry<V> {
  view: V;
  depth: number;
}

function readEntry<V>(state: unknown): NavEntry<V> | null {
  if (typeof state !== 'object' || state === null) return null;
  const entry = (state as Record<string, unknown>)[STATE_KEY];
  if (typeof entry !== 'object' || entry === null) return null;

  const { view, depth } = entry as { view?: unknown; depth?: unknown };
  if (view === undefined || typeof depth !== 'number') return null;
  return { view: view as V, depth };
}

function entryState<V>(view: V, depth: number): Record<string, NavEntry<V>> {
  return { [STATE_KEY]: { view, depth } };
}

export interface HistoryNavigationOptions<V> {
  /**
   * Consulted before a user-initiated Back press is applied. Returning true
   * cancels it: the entry the browser just consumed is pushed back so the app
   * stays exactly where it was, and `onInterceptBack` runs so the app can ask
   * for confirmation first.
   *
   * Navigations the app performs itself (`back`, `reset`) are never
   * intercepted — otherwise confirming a blocked Back could never go through.
   */
  interceptBack?: (current: V) => boolean;
  /** Runs when `interceptBack` cancelled a Back press. */
  onInterceptBack?: () => void;
}

export interface HistoryNavigation<V> {
  /** The view the browser is currently on. */
  view: V;
  /** Opens a child view; Back returns to the current one. */
  push: (next: V) => void;
  /** Swaps the current view without adding a history entry. */
  replace: (next: V) => void;
  /** Steps back one entry, exactly like the Back button. */
  back: () => void;
  /** Unwinds all the way to the root view. */
  reset: () => void;
}

export function useHistoryNavigation<V>(
  rootView: V,
  options?: HistoryNavigationOptions<V>
): HistoryNavigation<V> {
  const [view, setView] = useState<V>(rootView);

  // Captured once: the root is fixed for the lifetime of the app.
  const rootRef = useRef(rootView);
  const depthRef = useRef(0);

  // The popstate listener is registered once, so it reads the live view and
  // options through refs instead of closing over stale render values.
  const viewRef = useRef(view);
  const optionsRef = useRef(options);
  useEffect(() => {
    viewRef.current = view;
    optionsRef.current = options;
  });

  /**
   * Set just before `back`/`reset` move the browser, and cleared by the
   * popstate they cause. Every such call in this app has an entry behind it,
   * so the flag is always consumed by the very next popstate.
   */
  const programmaticRef = useRef(false);

  // Claim the entry the page loaded with as our root, so a later `popstate`
  // onto it is recognisable as "back at the start screen".
  useEffect(() => {
    window.history.replaceState(entryState(rootRef.current, 0), '');
  }, []);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const entry = readEntry<V>(event.state);
      const wasProgrammatic = programmaticRef.current;
      programmaticRef.current = false;

      if (!wasProgrammatic && optionsRef.current?.interceptBack?.(viewRef.current)) {
        // The browser has already stepped back, so put the current view back on
        // top. Its depth is the restored entry's + 1, which is exactly where
        // the stack now sits.
        depthRef.current = (entry?.depth ?? 0) + 1;
        window.history.pushState(entryState(viewRef.current, depthRef.current), '');
        optionsRef.current?.onInterceptBack?.();
        return;
      }

      depthRef.current = entry?.depth ?? 0;
      setView(entry ? entry.view : rootRef.current);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const push = useCallback((next: V) => {
    depthRef.current += 1;
    window.history.pushState(entryState(next, depthRef.current), '');
    setView(next);
  }, []);

  const replace = useCallback((next: V) => {
    window.history.replaceState(entryState(next, depthRef.current), '');
    setView(next);
  }, []);

  const back = useCallback(() => {
    programmaticRef.current = true;
    window.history.back();
  }, []);

  const reset = useCallback(() => {
    const steps = depthRef.current;
    if (steps === 0) {
      setView(rootRef.current);
      return;
    }

    // Render the root immediately; `history.go` resolves a task later and would
    // otherwise leave the outgoing screen on-screen for a visible beat.
    depthRef.current = 0;
    setView(rootRef.current);
    programmaticRef.current = true;
    window.history.go(-steps);
  }, []);

  return { view, push, replace, back, reset };
}
