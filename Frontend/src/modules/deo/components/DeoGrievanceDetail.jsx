import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ChevronLeft, FileText, Download, Upload, X,
  File, FileImage, FileSpreadsheet, FileJson,
  FileAudio, FileVideo, FileArchive, FileCode, FileCheck,
  Database, Presentation,
} from "lucide-react";
import { FaFilePdf } from "react-icons/fa";
import { apiClient } from "../../../shared/api/client.js";
import { openDownloadUrl } from "../../../shared/api/downloads.js";
import { sanitizeSelectedFiles } from "../../../shared/security/files.js";
import { WorkspaceButton, WorkspaceCard } from "../../../shared/components/WorkspaceUI.jsx";
import { usePortalTheme } from "../../../shared/theme/portalTheme.jsx";
import { PATHS } from "../../../routes/paths.js";

const ACCEPTED_UPLOAD_TYPES = ".pdf,.png,.jpg,.jpeg";
const FILE_UPLOAD_OPTIONS = {
  maxFiles: 2,
  maxFileSizeBytes: 10 * 1024 * 1024,
  allowedExtensions: ["pdf", "png", "jpg", "jpeg"],
  allowedMimeTypes: ["application/pdf", "image/png", "image/jpeg"],
};

function getFileIcon(fileName) {
  if (!fileName) return { icon: <File size={20} />, color: "gray" };
  const ext = fileName.split(".").pop().toLowerCase();
  if (["jpg","jpeg","png","gif","webp","svg","bmp","tiff","ico"].includes(ext))
    return { icon: <FileImage size={20} className="text-slate-600" />, color: "soft" };
  if (ext === "pdf")
    return { icon: <FaFilePdf size={20} className="text-red-500" />, color: "red" };
  if (["xls","xlsx","csv","ods"].includes(ext))
    return { icon: <FileSpreadsheet size={20} className="text-green-500" />, color: "green" };
  if (["ppt","pptx","odp","key"].includes(ext))
    return { icon: <Presentation size={20} className="text-orange-500" />, color: "orange" };
  if (["doc","docx","txt","rtf","odt"].includes(ext))
    return { icon: <FileText size={20} className="text-slate-700" />, color: "soft" };
  if (ext === "json")
    return { icon: <FileJson size={20} className="text-yellow-600" />, color: "yellow" };
  if (["js","jsx","ts","tsx","py","java","cpp","c","html","css","php","rb","go","rs"].includes(ext))
    return { icon: <FileCode size={20} className="text-purple-600" />, color: "purple" };
  if (["mp3","wav","flac","aac","m4a","ogg"].includes(ext))
    return { icon: <FileAudio size={20} className="text-pink-500" />, color: "pink" };
  if (["mp4","avi","mov","mkv","flv","wmv","webm"].includes(ext))
    return { icon: <FileVideo size={20} className="text-red-600" />, color: "red" };
  if (["zip","rar","7z","tar","gz","bz2","iso"].includes(ext))
    return { icon: <FileArchive size={20} className="text-purple-500" />, color: "purple" };
  if (["db","sqlite","sql"].includes(ext))
    return { icon: <Database size={20} className="text-slate-700" />, color: "soft" };
  if (["todo","checklist"].includes(ext))
    return { icon: <FileCheck size={20} className="text-green-600" />, color: "green" };
  return { icon: <File size={20} className="text-gray-500" />, color: "gray" };
}

function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes","KB","MB","GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

function getFileTypeLabel(fileName) {
  if (!fileName) return "Unknown";
  const ext = fileName.split(".").pop().toLowerCase();
  const map = {
    jpg: "JPEG Image", jpeg: "JPEG Image", png: "PNG Image", gif: "GIF Image",
    webp: "WebP Image", pdf: "PDF Document",
    xls: "Excel Sheet", xlsx: "Excel Workbook", csv: "CSV File",
    ppt: "PowerPoint", pptx: "PowerPoint Presentation",
    doc: "Word Document", docx: "Word Document", txt: "Text File",
    mp3: "MP3 Audio", mp4: "MP4 Video",
    zip: "ZIP Archive", rar: "RAR Archive",
  };
  return map[ext] || ext.toUpperCase() + " File";
}

