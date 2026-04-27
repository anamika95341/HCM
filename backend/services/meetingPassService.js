'use strict';

/**
 * meetingPassService.js
 *
 * Generates a PDF appointment pass for a scheduled citizen–minister meeting.
 * The PDF includes:
 *   - Portal header & appointment title
 *   - Citizen photo (if available on local filesystem — stored during registration)
 *   - Citizen details (name, citizen ID, mobile, city, local MP)
 *   - Meeting details (ID, title, purpose, scheduled time/location, visitor ID, docket)
 *   - Minister name
 *   - QR code (raw text with key citizen + meeting identifiers)
 *   - Footer disclaimer & generation timestamp
 *
 * Lifecycle:
 *   - On first schedule: generates PDF → uploads to S3 → stores s3_key in meetings.pass_s3_key
 *   - On reschedule:     deletes old S3 object → generates new PDF → stores new s3_key
 *
 * S3 key pattern: meeting-passes/<meetingId>/<iso-timestamp>.pdf
 */

const fs = require('fs');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} = require('@aws-sdk/client-s3');
const pool = require('../config/database');
const { buildStorageConfig, buildS3ClientConfig } = require('./storageService');
const logger = require('../utils/logger');

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function getS3Client() {
  const config = buildStorageConfig();
  return new S3Client(buildS3ClientConfig(config));
}

function getBucket() {
  return buildStorageConfig().bucket;
}

/**
 * Reads the citizen's photo from the local filesystem.
 * photo_path is an absolute filesystem path set during citizen registration.
 * Returns null if photo_path is absent, file doesn't exist, or read fails.
 *
 * @param {string|null} photoPath - value from citizens.photo_path (absolute path)
 * @returns {Buffer|null}
 */
function fetchCitizenPhotoBuffer(photoPath) {
  if (!photoPath) return null;
  try {
    if (!fs.existsSync(photoPath)) return null;
    return fs.readFileSync(photoPath);
  } catch (err) {
    logger.warn('meetingPassService: failed to read citizen photo from disk', {
      photoPath,
      error: err.message,
    });
    return null;
  }
}

/**
 * Fetches the citizen's photo_path from the DB given citizen UUID.
 * @param {string} citizenId
 * @returns {Promise<string|null>}
 */
async function getCitizenPhotoPath(citizenId) {
  const result = await pool.query(
    'SELECT photo_path FROM citizens WHERE id = $1',
    [citizenId]
  );
  return result.rows[0]?.photo_path || null;
}

/**
 * Fetches the minister's display name from DB.
 * @param {string} ministerId
 * @returns {Promise<string>}
 */
async function getMinisterName(ministerId) {
  if (!ministerId) return 'Not Assigned';
  const result = await pool.query(
    'SELECT first_name, last_name FROM ministers WHERE id = $1',
    [ministerId]
  );
  const row = result.rows[0];
  if (!row) return 'Not Assigned';
  return [row.first_name, row.last_name].filter(Boolean).join(' ');
}

/**
 * Builds the raw QR text string.
 */
function buildQrText(meeting) {
  const name = [meeting.first_name, meeting.last_name].filter(Boolean).join(' ');
  const lines = [
    `CITIZEN NAME: ${name}`,
    `CITIZEN ID: ${meeting.citizen_code || meeting.citizenSnapshot?.citizenId || 'N/A'}`,
    `MOBILE: ${meeting.mobile_number || meeting.citizenSnapshot?.phoneNumbers?.[0] || 'N/A'}`,
    `MEETING REF: ${meeting.requestId || meeting.request_id || 'N/A'}`,
    `VISITOR ID: ${meeting.visitorId || meeting.visitor_id || 'N/A'}`,
    `DATE: ${meeting.scheduled_at ? new Date(meeting.scheduled_at).toUTCString() : 'TBD'}`,
  ];
  return lines.join('\n');
}

/**
 * Generates a QR code PNG buffer from text.
 * @param {string} text
 * @returns {Promise<Buffer>}
 */
async function generateQrBuffer(text) {
  return QRCode.toBuffer(text, {
    errorCorrectionLevel: 'M',
    type: 'png',
    width: 200,
    margin: 1,
    color: { dark: '#1a1a2e', light: '#ffffff' },
  });
}

/**
 * Formats an ISO date string to a human-readable format.
 * @param {string|Date|null} value
 * @returns {string}
 */
