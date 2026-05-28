/**
 * QR Code Generation Service
 */
import QRCode from 'qrcode';

export async function generateQRCode(text: string): Promise<string | null> {
  try {
    const dataUrl = await QRCode.toDataURL(text, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      margin: 2,
      width: 256,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });
    return dataUrl;
  } catch (err) {
    console.error('[QR] Failed to generate QR code:', err);
    return null;
  }
}
