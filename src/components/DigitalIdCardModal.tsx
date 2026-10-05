import React, { useEffect, useState, useRef } from 'react';
import { Beneficiary } from '../types';
import { buildUniversalQrUrl } from '../utils/crypto';
import QRCode from 'qrcode';
import { generateStyledLguQrDataUrl } from '../utils/qrPassGenerator';
import { Printer, Download, X, QrCode as QrIcon, CheckCircle2, ShieldCheck, MapPin, Phone, Camera, Upload } from 'lucide-react';

interface DigitalIdCardModalProps {
  beneficiary: Beneficiary | null;
  onClose: () => void;
  onDirectScanTest?: (beneficiary: Beneficiary) => void;
  onOpenUploadAccomplishment?: (beneficiary: Beneficiary) => void;
}

export const DigitalIdCardModal: React.FC<DigitalIdCardModalProps> = ({
  beneficiary,
  onClose,
  onDirectScanTest,
  onOpenUploadAccomplishment,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [qrUniversalUrl, setQrUniversalUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!beneficiary) return;

    let isMounted = true;
    async function generateCode() {
      if (!beneficiary) return;
      const url = await buildUniversalQrUrl(beneficiary.id, beneficiary.beneCode);
      if (!isMounted) return;
      setQrUniversalUrl(url);

      try {
        const qrUrl = await generateStyledLguQrDataUrl(url, {
          width: 380,
          title: 'LINIS DINGALAN',
          code: beneficiary.beneCode,
          includeCenterBadge: true,
        });
        if (isMounted) {
          setQrDataUrl(qrUrl);
        }
      } catch (err) {
        console.error('Failed to generate QR code', err);
      }
    }

    generateCode();
    return () => {
      isMounted = false;
    };
  }, [beneficiary]);

  if (!beneficiary) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(qrUniversalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center space-x-2">
            <QrIcon className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-slate-100">
              Official Digital Beneficiary ID Card
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Card Area */}
        <div className="p-6">
          <div
            ref={cardRef}
            id="printable-id-card"
            className="w-full bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/40 border-2 border-emerald-500/40 rounded-2xl p-5 shadow-xl relative overflow-hidden text-slate-100"
          >
            {/* Top LGU Insignia Header */}
            <div className="border-b border-emerald-500/30 pb-3 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-11 h-11 rounded-full bg-emerald-600/30 border border-emerald-400/50 flex items-center justify-center text-emerald-300 font-bold text-sm tracking-tighter">
                  LGU
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                    Republic of the Philippines • Dingalan, Aurora
                  </p>
                  <h4 className="text-sm font-extrabold tracking-tight text-white uppercase">
                    Linis Dingalan Environmental Compliance
                  </h4>
                  <p className="text-[10px] text-slate-400 font-mono">
                    Joint Operation: PESO & MENRO Dingalan
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <ShieldCheck className="w-3 h-3 mr-1 text-emerald-400" /> ACTIVE
                </span>
              </div>
            </div>

            {/* Card Body */}
            <div className="mt-4 grid grid-cols-12 gap-4 items-center">
              {/* Beneficiary Photo & Details */}
              <div className="col-span-7 space-y-2">
                <div className="flex items-center space-x-3">
                  <img
                    src={beneficiary.photoUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'}
                    alt={beneficiary.firstName}
                    className="w-16 h-16 rounded-xl object-cover border-2 border-emerald-400/60 shadow-md"
                  />
                  <div>
                    <span className="text-[10px] font-mono text-emerald-400 font-bold block">
                      {beneficiary.beneCode}
                    </span>
                    <h5 className="text-base font-bold text-white leading-tight">
                      {beneficiary.firstName} {beneficiary.middleName ? `${beneficiary.middleName[0]}.` : ''} {beneficiary.lastName} {beneficiary.suffix || ''}
                    </h5>
                    <p className="text-xs text-slate-300 flex items-center mt-0.5">
                      <MapPin className="w-3 h-3 mr-1 text-emerald-400 inline" />
                      Brgy. {beneficiary.barangay}
                    </p>
                  </div>
                </div>

                <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-2.5 text-[11px] space-y-1">
                  <div>
                    <span className="text-slate-400">Assigned Cluster: </span>
                    <span className="font-semibold text-emerald-300">{beneficiary.assignedCluster}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">National/Local ID: </span>
                    <span className="font-mono text-slate-200">{beneficiary.nationalOrLocalId}</span>
                  </div>
                  <div className="flex items-center text-slate-300">
                    <Phone className="w-3 h-3 mr-1 text-slate-400" />
                    <span>Contact: {beneficiary.contactNumber}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-800">
                    Emergency: {beneficiary.emergencyContactName} ({beneficiary.emergencyContactRelation}) • {beneficiary.emergencyContactPhone}
                  </div>
                </div>
              </div>

              {/* Dynamic QR Code Card */}
              <div className="col-span-5 flex flex-col items-center justify-center p-2 bg-white rounded-xl shadow-lg border border-slate-200">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt={`QR Code for ${beneficiary.beneCode}`}
                    className="w-32 h-32 object-contain"
                  />
                ) : (
                  <div className="w-32 h-32 flex items-center justify-center bg-slate-100 rounded-lg animate-pulse text-xs text-slate-400">
                    Generating QR...
                  </div>
                )}
                <div className="mt-1 text-center">
                  <p className="text-[9px] font-mono font-bold text-slate-900 tracking-wider">
                    SCAN FOR ATTENDANCE
                  </p>
                  <p className="text-[8px] font-mono text-slate-500">
                    SIG: {beneficiary.qrHash.slice(0, 10)}...
                  </p>
                </div>
              </div>
            </div>

            {/* Security Bottom Watermark Strip */}
            <div className="mt-4 pt-2.5 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400 font-mono">
              <span>ISSUED BY PESO & MENRO DINGALAN</span>
              <span className="text-emerald-400">HMAC-SHA256 SECURED</span>
            </div>
          </div>

          {/* QR Landing Universal URL info */}
          <div className="mt-4 p-3 bg-slate-800/60 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-200">Universal Check-in Endpoint:</span>
              <button
                onClick={handleCopyLink}
                className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold"
              >
                {copied ? 'Copied to Clipboard!' : 'Copy URL'}
              </button>
            </div>
            <div className="p-2 bg-slate-950 font-mono text-[11px] text-slate-300 rounded border border-slate-800 break-all select-all">
              {qrUniversalUrl || 'Loading URL...'}
            </div>
            <p className="text-[11px] text-slate-400">
              When scanned in the field with any camera, this triggers direct beneficiary resolution and binds to the active coastal work event.
            </p>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/90 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {onOpenUploadAccomplishment && (
              <button
                onClick={() => {
                  onOpenUploadAccomplishment(beneficiary);
                  onClose();
                }}
                className="px-4 py-2.5 text-xs font-black bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 hover:from-emerald-400 hover:to-cyan-300 text-slate-950 rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.35)] flex items-center space-x-1.5 cursor-pointer transform hover:-translate-y-0.5 active:scale-95"
              >
                <Camera className="w-4 h-4 text-slate-950" />
                <span>I-scan at Mag-Upload ng Accomplishment</span>
              </button>
            )}

            {onDirectScanTest && (
              <button
                onClick={() => {
                  onDirectScanTest(beneficiary);
                  onClose();
                }}
                className="px-3.5 py-2 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-colors border border-slate-700 flex items-center"
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-cyan-400" />
                Test Scan in Field Terminal
              </button>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors border border-slate-700 flex items-center"
            >
              <Printer className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
              Print ID
            </button>
            {qrDataUrl && (
              <a
                href={qrDataUrl}
                download={`${beneficiary.beneCode}-qr.png`}
                className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors shadow flex items-center"
              >
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Download QR
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