function LetterheadFileCard({ file, index, onRemove, C }) {
  const { icon } = getFileIcon(file.name);
  return (
    <div
      className="flex items-center justify-between p-3 border rounded-xl"
      style={{ borderColor: `${C.purple}4D` }}
      onClick={(e) => e.preventDefault()}
    >
      <div className="flex items-center gap-3 overflow-hidden flex-1">
        <div className="p-2 rounded-lg flex-shrink-0" style={{ background: C.bgElevated, border: `1px solid ${C.borderLight}` }}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="truncate font-semibold text-sm" style={{ color: C.t1 }} title={file.name}>
            {file.name}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span style={{ background: C.bgElevated, border: `1px solid ${C.borderLight}`, padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 500, color: C.t2 }}>
              {getFileTypeLabel(file.name)}
            </span>
            <span style={{ fontSize: 11, color: C.t3 }}>{formatFileSize(file.size)}</span>
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); onRemove(index); }}
        className="p-1.5 rounded-lg ml-2 flex-shrink-0 hover:opacity-80"
        style={{ color: C.t3 }}
      >
        <X size={16} />
      </button>
    </div>
  );
}

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function formatDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  const day = String(d.getDate()).padStart(2, "0");
  const mon = MONTH_NAMES[d.getMonth()];
  const year = String(d.getFullYear()).slice(-2);
  return `${day} ${mon},${year}`;
}

function InfoField({ label, value, multiline = false }) {
  const { C } = usePortalTheme();
  return (
    <div>
      <p style={{ margin: 0, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: C.t3, marginBottom: 4 }}>
        {label}
      </p>
      <p
        style={{
          margin: 0,
          fontSize: 14,
          color: C.t1,
          fontWeight: 500,
          wordBreak: "break-word",
          whiteSpace: multiline ? "normal" : undefined,
          lineHeight: multiline ? 1.6 : 1.5,
        }}
      >
        {value || "-"}
      </p>
    </div>
  );
}

