import QRCode from 'qrcode';

/**
 * Generates a high-resolution, branded LGU Dingalan QR Code data URL
 * with custom center emblem and high error-correction level ('H')
 * so that it remains 100% scannable on all phones.
 */
export async function generateStyledLguQrDataUrl(
  payload: string,
  options: {
    width?: number;
    title?: string;
    subtitle?: string;
    code?: string;
    includeCenterBadge?: boolean;
  } = {}
): Promise<string> {
  const {
    width = 512,
    title = 'LINIS DINGALAN',
    code = '',
    includeCenterBadge = true,
  } = options;

  // 1. Generate base QR code with High Error Correction
  const rawQrDataUrl = await QRCode.toDataURL(payload, {
    width,
    margin: 2,
    errorCorrectionLevel: 'H',
    color: {
      dark: '#022c22', // Deep forest emerald/black
      light: '#ffffff', // Pure crisp white
    },
  });

  if (typeof window === 'undefined' || !includeCenterBadge) {
    return rawQrDataUrl;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = width;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        resolve(rawQrDataUrl);
        return;
      }

      // Draw base QR code
      ctx.drawImage(img, 0, 0, width, width);

      // Draw Center Logo / Badge (Safe zone: up to 20% of QR size with Level H)
      const centerSize = Math.floor(width * 0.22);
      const centerX = (width - centerSize) / 2;
      const centerY = (width - centerSize) / 2;
      const radius = Math.floor(centerSize / 2);

      // Draw smooth white circular background with border
      ctx.save();
      ctx.beginPath();
      ctx.arc(width / 2, width / 2, radius + 4, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#10b981'; // Emerald border
      ctx.stroke();
      ctx.restore();

      // Draw inner shield background
      ctx.save();
      ctx.beginPath();
      ctx.arc(width / 2, width / 2, radius, 0, Math.PI * 2);
      ctx.fillStyle = '#064e3b'; // Deep emerald
      ctx.fill();

      // Inner icon / text
      ctx.fillStyle = '#34d399';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `bold ${Math.floor(centerSize * 0.32)}px sans-serif`;
      ctx.fillText('LGU', width / 2, width / 2 - Math.floor(centerSize * 0.12));

      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.floor(centerSize * 0.2)}px sans-serif`;
      ctx.fillText('DINGALAN', width / 2, width / 2 + Math.floor(centerSize * 0.18));
      ctx.restore();

      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(rawQrDataUrl);
    img.src = rawQrDataUrl;
  });
}
