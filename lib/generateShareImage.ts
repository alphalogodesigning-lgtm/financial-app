const HTML2CANVAS_CDN = 'https://unpkg.com/html2canvas@1.4.1/dist/html2canvas.min.js';

type Html2CanvasType = (node: HTMLElement, options?: Record<string, unknown>) => Promise<HTMLCanvasElement>;

declare global {
  interface Window {
    html2canvas?: Html2CanvasType;
    __roastlyHtml2CanvasPromise?: Promise<Html2CanvasType>;
  }
}

async function loadHtml2Canvas(): Promise<Html2CanvasType> {
  if (typeof window === 'undefined') {
    throw new Error('Share image generation is only available in the browser.');
  }

  if (window.html2canvas) {
    return window.html2canvas;
  }

  if (window.__roastlyHtml2CanvasPromise) {
    return window.__roastlyHtml2CanvasPromise;
  }

  window.__roastlyHtml2CanvasPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = HTML2CANVAS_CDN;
    script.async = true;
    script.onload = () => {
      if (window.html2canvas) {
        resolve(window.html2canvas);
      } else {
        reject(new Error('html2canvas did not initialize correctly.'));
      }
    };
    script.onerror = () => reject(new Error('Failed to load html2canvas.'));
    document.head.appendChild(script);
  });

  return window.__roastlyHtml2CanvasPromise;
}

export async function generateShareImage(elementId: string): Promise<Blob> {
  if (typeof window === 'undefined') {
    throw new Error('generateShareImage must run on the client.');
  }

  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element with id "${elementId}" not found.`);
  }

  if (document.fonts?.ready) {
    await document.fonts.ready;
  }

  const html2canvas = await loadHtml2Canvas();

  const noMotionStyle = document.createElement('style');
  noMotionStyle.textContent = '*{animation:none!important;transition:none!important;}';
  document.head.appendChild(noMotionStyle);

  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      backgroundColor: null,
      useCORS: true,
      logging: false,
      width: element.offsetWidth,
      height: element.offsetHeight
    });

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => {
        if (!result) {
          reject(new Error('Failed to convert canvas to blob.'));
          return;
        }
        resolve(result);
      }, 'image/png');
    });

    return blob;
  } finally {
    noMotionStyle.remove();
  }
}
