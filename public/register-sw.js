if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      registration.update().catch(() => {});
    } catch (error) {
      console.warn('Service worker registration failed:', error);
    }
  });
}