function formatDateTime(value) {
  if (!value) return 'Not Set';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'Not Set';
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  }) + ' IST';
}

// ---------------------------------------------------------------------------
// PDF builder
// ---------------------------------------------------------------------------

/**
 * Assembles a PDF Buffer for the appointment pass.
 *
 * @param {object} meeting     - full meeting object from mapMeeting
 * @param {string} ministerName
 * @param {Buffer|null} photoBuffer  - citizen photo or null
 * @param {Buffer} qrBuffer
 * @returns {Promise<Buffer>}
 */
async function buildPdfBuffer(meeting, ministerName, photoBuffer, qrBuffer) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      info: {
        Title: 'Meeting Appointment Pass',
        Author: 'Citizen Minister Engagement Portal',
      },
    });

    const buffers = [];
    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const margin = 50;
    const contentWidth = pageWidth - margin * 2;

    // ── Colour palette ──────────────────────────────────────────────────────
    const NAVY = '#1a237e';
    const GOLD = '#f9a825';
    const LIGHT_BLUE = '#e8eaf6';
    const DARK = '#1a1a2e';
    const GREY = '#607d8b';
    const WHITE = '#ffffff';
    const BORDER = '#c5cae9';

    // ── Header band ─────────────────────────────────────────────────────────
    doc.rect(0, 0, pageWidth, 90).fill(NAVY);

    doc
      .fillColor(WHITE)
      .font('Helvetica-Bold')
      .fontSize(20)
      .text('CITIZEN–MINISTER ENGAGEMENT PORTAL', margin, 20, { width: contentWidth, align: 'center' });

    doc
      .fillColor(GOLD)
      .font('Helvetica-Bold')
      .fontSize(13)
      .text('OFFICIAL APPOINTMENT PASS', margin, 50, { width: contentWidth, align: 'center' });

    // ── VIP badge ───────────────────────────────────────────────────────────
    if (meeting.is_vip) {
      doc
        .rect(pageWidth - 100, 10, 85, 24)
        .fill(GOLD);
      doc
        .fillColor(NAVY)
        .font('Helvetica-Bold')
        .fontSize(10)
        .text('★  VIP', pageWidth - 100, 16, { width: 85, align: 'center' });
    }

    let y = 110;

    // ── Citizen photo ────────────────────────────────────────────────────────
    const PHOTO_SIZE = 90;
    const photoX = pageWidth - margin - PHOTO_SIZE;
    const photoY = y;

    if (photoBuffer) {
      try {
        doc
          .rect(photoX - 3, photoY - 3, PHOTO_SIZE + 6, PHOTO_SIZE + 6)
          .lineWidth(2)
          .stroke(BORDER);
        doc.image(photoBuffer, photoX, photoY, { width: PHOTO_SIZE, height: PHOTO_SIZE, cover: [PHOTO_SIZE, PHOTO_SIZE] });
      } catch (_) {
        // If image format unsupported, just skip silently
      }
    }

    // ── Citizen information block ────────────────────────────────────────────
    doc
      .rect(margin, y, contentWidth, 110)
      .fill(LIGHT_BLUE);

    doc
      .fillColor(NAVY)
      .font('Helvetica-Bold')
      .fontSize(11)
      .text('CITIZEN INFORMATION', margin + 12, y + 12);

    const citizenName = [meeting.first_name, meeting.last_name].filter(Boolean).join(' ') || 'N/A';
    const citizenId = meeting.citizen_code || meeting.citizenSnapshot?.citizenId || 'N/A';
    const mobileNumber = meeting.mobile_number || meeting.citizenSnapshot?.phoneNumbers?.[0] || 'N/A';
    const district = meeting.citizenSnapshot?.district || 'N/A';
    const localMp = meeting.citizenSnapshot?.localMp || 'N/A';

    const citizenFields = [
      ['Full Name', citizenName],
      ['Citizen ID', citizenId],
      ['Mobile Number', mobileNumber],
      ['District / City', district],
      ['Local MP Constituency', localMp],
    ];

    let fieldY = y + 30;
    const labelX = margin + 12;
    const valueX = margin + 140;
    const maxValueWidth = photoX - valueX - 10;

    for (const [label, value] of citizenFields) {
      doc.fillColor(GREY).font('Helvetica').fontSize(9).text(label, labelX, fieldY);
      doc.fillColor(DARK).font('Helvetica-Bold').fontSize(9).text(String(value), valueX, fieldY, {
        width: maxValueWidth,
        ellipsis: true,
      });
      fieldY += 16;
    }

    y += 120;

    // ── Meeting details block ────────────────────────────────────────────────
    doc
      .rect(margin, y, contentWidth, 14)
      .fill(NAVY);
    doc
      .fillColor(WHITE)
      .font('Helvetica-Bold')
      .fontSize(10)
      .text('MEETING DETAILS', margin + 12, y + 2);

    y += 18;

    doc.rect(margin, y, contentWidth, 150).fill(WHITE).stroke(BORDER);

    const meetingFields = [
      ['Meeting Reference', meeting.requestId || 'N/A'],
      ['Title', meeting.title || 'N/A'],
      ['Purpose', meeting.purpose || 'N/A'],
      ['Scheduled Date & Time', formatDateTime(meeting.scheduled_at)],
      ['Meeting Ends At', formatDateTime(meeting.scheduled_end_at)],
      ['Location', meeting.scheduled_location || 'Pending'],
      ['Minister', ministerName],
    ];

    const col1X = margin + 12;
    const col2X = margin + 160;
    const col2Width = contentWidth - 170;
    let mfY = y + 12;

    for (const [label, value] of meetingFields) {
      doc.fillColor(GREY).font('Helvetica').fontSize(9).text(label, col1X, mfY);
      doc.fillColor(DARK).font('Helvetica-Bold').fontSize(9).text(String(value), col2X, mfY, {
        width: col2Width,
        lineBreak: false,
        ellipsis: true,
      });
      mfY += 18;
    }

    y += 158;

    // ── Visitor & docket IDs ─────────────────────────────────────────────────
    y += 8;
    const halfW = (contentWidth - 8) / 2;

    doc.rect(margin, y, halfW, 44).fill(LIGHT_BLUE);
    doc.fillColor(GREY).font('Helvetica').fontSize(8).text('VISITOR ID', margin + 12, y + 8);
    doc.fillColor(DARK).font('Helvetica-Bold').fontSize(13)
      .text(meeting.visitorId || meeting.visitor_id || 'PENDING', margin + 12, y + 20);

    doc.rect(margin + halfW + 8, y, halfW, 44).fill(LIGHT_BLUE);
    doc.fillColor(GREY).font('Helvetica').fontSize(8).text('DOCKET NO.', margin + halfW + 20, y + 8);
    doc.fillColor(DARK).font('Helvetica-Bold').fontSize(13)
      .text(meeting.meetingDocket || meeting.meeting_docket || 'PENDING', margin + halfW + 20, y + 20);

    y += 52;

    // ── QR Code ──────────────────────────────────────────────────────────────
    y += 12;
    const QR_SIZE = 130;
    const qrX = (pageWidth - QR_SIZE) / 2;

    doc
      .rect(qrX - 10, y - 10, QR_SIZE + 20, QR_SIZE + 50)
      .fill(WHITE)
      .stroke(BORDER);

    doc.image(qrBuffer, qrX, y, { width: QR_SIZE, height: QR_SIZE });

    doc
      .fillColor(GREY)
      .font('Helvetica')
      .fontSize(8)
      .text('Scan QR to verify citizen identity', qrX - 10, y + QR_SIZE + 8, {
        width: QR_SIZE + 20,
        align: 'center',
      });

    y += QR_SIZE + 60;

    // ── Footer ───────────────────────────────────────────────────────────────
    doc.rect(0, pageHeight - 56, pageWidth, 56).fill(NAVY);

    doc
      .fillColor(WHITE)
      .font('Helvetica')
      .fontSize(8)
      .text(
        'This pass is valid for the scheduled meeting only. Please carry a government-issued photo ID for verification.',
        margin,
        pageHeight - 46,
        { width: contentWidth, align: 'center' }
      );

    doc
      .fillColor(GOLD)
      .font('Helvetica')
      .fontSize(7)
      .text(
        `Generated: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST  |  Meeting Pass ID: ${meeting.requestId || meeting.id}`,
        margin,
        pageHeight - 26,
        { width: contentWidth, align: 'center' }
      );

    doc.end();
  });
}

