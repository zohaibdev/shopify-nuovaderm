(function () {
  class EmailPopupController {
    constructor(popup) {
      this.popup = popup;
      this.storageKey = 'nd-email-popup-state';
      this.state = this.readState();

      if (this.state.submitted) return;

      const successMessage = popup.querySelector('[data-popup-success]');
      const errorField = popup.querySelector('[aria-invalid="true"]');

      this.bindCopyCode();

      if (successMessage) {
        this.writeState({ submitted: true });
        this.open();
        return;
      }

      const suppressDays = parseInt(popup.dataset.suppressDays || '7', 10);
      if (this.state.dismissedAt) {
        const elapsedDays = (Date.now() - this.state.dismissedAt) / 86400000;
        if (elapsedDays < suppressDays && !errorField) return;
      }

      this.bindDismiss();

      if (errorField) {
        this.open();
        return;
      }

      this.scheduleTriggers();
    }

    readState() {
      try {
        return JSON.parse(window.localStorage.getItem(this.storageKey) || '{}');
      } catch (error) {
        return {};
      }
    }

    writeState(state) {
      try {
        window.localStorage.setItem(this.storageKey, JSON.stringify(state));
      } catch (error) {
        /* localStorage unavailable; popup will simply be free to show again */
      }
    }

    open() {
      if (this.popup.hasAttribute('open')) return;
      this.popup.show();
    }

    bindDismiss() {
      const markDismissed = () => this.writeState({ dismissedAt: Date.now() });

      const closeButton = this.popup.querySelector('[id^="ModalClose-"]');
      if (closeButton) closeButton.addEventListener('click', markDismissed);

      const dismissButton = this.popup.querySelector('[data-popup-dismiss]');
      if (dismissButton) {
        dismissButton.addEventListener('click', () => {
          markDismissed();
          this.popup.hide();
        });
      }
    }

    bindCopyCode() {
      const copyButton = this.popup.querySelector('[data-copy-code]');
      if (!copyButton) return;

      const codeValue = this.popup.querySelector('[data-copy-code-value]');
      const feedback = this.popup.querySelector('[data-copy-feedback]');
      const copyLabel = copyButton.dataset.copyLabel || copyButton.textContent;
      const copiedLabel = copyButton.dataset.copiedLabel || copyLabel;

      copyButton.addEventListener('click', () => {
        const code = codeValue ? codeValue.textContent.trim() : '';
        if (!code) return;

        const showCopied = () => {
          copyButton.textContent = copiedLabel;
          if (feedback) feedback.textContent = copiedLabel;
          window.setTimeout(() => {
            copyButton.textContent = copyLabel;
          }, 2500);
        };

        if (navigator.clipboard && window.isSecureContext) {
          navigator.clipboard.writeText(code).then(showCopied).catch(() => {});
        } else {
          const helper = document.createElement('textarea');
          helper.value = code;
          helper.setAttribute('readonly', '');
          helper.style.position = 'absolute';
          helper.style.left = '-9999px';
          document.body.appendChild(helper);
          helper.select();
          try {
            document.execCommand('copy');
            showCopied();
          } catch (error) {
            /* clipboard unavailable; the code remains visible for manual copying */
          }
          document.body.removeChild(helper);
        }
      });
    }

    scheduleTriggers() {
      const clearTriggers = () => {
        if (this.delayTimer) window.clearTimeout(this.delayTimer);
        document.removeEventListener('mouseleave', this.onMouseLeave);
      };

      const trigger = () => {
        clearTriggers();
        this.open();
      };

      const delay = parseInt(this.popup.dataset.delay, 10);
      if (!Number.isNaN(delay) && delay >= 0) {
        this.delayTimer = window.setTimeout(trigger, delay);
      }

      if (this.popup.dataset.exitIntent === 'true' && window.matchMedia('(min-width: 990px)').matches) {
        this.onMouseLeave = (event) => {
          if (event.clientY <= 0) trigger();
        };
        document.addEventListener('mouseleave', this.onMouseLeave);
      }
    }
  }

  document.querySelectorAll('.email-popup').forEach((popup) => new EmailPopupController(popup));
})();
