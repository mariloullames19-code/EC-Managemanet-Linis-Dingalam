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

  if (typeof window === 'undefined') {
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

      // Draw Center Logo / Badge (Safe zone: ~20% of QR size with Level H error correction)
      const centerSize = Math.floor(width * 0.22);
      const centerX = (width - centerSize) / 2;
      const centerY = (width - centerSize) / 2;
      const radius = Math.floor(centerSize / 2);

      // Draw smooth white circular background with outer emerald ring
      ctx.save();
      ctx.beginPath();
      ctx.arc(width / 2, width / 2, radius + 4, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = '#059669'; // Emerald ring border
      ctx.stroke();
      ctx.restore();

      // Draw inner deep emerald seal circle
      ctx.save();
      ctx.beginPath();
      ctx.arc(width / 2, width / 2, radius, 0, Math.PI * 2);
      ctx.fillStyle = '#022c22'; // Deep forest emerald
      ctx.fill();

      // Draw decorative inner gold ring
      ctx.beginPath();
      ctx.arc(width / 2, width / 2, radius - 3, 0, Math.PI * 2);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#fbbf24'; // Amber / Gold ring
      ctx.stroke();

      // Official LGU Shield Icon & Text Emblem
      ctx.fillStyle = '#34d399';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `900 ${Math.floor(centerSize * 0.32)}px system-ui, sans-serif`;
      ctx.fillText('LGU', width / 2, width / 2 - Math.floor(centerSize * 0.12));

      ctx.fillStyle = '#ffffff';
      ctx.font = `800 ${Math.floor(centerSize * 0.19)}px system-ui, sans-serif`;
      ctx.fillText('DINGALAN', width / 2, width / 2 + Math.floor(centerSize * 0.18));
      ctx.restore();

      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(rawQrDataUrl);
    img.src = rawQrDataUrl;
  });
}