// ---------------------------------------------------------------------------
// S3 upload / delete helpers
// ---------------------------------------------------------------------------

/**
 * Uploads a PDF buffer to S3.
 * @param {string} key
 * @param {Buffer} pdfBuffer
 */
async function uploadPdfToS3(key, pdfBuffer) {
  const client = getS3Client();
  const bucket = getBucket();
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: pdfBuffer,
      ContentType: 'application/pdf',
      ContentDisposition: `attachment; filename*=UTF-8''${encodeURIComponent('Meeting_Pass.pdf')}`,
    })
  );
}

/**
 * Deletes an S3 object by key. Ignores 404s (object already gone).
 * @param {string} key
 */
async function deleteS3Object(key) {
  if (!key) return;
  try {
    const client = getS3Client();
    const bucket = getBucket();
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    logger.info('meetingPassService: deleted old pass from S3', { key });
  } catch (err) {
    // Tolerate — if old key doesn't exist it's fine
    logger.warn('meetingPassService: could not delete old pass', { key, error: err.message });
  }
}

/**
 * Persists the new pass S3 key to the meetings table.
 * @param {string} meetingId
 * @param {string|null} s3Key
 */
async function storeMeetingPassKey(meetingId, s3Key) {
  await pool.query(
    'UPDATE meetings SET pass_s3_key = $2, updated_at = NOW() WHERE id = $1',
    [meetingId, s3Key]
  );
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generates and stores a meeting appointment pass PDF.
 * Called after a meeting is scheduled or rescheduled.
 * Errors are caught and logged — they must NOT propagate to fail the schedule action.
 *
 * @param {object} meeting - full meeting object (from getMeetingById / mapMeeting)
 */
async function generateMeetingPass(meeting) {
  const meetingId = meeting.id;
  const oldPassKey = meeting.pass_s3_key || null;

  try {
    logger.info('meetingPassService: generating meeting pass', { meetingId });

    const [ministerName, photoPath] = await Promise.all([
      getMinisterName(meeting.ministerId || meeting.minister_id),
      getCitizenPhotoPath(meeting.citizen_id),
    ]);

    const [photoBuffer, qrBuffer] = await Promise.all([
      fetchCitizenPhotoBuffer(photoPath),
      generateQrBuffer(buildQrText(meeting)),
    ]);

    const pdfBuffer = await buildPdfBuffer(meeting, ministerName, photoBuffer, qrBuffer);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const newKey = `meeting-passes/${meetingId}/${timestamp}.pdf`;

    // Delete old pass first (if rescheduled)
    if (oldPassKey && oldPassKey !== newKey) {
      await deleteS3Object(oldPassKey);
    }

    await uploadPdfToS3(newKey, pdfBuffer);
    await storeMeetingPassKey(meetingId, newKey);

    logger.info('meetingPassService: meeting pass generated and stored', {
      meetingId,
      s3Key: newKey,
    });
  } catch (err) {
    // Non-fatal: scheduling must not fail because of PDF generation errors
    logger.error('meetingPassService: failed to generate meeting pass', {
      meetingId,
      error: err.message,
      stack: err.stack,
    });
  }
}

/**
 * Generates a presigned download URL for the meeting pass.
 * Returns null if no pass has been generated yet.
 *
 * @param {string} meetingId
 * @param {string} citizenId - for ownership verification
 * @returns {Promise<{ downloadUrl: string, filename: string } | null>}
 */
async function getMeetingPassDownloadUrl(meetingId, citizenId) {
  const result = await pool.query(
    'SELECT pass_s3_key FROM meetings WHERE id = $1 AND citizen_id = $2',
    [meetingId, citizenId]
  );
  const row = result.rows[0];
  if (!row) {
    return null; // meeting not found or doesn't belong to this citizen
  }
  if (!row.pass_s3_key) {
    return null; // pass not generated yet
  }

  const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
  const { clampSignedUrlExpiry } = require('./storageService');
  const config = buildStorageConfig();
  const client = getS3Client();

  const command = new GetObjectCommand({
    Bucket: config.bucket,
    Key: row.pass_s3_key,
    ResponseContentDisposition: `attachment; filename*=UTF-8''${encodeURIComponent('Meeting_Pass.pdf')}`,
    ResponseContentType: 'application/pdf',
  });

  const downloadUrl = await getSignedUrl(client, command, {
    expiresIn: clampSignedUrlExpiry(config.signedUrlExpirySeconds),
  });

  return {
    downloadUrl,
    filename: 'Meeting_Pass.pdf',
  };
}

module.exports = {
  generateMeetingPass,
  getMeetingPassDownloadUrl,
};
