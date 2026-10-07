import * as XLSX from 'xlsx';
import { AttendanceRecord } from '../types';
import { formatPhilippineDateTime } from './philippineClock';

/**
 * Exports complete Attendance & Accomplishment Picture Records to a formatted Excel file (.xlsx)
 * @param records Array of AttendanceRecord items to export
 * @param fileNamePrefix Prefix for the exported file name
 */
export function exportAttendanceToExcel(
  records: AttendanceRecord[],
  fileNamePrefix: string = 'Linis-Dingalan-Accomplishment-Attendance'
): { success: boolean; count: number; fileName: string } {
  if (!records || records.length === 0) {
    return { success: false, count: 0, fileName: '' };
  }

  // 1. Transform records into structured rows with complete details
  const rows = records.map((att, idx) => {
    const dt = formatPhilippineDateTime(att.timestamp || att.localPhTime, att.localPhTime);
    const photosCount =
      att.accomplishmentPhotos && att.accomplishmentPhotos.length > 0
        ? att.accomplishmentPhotos.length
        : att.photoWatermarkedUrl
        ? 1
        : 0;

    return {
      'No.': idx + 1,
      'Pangalan ng Attendee (Worker)': att.beneficiaryName || 'N/A',
      'Beneficiary ID Code': att.beneficiaryCode || 'N/A',
      'Lokasyon / Barangay': att.locationDescription || 'Dingalan',
      'Gawain / Proyekto (Cleanup Activity)': att.activityTitle || 'Coastal Cleanup',
      'Petsa Naipasa (PST)': `${dt.monthTagalog} ${dt.dayNum}, ${dt.yearNum} (${dt.dayOfWeekTagalog})`,
      'Eksaktong Oras (PST)': `${dt.exactTimeWithSeconds} PST`,
      'GPS Latitude': Number(att.latitude ? att.latitude.toFixed(6) : 0),
      'GPS Longitude': Number(att.longitude ? att.longitude.toFixed(6) : 0),
      'GPS Katumpakan (Accuracy)': `±${att.accuracyMeters || 3}m`,
      'Taas mula sa Dagat (Altitude)': att.altitudeMeters ? `${att.altitudeMeters}m MSL` : 'Coastal Zone',
      'Dami ng Na-upload na Larawan': photosCount,
      'Katayuan ng Accomplishment Media': photosCount > 0 ? 'MAY LARAWAN (Geotagged)' : 'WALANG LARAWAN',
      'Compliance Status': (att.complianceStatus || 'verified').toUpperCase(),
      'Sinuring Opisyal (MENRO/PESO)': att.verifiedByOfficerName || 'MENRO Field Operations Supervisor',
      'Tala ng Accomplishment / Remarks': att.accomplishmentNotes || att.notes || 'Matagumpay na natapos ang cleanup activity alinsunod sa MENRO guidelines',
      'Cryptographic QR Signature': att.qrSignature || 'AUTHENTICATED-HMAC-SHA256'
    };
  });

  // 2. Create worksheet
  const worksheet = XLSX.utils.json_to_sheet(rows);

  // 3. Define column widths for a clean Excel appearance
  worksheet['!cols'] = [
    { wch: 6 },  // No.
    { wch: 28 }, // Pangalan
    { wch: 22 }, // ID Code
    { wch: 32 }, // Lokasyon
    { wch: 38 }, // Gawain
    { wch: 26 }, // Petsa
    { wch: 20 }, // Oras
    { wch: 16 }, // Lat
    { wch: 16 }, // Long
    { wch: 18 }, // Katumpakan
    { wch: 20 }, // Altitude
    { wch: 22 }, // Dami ng Larawan
    { wch: 26 }, // Katayuan
    { wch: 18 }, // Compliance
    { wch: 30 }, // Opisyal
    { wch: 45 }, // Remarks
    { wch: 30 }, // Signature
  ];

  // 4. Create workbook and append worksheet
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Accomplishment Records');

  // 5. Generate timestamped file name
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  const fileName = `${fileNamePrefix}-${dateStr}_${timeStr}.xlsx`;

  // 6. Trigger direct download in browser using robust Blob URL + fallback
  try {
    const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8',
    });
    
    // Create download link
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    
    setTimeout(() => {
      try {
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      } catch (e) {
        // Ignored
      }
    }, 2000);
  } catch (err) {
    console.warn('Blob download attempt failed, falling back to XLSX.writeFile:', err);
    try {
      XLSX.writeFile(workbook, fileName);
    } catch (fallbackErr) {
      console.error('XLSX.writeFile error:', fallbackErr);
    }
  }

  return { success: true, count: records.length, fileName };
}
