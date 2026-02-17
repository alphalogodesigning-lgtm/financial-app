(function () {
    const HTML2CANVAS_CDN = 'https://unpkg.com/html2canvas@1.4.1/dist/html2canvas.min.js';

    function loadHtml2Canvas() {
        if (window.html2canvas) return Promise.resolve(window.html2canvas);

        if (window.__roastlyHtml2CanvasPromise) {
            return window.__roastlyHtml2CanvasPromise;
        }

        window.__roastlyHtml2CanvasPromise = new Promise((resolve, reject) => {
            const existing = document.querySelector('script[data-roastly-html2canvas]');
            if (existing) {
                existing.addEventListener('load', () => resolve(window.html2canvas));
                existing.addEventListener('error', () => reject(new Error('Failed to load html2canvas')));
                return;
            }

            const script = document.createElement('script');
            script.src = HTML2CANVAS_CDN;
            script.async = true;
            script.dataset.roastlyHtml2canvas = 'true';
            script.onload = () => resolve(window.html2canvas);
            script.onerror = () => reject(new Error('Failed to load html2canvas'));
            document.head.appendChild(script);
        });

        return window.__roastlyHtml2CanvasPromise;
    }

    function stripToPunchyLine(line) {
        if (!line) return 'Reality check delivered';
        const clean = String(line).split(/[.!?]/)[0].trim();
        return clean || 'Reality check delivered';
    }

    function generateCaption(payload) {
        const severity = payload?.severityLevel || 'medium';
        const amount = Number(payload?.amount || 0);
        const runwayDays = Number(payload?.runwayDays);
        const amountText = amount > 0 ? `RM${amount.toFixed(0)}` : 'This move';
        const runwayText = Number.isFinite(runwayDays) ? `${Math.max(0, Math.floor(runwayDays))} days` : 'watch your runway';
        const punchLine = stripToPunchyLine(payload?.bodyText);

        if (severity === 'light') {
            return [
                `${amountText} move detected.`,
                `Runway: ${runwayText}.`,
                'Clean save by Roastly.',
                'Try it → roastly.my'
            ].join('\n');
        }

        if (severity === 'brutal') {
            return [
                `${amountText} move detected.`,
                `Runway: ${runwayText}.`,
                `${punchLine}.`,
                'Try it → roastly.my'
            ].join('\n');
        }

        return [
            `${amountText} move detected.`,
            `Runway: ${runwayText}.`,
            "That's tight.",
            'Try it → roastly.my'
        ].join('\n');
    }

    async function generateShareImage(elementId) {
        const element = document.getElementById(elementId);
        if (!element) {
            throw new Error('Share element not found');
        }

        if (document.fonts?.ready) {
            await document.fonts.ready;
        }

        const html2canvas = await loadHtml2Canvas();

        const motionStyle = document.createElement('style');
        motionStyle.dataset.roastlyCaptureStyle = 'true';
        motionStyle.textContent = '*{animation:none!important;transition:none!important;}';
        document.head.appendChild(motionStyle);

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

            const blob = await new Promise((resolve, reject) => {
                canvas.toBlob((result) => {
                    if (!result) {
                        reject(new Error('Failed to convert share image to blob'));
                        return;
                    }
                    resolve(result);
                }, 'image/png');
            });

            return blob;
        } finally {
            motionStyle.remove();
        }
    }

    function blobToFile(blob, filename) {
        return new File([blob], filename, { type: blob.type || 'image/png' });
    }

    window.RoastlyShareUtils = {
        generateCaption,
        generateShareImage,
        blobToFile
    };
})();
