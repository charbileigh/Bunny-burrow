'use strict';

// Mobile installation is progressive: the timer also runs in an ordinary tab.
(() => {
  const installButton = document.getElementById('install-app');
  const dialog = document.getElementById('install-dialog');
  const nativeButton = document.getElementById('native-install');
  const feedback = document.getElementById('install-feedback');
  const status = document.getElementById('offline-status');
  let installPrompt = null;
  let offlineReady = false;
  const standalone = window.matchMedia('(display-mode: standalone)');
  const installed = () => standalone.matches || navigator.standalone === true;

  function updateInstallButton() {
    installButton.hidden = installed();
    nativeButton.hidden = !installPrompt || installed();
    installButton.textContent = installPrompt ? 'Install Bunny Burrow' : 'Add to your phone';
  }

  function updateOfflineStatus() {
    if (offlineReady) {
      status.textContent = navigator.onLine ? 'Ready offline' : 'You’re offline · ready to focus';
    } else {
      status.textContent = navigator.onLine ? 'Preparing offline mode…' : 'Connect once to set up offline mode';
    }
  }

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    installPrompt = event;
    updateInstallButton();
  });

  installButton.addEventListener('click', () => {
    feedback.textContent = '';
    updateInstallButton();
    dialog.showModal();
  });
  document.getElementById('close-install').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const box = dialog.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
  });

  nativeButton.addEventListener('click', async () => {
    if (!installPrompt) return;
    const prompt = installPrompt;
    installPrompt = null;
    nativeButton.disabled = true;
    try {
      await prompt.prompt();
      const result = await prompt.userChoice;
      feedback.textContent = result.outcome === 'accepted'
        ? 'Installation requested. Look for Bunny Burrow on your home screen.'
        : 'No rush. You can install later using your browser menu.';
    } catch {
      feedback.textContent = 'Use your browser menu to install or add this app to your home screen.';
    } finally {
      nativeButton.disabled = false;
      updateInstallButton();
    }
  });

  window.addEventListener('appinstalled', () => {
    installPrompt = null;
    installButton.hidden = true;
    nativeButton.hidden = true;
    feedback.textContent = 'Bunny Burrow has been installed.';
  });
  standalone.addEventListener?.('change', updateInstallButton);
  window.addEventListener('online', updateOfflineStatus);
  window.addEventListener('offline', updateOfflineStatus);
  updateInstallButton();

  if (!('serviceWorker' in navigator) || !window.isSecureContext || location.protocol === 'file:') {
    status.textContent = 'Use an HTTPS host to enable installation and offline mode';
    return;
  }

  // Relative scope also works under /repository-name/ on GitHub Pages.
  navigator.serviceWorker.register('./sw.js', { scope: './', updateViaCache: 'none' })
    .then(() => navigator.serviceWorker.ready)
    .then(() => {
      offlineReady = true;
      updateOfflineStatus();
    })
    .catch(() => {
      status.textContent = 'Offline setup unavailable. Connect and reopen to try again.';
    });
})();
