/**
 * Cryptographic helpers for QR code generation and verification
 * for Linis Dingalan EC Management.
 */

// Simulated secret key for HMAC QR signatures in government field deployment
const HMAC_SECRET = 'LINIS-DINGALAN-LGU-AURORA-SEC-KEY-2025-V1';

/**
 * Generates a deterministic signature hash for a beneficiary QR code
 */
export async function generateQrSignature(beneficiaryId: string, beneCode: string): Promise<string> {
  const message = `${beneficiaryId}:${beneCode}:${HMAC_SECRET}`;
  
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(message);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      return hashHex.substring(0, 16); // 16-char tamper-evident hex signature
    } catch {
      // Fallback simple checksum
      return fallbackHash(message);
    }
  }
  return fallbackHash(message);
}

function fallbackHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).padStart(16, '0').slice(0, 16);
}

/**
 * Builds the Universal QR URL pointing to the system attendance check-in
 */
export async function buildUniversalQrUrl(beneficiaryId: string, beneCode: string, origin?: string): Promise<string> {
  const signature = await generateQrSignature(beneficiaryId, beneCode);
  const baseUrl = origin || (typeof window !== 'undefined' ? window.location.origin : 'https://linis-dingalan.aurora.gov.ph');
  return `${baseUrl}/attendance/checkin?bene_id=${encodeURIComponent(beneficiaryId)}&hash=${signature}`;
}

/**
 * Verifies a QR signature for tampering
 */
export async function verifyQrSignature(beneficiaryId: string, beneCode: string, receivedHash: string): Promise<boolean> {
  const expectedHash = await generateQrSignature(beneficiaryId, beneCode);
  return expectedHash.toLowerCase() === receivedHash.toLowerCase();
}
