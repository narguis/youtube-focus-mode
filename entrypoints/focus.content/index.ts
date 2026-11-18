import { browser } from 'wxt/browser';

import './style.css';

const STORAGE_KEY = 'focusEnabled';
const FOCUS_CLASS = 'focus-button-enabled';
const BUTTON_CONTAINER_ID = 'focus-button-container';

const TOP_BAR_TARGETS = [
  'ytd-masthead #end #buttons',
  'yt-masthead #end #buttons',
  'ytd-masthead #end',
  'yt-masthead #end',
];

export default defineContentScript({
  matches: ['https://www.youtube.com/*'],
  runAt: 'document_start',

  async main(ctx) {
    let focusEnabled = false;

    const applyFocusState = (enabled: boolean) => {
      focusEnabled = enabled;
      document.documentElement.classList.toggle(FOCUS_CLASS, enabled);

      updateControls(document.getElementById(BUTTON_CONTAINER_ID), enabled);
      if (enabled) pauseShortsPlayback();
    };

    const toggleFocus = async () => {
      const previousState = focusEnabled;
      const nextState = !previousState;

      // Apply first so the page responds immediately to the click.
      applyFocusState(nextState);

      try {
        await browser.storage.local.set({ [STORAGE_KEY]: nextState });
      } catch (error) {
        applyFocusState(previousState);
        console.error('Focus Button could not save its state.', error);
      }
    };

    const ensureButton = () => {
      if (focusEnabled) pauseShortsPlayback();

      const existingContainer = document.getElementById(BUTTON_CONTAINER_ID);
      if (existingContainer?.isConnected) {
        updateControls(existingContainer, focusEnabled);
        return;
      }

      const target = findTopBarTarget();
      if (!target) return;

      const container = createButtonContainer(focusEnabled, () => {
        void toggleFocus();
      });

      // YouTube puts Create first in this group, so prepending places the
      // Focus control immediately to its left.
      target.insertBefore(container, target.firstChild);
    };

    const saved = await browser.storage.local.get(STORAGE_KEY);
    applyFocusState(saved[STORAGE_KEY] === true);
    ensureButton();

    let framePending = false;
    const scheduleButtonCheck = () => {
      if (framePending || ctx.isInvalid) return;

      framePending = true;
      requestAnimationFrame(() => {
        framePending = false;
        ensureButton();
      });
    };

    const pageObserver = new MutationObserver(scheduleButtonCheck);
    pageObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });

    ctx.addEventListener(document, 'yt-navigate-finish', scheduleButtonCheck);
    ctx.addEventListener(
      document,
      'play',
      (event) => {
        if (
          focusEnabled &&
          location.pathname.startsWith('/shorts') &&
          event.target instanceof HTMLMediaElement
        ) {
          event.target.pause();
        }
      },
      true,
    );

    const handleStorageChange: Parameters<
      typeof browser.storage.onChanged.addListener
    >[0] = (changes, areaName) => {
      if (areaName !== 'local' || changes[STORAGE_KEY] == null) return;
      applyFocusState(changes[STORAGE_KEY].newValue === true);
    };

    browser.storage.onChanged.addListener(handleStorageChange);

    ctx.onInvalidated(() => {
      pageObserver.disconnect();
      browser.storage.onChanged.removeListener(handleStorageChange);
    });
  },
});

function findTopBarTarget(): HTMLElement | null {
  for (const selector of TOP_BAR_TARGETS) {
    const target = document.querySelector<HTMLElement>(selector);
    if (target) return target;
  }

  return null;
}

function createButtonContainer(
  enabled: boolean,
  onToggle: () => void,
): HTMLDivElement {
  const container = document.createElement('div');
  container.id = BUTTON_CONTAINER_ID;

  const modeLabel = document.createElement('span');
  modeLabel.className = 'focus-mode-label';
  modeLabel.textContent = 'FOCUS MODE';

  const switchButton = document.createElement('button');
  switchButton.className = 'focus-switch';
  switchButton.type = 'button';
  switchButton.setAttribute('role', 'switch');
  switchButton.innerHTML = `
    <span class="focus-switch-track" aria-hidden="true">
      <span class="focus-switch-text">OFF</span>
      <span class="focus-switch-thumb"></span>
    </span>
  `;
  switchButton.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    onToggle();
  });

  container.append(modeLabel, switchButton);
  updateControls(container, enabled);
  return container;
}

function updateControls(container: Element | null, enabled: boolean): void {
  if (!container) return;

  container.setAttribute('data-active', String(enabled));

  const switchButton =
    container.querySelector<HTMLButtonElement>('.focus-switch');

  if (switchButton) {
    switchButton.dataset.active = String(enabled);
    switchButton.setAttribute('aria-checked', String(enabled));
    switchButton.setAttribute(
      'aria-label',
      enabled ? 'Turn Focus mode off' : 'Turn Focus mode on',
    );
    switchButton.title = enabled
      ? 'Focus mode is on — switch off'
      : 'Focus mode is off — switch on';
    const switchText = switchButton.querySelector('.focus-switch-text');
    if (switchText) switchText.textContent = enabled ? 'ON' : 'OFF';
  }
}

function pauseShortsPlayback(): void {
  if (!location.pathname.startsWith('/shorts')) return;

  document
    .querySelectorAll<HTMLMediaElement>('ytd-shorts video, ytd-shorts audio')
    .forEach((media) => media.pause());
}