function LetterheadModal({ grievance, onClose, onSuccess, C }) {
  const OFFICE_OPTIONS = ["Delhi Office", "Jodhpur Office", "Others"];
  const [officeChoice, setOfficeChoice] = useState("");
  const [manualOffice, setManualOffice] = useState("");
  const [files, setFiles] = useState([]);
  const [fileError, setFileError] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [closeHovered, setCloseHovered] = useState(false);
  const fileInputRef = useRef(null);

  const resolvedOffice = officeChoice === "Others" ? manualOffice.trim() : officeChoice;

  function handleFileSelect(fileList) {
    const remaining = Math.max(0, 2 - files.length);
    if (remaining === 0) { setFileError("You can upload a maximum of 2 files."); return; }
    const { acceptedFiles, rejectedFiles } = sanitizeSelectedFiles(fileList, FILE_UPLOAD_OPTIONS);
    const toAdd = acceptedFiles.slice(0, remaining);
    if (rejectedFiles.length > 0) {
      setFileError("Some files were rejected. Allowed: PDF, PNG, JPG, JPEG. Max 10 MB each.");
    } else if (acceptedFiles.length > remaining) {
      setFileError(`Only ${toAdd.length} file(s) added. Maximum 2 files allowed.`);
    } else {
      setFileError("");
    }
    setFiles((prev) => [...prev, ...toAdd]);
  }

  function removeFile(index) {
    setFileError("");
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!officeChoice) { setError("Please select an office"); return; }
    if (officeChoice === "Others" && !manualOffice.trim()) { setError("Please enter the office name"); return; }
    if (!files.length) { setError("Please upload at least one letterhead file"); return; }

    setLoading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("office", resolvedOffice);
      for (const file of files) formData.append("file", file);
      await apiClient.patch(`/grievances/${grievance.id}/deo-letterhead`, formData);
      onSuccess();
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to submit letterhead");
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    width: "100%", minHeight: 38, padding: "8px 12px",
    border: `1px solid ${C.border}`, borderRadius: 8,
    background: C.inp, color: C.t1, fontSize: 13, outline: "none", boxSizing: "border-box",
  };

  const labelStyle = { display: "block", fontSize: 12, fontWeight: 600, color: C.t2, marginBottom: 6 };

  return (
    <div
      style={{
        position: "fixed", top: 0, left: "var(--portal-sidebar-width, 0px)", right: 0, bottom: 0,
        zIndex: 1000, background: "rgba(0,0,0,0.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: C.card, border: `1px solid ${C.border}`,
          borderRadius: 16, minWidth: 460, maxWidth: 560, width: "90%",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 20px 10px", borderBottom: `1px solid ${C.border}`,
        }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: C.t1 }}>Letter Head / Office</h2>
          <button
            type="button"
            onClick={onClose}
            onMouseEnter={() => setCloseHovered(true)}
            onMouseLeave={() => setCloseHovered(false)}
            aria-label="Close"
            style={{
              width: 32, height: 32, borderRadius: "50%", border: "none", cursor: "pointer",
              background: closeHovered ? "#ef4444" : "transparent",
              color: closeHovered ? "#ffffff" : C.t3,
              fontSize: 20, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, transition: "background 0.15s ease, color 0.15s ease",
            }}
          >×</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 24, display: "grid", gap: 16 }}>
          {/* Office */}
          <div>
            <label style={labelStyle}>Select Office *</label>
            <select
              value={officeChoice}
              onChange={(e) => { setOfficeChoice(e.target.value); setManualOffice(""); }}
              style={{ ...inputStyle, cursor: "pointer", appearance: "auto" }}
            >
              <option value="">-- Select Office --</option>
              {OFFICE_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>

          {officeChoice === "Others" && (
            <div>
              <label style={labelStyle}>Office Name *</label>
              <input
                type="text"
                value={manualOffice}
                onChange={(e) => setManualOffice(e.target.value)}
                placeholder="Enter office name"
                style={inputStyle}
              />
            </div>
          )}

          {/* Letterhead file upload — same UI as citizen grievance */}
          <div>
            <label style={labelStyle}>Letterhead (Signature / Logo) * — max 2 files</label>
            {fileError && (
              <p style={{ color: "#ef4444", fontSize: 12, marginBottom: 6, fontWeight: 500 }}>{fileError}</p>
            )}
            <div
              className="border-2 border-dashed rounded-xl p-5 transition-colors"
              style={{ borderColor: C.border, background: C.bgElevated }}
            >
              <div
                className="flex items-center gap-4 cursor-pointer"
                onClick={() => {
                  if (files.length >= 2) { setFileError("You can upload a maximum of 2 files."); return; }
                  setFileError("");
                  fileInputRef.current?.click();
                }}
              >
                <div
                  className="h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: C.card, border: `1px solid ${C.border}` }}
                >
                  <Upload size={20} style={{ color: C.t3 }} />
                </div>
                <div className="flex-1">
                  <div style={{ fontWeight: 600, fontSize: 13, color: files.length > 0 ? C.t1 : C.t3 }}>
                    {files.length > 0
                      ? `${files.length} / 2 file(s) selected`
                      : "Click to upload or drag and drop"}
                  </div>
                  <p style={{ fontSize: 12, color: C.t3, marginTop: 3 }}>PDF, PNG, JPG · Max 10 MB each</p>
                </div>
              </div>

              {files.length > 0 && (
                <div className="mt-3 space-y-2">
                  {files.map((file, i) => (
                    <LetterheadFileCard key={i} file={file} index={i} onRemove={removeFile} C={C} />
                  ))}
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={ACCEPTED_UPLOAD_TYPES}
                style={{ display: "none" }}
                onChange={(e) => { handleFileSelect(e.target.files); e.target.value = ""; }}
              />
            </div>
          </div>

          {error && (
            <p style={{ margin: 0, fontSize: 12, color: "#ef4444" }}>{error}</p>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <WorkspaceButton type="button" variant="ghost" onClick={onClose} disabled={loading}>
              Cancel
            </WorkspaceButton>
            <WorkspaceButton type="submit" disabled={loading}>
              {loading ? "Submitting…" : "Submit"}
            </WorkspaceButton>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function DeoGrievanceDetail() {
  const { C } = usePortalTheme();
  const navigate = useNavigate();
  const { state } = useLocation();
  const grievance = state?.grievance;

  const [showLetterhead, setShowLetterhead] = useState(false);
  const [done, setDone] = useState(false);
  const [isBackHovered, setIsBackHovered] = useState(false);
  const [files, setFiles] = useState([]);

  useEffect(() => {
    let mounted = true;
    const gid = grievance?.id || grievance?._id;
    if (!gid) return undefined;
    (async () => {
      try {
        const { data } = await apiClient.get(`/deo/grievances/${gid}`);
        if (mounted) {
          setFiles(Array.isArray(data.grievance?.files) ? data.grievance.files : []);
        }
      } catch (_) {
        if (mounted) setFiles([]);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [grievance?.id, grievance?._id]);

  if (!grievance) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <p style={{ color: C.t2, marginBottom: 20 }}>Grievance not found.</p>
        <WorkspaceButton onClick={() => navigate(PATHS.deo.grievances)}>
          Back to Grievances
        </WorkspaceButton>
      </div>
    );
  }

  if (done) {
    return (
      <div
        style={{
          height: "calc(100vh - 73px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "20px",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: 440 }}>
          <div style={{ fontSize: 44, marginBottom: 14, color: C.mint }}>✓</div>
          <p style={{ fontSize: 18, fontWeight: 600, color: C.t1, marginBottom: 8 }}>
            Letterhead submitted successfully
          </p>
          <p style={{ fontSize: 13, color: C.t2, marginBottom: 28, lineHeight: 1.6 }}>
            The grievance has been moved to admin (Mahendra Pratap Singh) for further processing.
          </p>
          <WorkspaceButton onClick={() => navigate(PATHS.deo.grievances)}>
            Back to Grievances
          </WorkspaceButton>
        </div>
      </div>
    );
  }

  const citizenName = grievance.citizenSnapshot?.name || "-";
  const citizenId = grievance.citizenSnapshot?.citizenId || "-";

  return (
    <div style={{ padding: "20px 24px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", marginBottom: 24 }}>
        <div style={{ justifySelf: "start" }}>
          <button
            type="button"
            onMouseEnter={() => setIsBackHovered(true)}
            onMouseLeave={() => setIsBackHovered(false)}
            onClick={() => navigate(PATHS.deo.grievances)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              border: `1px solid ${C.purple}`,
              background: isBackHovered ? C.purple : "transparent",
              color: isBackHovered ? "#ffffff" : C.purple,
              fontSize: 13, padding: "8px 8px", borderRadius: 10,
              cursor: "pointer", whiteSpace: "nowrap",
              transition: "background 0.15s ease, color 0.15s ease",
            }}
          >
            <ChevronLeft size={16} /> Back
          </button>
        </div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, color: C.t1, textAlign: "center" }}>
          Grievance Details
        </h1>
        <div style={{ justifySelf: "end" }}>
          <WorkspaceButton
            type="button"
            onClick={() => setShowLetterhead(true)}
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <FileText size={16} /> Letter Head / Office
          </WorkspaceButton>
        </div>
      </div>

      <WorkspaceCard style={{ marginBottom: 20 }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 13, fontWeight: 600, color: C.t3, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Grievance Information
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 20, marginBottom: 16 }}>
          <InfoField label="Grievance ID" value={grievance.grievanceId} />
          <InfoField label="Citizen ID" value={citizenId} />
          <InfoField label="Citizen Name" value={citizenName} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <InfoField label="Title" value={grievance.subject} multiline />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 20, marginBottom: 16 }}>
          <InfoField label="State" value={grievance.state} />
          <InfoField label="District" value={grievance.district} />
          <InfoField label="Date" value={formatDate(grievance.incidentDate || grievance.incident_date)} />
        </div>
        <InfoField label="Description" value={grievance.description} multiline />
      </WorkspaceCard>

      <WorkspaceCard>
        <h3 style={{ margin: "0 0 16px", fontSize: 13, fontWeight: 600, color: C.t3, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Documents
        </h3>
        {files.length === 0 ? (
          <p style={{ margin: 0, fontSize: 14, color: C.t2, fontWeight: 500 }}>No documents uploaded</p>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {files.map((file) => (
              <div
                key={file.id || file.downloadUrl || file.name}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", padding: "10px 14px", border: `1px solid ${C.border}`, borderRadius: 10, background: C.bgElevated }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <FileText size={16} color={C.purple} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: C.t1, wordBreak: "break-word" }}>{file.name}</div>
                    <div style={{ fontSize: 11, color: C.t3, marginTop: 2 }}>{file.mimeType || "Document"}</div>
                  </div>
                </div>
                <WorkspaceButton
                  type="button"
                  variant="outline"
                  onClick={() => openDownloadUrl(file.downloadUrl)}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  <Download size={14} /> Download
                </WorkspaceButton>
              </div>
            ))}
          </div>
        )}
      </WorkspaceCard>

      {showLetterhead && (
        <LetterheadModal
          grievance={grievance}
          C={C}
          onClose={() => setShowLetterhead(false)}
          onSuccess={() => {
            setShowLetterhead(false);
            setDone(true);
          }}
        />
      )}
    </div>
  );
}
