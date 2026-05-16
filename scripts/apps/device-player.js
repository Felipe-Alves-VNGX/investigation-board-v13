import { MODULE_ID, DEVICE_TYPES, DEVICE_APPS } from '../config.js';

const ApplicationV2 = foundry.applications.api.ApplicationV2;
const HandlebarsApplicationMixin =
  foundry.applications.api.HandlebarsApplicationMixin;

/**
 * Interactive device window for "device" type notes.
 * Simulates a smartphone, tablet, or laptop screen with navigable apps
 * (SMS, Gallery, Notes, Email). One singleton per drawing document.
 * id: "device-player-{drawingId}"
 */
export class DevicePlayer extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor(document, options = {}) {
    options.id = `device-player-${document.id}`;
    super(options);
    this.document = document;

    // Navigation state (not persisted)
    this._currentApp = null;   // null = home screen
    this._galleryIndex = 0;
  }

  static DEFAULT_OPTIONS = {
    tag: 'div',
    classes: ['ib-device-player'],
    window: {
      title: 'Device',
      resizable: false,
      minimizable: true,
      icon: 'fas fa-mobile-alt',
    },
    position: {
      width: 380,
      height: 700,
    },
  };

  static PARTS = {
    content: {
      template: 'modules/investigation-board/templates/device-player.html',
    },
  };

  /** Returns the running DevicePlayer for the given drawingId, if open. */
  static getPlayer(drawingId) {
    return foundry.applications.instances.get(`device-player-${drawingId}`);
  }

  async _prepareContext(options) {
    const noteData = this.document.flags[MODULE_ID] || {};
    const deviceType = noteData.deviceType || 'smartphone';
    const deviceTypeDef = DEVICE_TYPES[deviceType] ?? DEVICE_TYPES.smartphone;
    const rawApps = noteData.deviceApps || {};

    // Build default structure merged with stored data
    const defaultApps = {
      sms:     { enabled: false, contactName: 'Desconhecido', messages: [] },
      gallery: { enabled: false, images: [] },
      notes:   { enabled: false, content: '' },
      email:   { enabled: false, from: '', subject: '', date: '', body: '' },
    };
    const deviceApps = foundry.utils.mergeObject(defaultApps, rawApps, { inplace: false });

    // Build list of enabled apps for the home screen
    const enabledApps = Object.entries(DEVICE_APPS)
      .filter(([key]) => deviceApps[key]?.enabled)
      .map(([key, def]) => ({ key, label: def.label, icon: def.icon }));

    // Current app data for rendering
    const currentApp = this._currentApp;
    let appTitle = '';
    let appData = null;

    if (currentApp && DEVICE_APPS[currentApp]) {
      appTitle = DEVICE_APPS[currentApp].label;
      appData = deviceApps[currentApp];
    }

    // Prepare gallery state
    const galleryImages = deviceApps.gallery?.images ?? [];
    const galleryIndex = Math.max(0, Math.min(this._galleryIndex, galleryImages.length - 1));
    const galleryCurrentImage = galleryImages[galleryIndex] ?? null;
    const galleryHasPrev = galleryIndex > 0;
    const galleryHasNext = galleryIndex < galleryImages.length - 1;

    return {
      deviceType,
      deviceTypeDef,
      deviceApps,
      enabledApps,
      currentApp,
      appTitle,
      appData,
      galleryImages,
      galleryIndex,
      galleryIndexDisplay: galleryIndex + 1,
      galleryCurrentImage,
      galleryHasPrev,
      galleryHasNext,
      title: noteData.text || deviceTypeDef.label,
      isGM: game.user.isGM,
    };
  }

  _onRender(context, options) {
    super._onRender?.(context, options);

    // Resize window to match device type
    const def = context.deviceTypeDef;
    this.setPosition({ width: def.windowWidth, height: def.windowHeight });

    // Wire home screen app icons
    this.element.querySelectorAll('.ib-app-icon[data-app]').forEach(el => {
      el.addEventListener('click', () => this._navigateTo(el.dataset.app));
    });

    // Wire back button
    const backBtn = this.element.querySelector('.ib-back-btn');
    if (backBtn) {
      backBtn.addEventListener('click', () => this._navigateTo(null));
    }

    // Wire gallery navigation
    const prevBtn = this.element.querySelector('.ib-gallery-nav.prev');
    const nextBtn = this.element.querySelector('.ib-gallery-nav.next');
    if (prevBtn) prevBtn.addEventListener('click', () => this._galleryNavigate(-1));
    if (nextBtn) nextBtn.addEventListener('click', () => this._galleryNavigate(1));

    // Scroll SMS messages to bottom so the latest message is visible
    const smsMessages = this.element.querySelector('.ib-sms-messages');
    if (smsMessages) smsMessages.scrollTop = smsMessages.scrollHeight;
  }

  /** Navigate to an app screen or back to home (null). */
  _navigateTo(app) {
    this._currentApp = app ?? null;
    if (app === 'gallery') {
      // Reset to first image when entering gallery
      this._galleryIndex = 0;
    }
    this.render({ force: true });
  }

  /** Move gallery index by delta, clamped to valid range. */
  _galleryNavigate(delta) {
    const noteData = this.document.flags[MODULE_ID] || {};
    const images = noteData.deviceApps?.gallery?.images ?? [];
    this._galleryIndex = Math.max(0, Math.min(this._galleryIndex + delta, images.length - 1));
    this.render({ force: true });
  }
}
