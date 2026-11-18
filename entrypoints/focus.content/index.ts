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

      const button = document.querySelector<HTMLButtonElement>(
        `#${BUTTON_CONTAINER_ID} button`,
      );
      updateButton(button, enabled);
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
      const existingContainer = document.getElementById(BUTTON_CONTAINER_ID);
      if (existingContainer?.isConnected) {
        updateButton(
          existingContainer.querySelector('button'),
          focusEnabled,
        );
        return;
      }

      const target = findTopBarTarget();
      if (!target) return;

      const container = createButtonContainer(focusEnabled, () => {
        void toggleFocus();
      });
      const notificationButton = target.querySelector(
        'ytd-notification-topbar-button-renderer, yt-notification-topbar-button-renderer',
      );

      target.insertBefore(container, notificationButton ?? target.firstChild);
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

  const button = document.createElement('button');
  button.type = 'button';
  button.innerHTML = `
    <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20">
      <path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3" />
      <circle cx="12" cy="12" r="3" />
    </svg>
    <span>Focus</span>
  `;
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    onToggle();
  });

  updateButton(button, enabled);
  container.append(button);
  return container;
}

function updateButton(
  button: HTMLButtonElement | null,
  enabled: boolean,
): void {
  if (!button) return;

  button.dataset.active = String(enabled);
  button.setAttribute('aria-pressed', String(enabled));
  button.setAttribute(
    'aria-label',
    enabled ? 'Turn Focus mode off' : 'Turn Focus mode on',
  );
  button.title = enabled ? 'Focus mode is on' : 'Focus mode is off';
}
