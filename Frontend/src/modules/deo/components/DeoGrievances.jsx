import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Eye, Plus, Search, ChevronLeft, ChevronRight, Upload, X,
  File, FileText, FileImage, FileSpreadsheet, FileJson,
  FileAudio, FileVideo, FileArchive, FileCode, FileCheck,
  Database, Presentation,
} from "lucide-react";
import { FaFilePdf } from "react-icons/fa";
import { apiClient } from "../../../shared/api/client.js";
import { sanitizeSelectedFiles } from "../../../shared/security/files.js";
import { useAuth } from "../../../shared/auth/AuthContext.jsx";
import {
  WorkspaceButton,
  WorkspaceEmptyState,
  WorkspaceInput,
} from "../../../shared/components/WorkspaceUI.jsx";
import CustomDateFilter from "../../../shared/components/CustomDateFilter.jsx";
import { usePortalTheme } from "../../../shared/theme/portalTheme.jsx";
import { PATHS } from "../../../routes/paths.js";

const ACCEPTED_UPLOAD_TYPES = ".pdf,.png,.jpg,.jpeg,.webp,.xls,.xlsx,.doc,.docx,.txt";
const FILE_UPLOAD_OPTIONS = { maxFiles: 5, maxFileSizeBytes: 10 * 1024 * 1024 };

function getFileIcon(fileName) {
  if (!fileName) return { icon: <File size={20} />, color: "gray" };
  const ext = fileName.split(".").pop().toLowerCase();
  if (["jpg","jpeg","png","gif","webp","svg","bmp","tiff","ico"].includes(ext))
    return { icon: <FileImage size={20} className="text-slate-600" />, color: "soft" };
  if (ext === "pdf")
    return { icon: <FaFilePdf size={20} className="text-red-500" />, color: "red" };
  if (["xls","xlsx","csv","tsv","ods"].includes(ext))
    return { icon: <FileSpreadsheet size={20} className="text-green-500" />, color: "green" };
  if (["ppt","pptx","odp","key"].includes(ext))
    return { icon: <Presentation size={20} className="text-orange-500" />, color: "orange" };
  if (["doc","docx","txt","rtf","odt","pages"].includes(ext))
    return { icon: <FileText size={20} className="text-slate-700" />, color: "soft" };
  if (ext === "json")
    return { icon: <FileJson size={20} className="text-yellow-600" />, color: "yellow" };
  if (["js","jsx","ts","tsx","py","java","cpp","c","html","css","php","rb","go","rs"].includes(ext))
    return { icon: <FileCode size={20} className="text-purple-600" />, color: "purple" };
  if (["mp3","wav","flac","aac","m4a","ogg","wma"].includes(ext))
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
    webp: "WebP Image", svg: "SVG Image", pdf: "PDF Document",
    xls: "Excel Sheet", xlsx: "Excel Workbook", csv: "CSV File",
    ppt: "PowerPoint", pptx: "PowerPoint Presentation",
    doc: "Word Document", docx: "Word Document", txt: "Text File",
    json: "JSON File", mp3: "MP3 Audio", mp4: "MP4 Video",
    zip: "ZIP Archive", rar: "RAR Archive",
  };
  return map[ext] || ext.toUpperCase() + " File";
}

function FileCard({ file, index, onRemove, C }) {
  const { icon } = getFileIcon(file.name);
  return (
    <div
      className="flex items-center justify-between p-3 border rounded-xl transition-opacity duration-200 hover:opacity-95"
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

function FileUploadArea({ label, required, files, onFiles, onRemove, maxFiles, fileError, setFileError, C }) {
  const inputRef = useRef(null);

  function handleSelect(fileList) {
    const remaining = Math.max(0, maxFiles - files.length);
    if (remaining === 0) {
      setFileError(`You can upload a maximum of ${maxFiles} file(s).`);
      return;
    }
    const { acceptedFiles, rejectedFiles } = sanitizeSelectedFiles(fileList, { ...FILE_UPLOAD_OPTIONS, maxFiles });
    const toAdd = acceptedFiles.slice(0, remaining);
    if (rejectedFiles.length > 0) {
      setFileError("Some files were rejected. Allowed: PDF, PNG, JPG, WEBP, XLS, XLSX, DOC, DOCX, TXT. Max 10 MB each.");
    } else if (acceptedFiles.length > remaining) {
      setFileError(`Only ${toAdd.length} file(s) added. Maximum ${maxFiles} files allowed.`);
    } else {
      setFileError("");
    }
    onFiles(toAdd);
  }

  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
        {label}{required && <span style={{ color: "#ef4444", marginLeft: 2 }}>*</span>}
      </label>
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
            if (files.length >= maxFiles) {
              setFileError(`You can upload a maximum of ${maxFiles} file(s).`);
              return;
            }
            setFileError("");
            inputRef.current?.click();
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
                ? `${files.length} / ${maxFiles} file(s) selected`
                : "Click to upload or drag and drop"}
            </div>
            <p style={{ fontSize: 12, color: C.t3, marginTop: 3 }}>PDF, images, or office documents · Max 10 MB each</p>
          </div>
        </div>

        {files.length > 0 && (
          <div className="mt-3 space-y-2">
            {files.map((file, i) => (
              <FileCard key={i} file={file} index={i} onRemove={onRemove} C={C} />
            ))}
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED_UPLOAD_TYPES}
          style={{ display: "none" }}
          onChange={(e) => { handleSelect(e.target.files); e.target.value = ""; }}
        />
      </div>
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

function toYmd(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const tableCellTextStyle = {
  display: "block",
  maxWidth: "100%",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const OFFICE_OPTIONS = ["Delhi Office", "Jodhpur Office", "Others"];

function FormField({ label, required, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
        {label}{required && <span style={{ color: "#ef4444", marginLeft: 2 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

function AddGrievanceModal({ onClose, onSuccess, C }) {
  const [form, setForm] = useState({
    citizenName: "",
    mobileNumber: "",
    subject: "",
    description: "",
    state: "",
    district: "",
    incidentDate: "",
    officeChoice: "",
    manualOffice: "",
  });
  const [documentFiles, setDocumentFiles] = useState([]);
  const [letterheadFiles, setLetterheadFiles] = useState([]);
  const [docFileError, setDocFileError] = useState("");
  const [letterheadFileError, setLetterheadFileError] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [closeHovered, setCloseHovered] = useState(false);

  const resolvedOffice = form.officeChoice === "Others" ? form.manualOffice.trim() : form.officeChoice;

  function set(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!form.citizenName.trim()) { setError("Citizen name is required"); return; }
    if (!form.subject.trim()) { setError("Grievance title is required"); return; }
    if (!form.description.trim()) { setError("Description is required"); return; }
    if (!form.state.trim()) { setError("State is required"); return; }
    if (!form.district.trim()) { setError("District is required"); return; }
    if (!form.officeChoice) { setError("Please select an office"); return; }
    if (form.officeChoice === "Others" && !form.manualOffice.trim()) { setError("Please enter the office name"); return; }
    if (letterheadFiles.length === 0) { setError("At least one letterhead file is required"); return; }

    setLoading(true);
    try {
      const formData = new FormData();
      if (form.citizenName.trim()) formData.append("citizenName", form.citizenName.trim());
      formData.append("mobileNumber", form.mobileNumber.trim());
      formData.append("subject", form.subject.trim());
      formData.append("description", form.description.trim());
      formData.append("state", form.state.trim());
      formData.append("district", form.district.trim());
      formData.append("office", resolvedOffice);
      if (form.incidentDate) formData.append("incidentDate", form.incidentDate);
      for (const file of documentFiles) formData.append("document", file);
      for (const file of letterheadFiles) formData.append("letterhead", file);

      await apiClient.post("/deo/grievances", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onSuccess();
    } catch (err) {
      setError(err?.response?.data?.error || err?.response?.data?.message || "Failed to submit grievance");
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    width: "100%", minHeight: 36, padding: "7px 12px",
    border: `1px solid ${C.border}`, borderRadius: 8,
    background: C.inp, color: C.t1, fontSize: 13, outline: "none",
    boxSizing: "border-box",
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: "var(--portal-sidebar-width, 0px)",
        right: 0,
        bottom: 0,
        zIndex: 1000,
        background: "rgba(0,0,0,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "16px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: C.card, border: `1px solid ${C.border}`,
          borderRadius: 16, width: "100%", maxWidth: 820,
          maxHeight: "92vh", overflowY: "auto",
          position: "relative",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky header */}
        <div style={{
          padding: "20px 28px 14px",
          position: "sticky", top: 0, background: C.card, zIndex: 1,
          borderBottom: `1px solid ${C.border}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: C.t1 }}>Add Grievance</h2>
            <p style={{ margin: "3px 0 0", fontSize: 12, color: C.t2 }}>Submit a grievance on behalf of a citizen</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            onMouseEnter={() => setCloseHovered(true)}
            onMouseLeave={() => setCloseHovered(false)}
            aria-label="Close"
            style={{
              width: 32, height: 32, borderRadius: "50%",
              border: "none", cursor: "pointer",
              background: closeHovered ? "#ef4444" : "transparent",
              color: closeHovered ? "#ffffff" : C.t3,
              fontSize: 20, lineHeight: 1,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
              transition: "background 0.15s ease, color 0.15s ease",
            }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: "22px 28px 26px" }}>

          {/* Row 1: Citizen Name + Phone */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <FormField label="Citizen Name" required>
              <input
                type="text"
                value={form.citizenName}
                onChange={set("citizenName")}
                placeholder="Enter citizen's full name"
                style={inputStyle}
              />
            </FormField>
            <FormField label="Citizen Phone Number">
              <input
                type="text"
                value={form.mobileNumber}
                onChange={set("mobileNumber")}
                placeholder="Contact number (optional)"
                style={inputStyle}
              />
            </FormField>
          </div>

          {/* Row 2: Grievance Title */}
          <FormField label="Grievance Title" required>
            <input
              type="text"
              value={form.subject}
              onChange={set("subject")}
              placeholder="Brief title of the grievance"
              style={inputStyle}
            />
          </FormField>

          {/* Row 3: Grievance Description */}
          <FormField label="Grievance Description" required>
            <textarea
              value={form.description}
              onChange={set("description")}
              placeholder="Detailed description of the grievance"
              rows={3}
              style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5, minHeight: 80 }}
            />
          </FormField>

          {/* Row 4: State + District + Date */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 0 }}>
            <FormField label="State" required>
              <input
                type="text"
                value={form.state}
                onChange={set("state")}
                placeholder="State"
                style={inputStyle}
              />
            </FormField>
            <FormField label="District" required>
              <input
                type="text"
                value={form.district}
                onChange={set("district")}
                placeholder="District"
                style={inputStyle}
              />
            </FormField>
            <FormField label="Date">
              <CustomDateFilter
                value={form.incidentDate}
                onChange={(v) => setForm((prev) => ({ ...prev, incidentDate: v }))}
                placeholder="Date"
                max={new Date().toISOString().split("T")[0]}
              />
            </FormField>
          </div>

          {/* Row 5: Office */}
          <FormField label="Office" required>
            <select
              value={form.officeChoice}
              onChange={(e) => setForm((prev) => ({ ...prev, officeChoice: e.target.value, manualOffice: "" }))}
              style={{ ...inputStyle, cursor: "pointer", appearance: "auto" }}
            >
              <option value="">-- Select Office --</option>
              {OFFICE_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </FormField>

          {form.officeChoice === "Others" && (
            <FormField label="Office Name" required>
              <input
                type="text"
                value={form.manualOffice}
                onChange={set("manualOffice")}
                placeholder="Enter office name"
                style={inputStyle}
              />
            </FormField>
          )}

          {/* Row 6: Letterhead */}
          <FileUploadArea
            label="Letterhead (Signature / Logo)"
            required
            files={letterheadFiles}
            onFiles={(toAdd) => setLetterheadFiles((prev) => [...prev, ...toAdd])}
            onRemove={(i) => { setLetterheadFileError(""); setLetterheadFiles((prev) => prev.filter((_, idx) => idx !== i)); }}
            maxFiles={2}
            fileError={letterheadFileError}
            setFileError={setLetterheadFileError}
            C={C}
          />

          {/* Row 7: Supporting Documents */}
          <FileUploadArea
            label="Supporting Documents (optional)"
            files={documentFiles}
            onFiles={(toAdd) => setDocumentFiles((prev) => [...prev, ...toAdd])}
            onRemove={(i) => { setDocFileError(""); setDocumentFiles((prev) => prev.filter((_, idx) => idx !== i)); }}
            maxFiles={5}
            fileError={docFileError}
            setFileError={setDocFileError}
            C={C}
          />

          {error && (
            <p style={{ margin: "0 0 12px", fontSize: 12, color: "#ef4444", lineHeight: 1.5 }}>{error}</p>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
            <WorkspaceButton type="submit" disabled={loading}>
              {loading ? "Submitting…" : "Submit Grievance"}
            </WorkspaceButton>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function DeoGrievances() {
  const { C } = usePortalTheme();
  const navigate = useNavigate();
  const { session } = useAuth();
  const [grievances, setGrievances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [query, setQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [hoveredActionId, setHoveredActionId] = useState(null);
  const [hoveredPagerButton, setHoveredPagerButton] = useState(null);
  const [showEntriesFocused, setShowEntriesFocused] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(8);

  const tableHeaderBackground = C.purple;
  const tableHeaderText = "#FFFFFF";
  const alternateRowBackground = C.name === "dark" ? C.card : "#F7F1FF";

  async function loadGrievances() {
    try {
      setLoading(true);
      setError("");
      const { data } = await apiClient.get("/deo/grievances");
      setGrievances(Array.isArray(data?.grievances) ? data.grievances : []);
    } catch (err) {
      setError(err?.response?.data?.error || "Unable to load grievances");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (session?.role) loadGrievances();
  }, [session?.role]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return grievances.filter((g) => {
      const matchesQuery = !q || [g.grievanceId, g.subject, g.citizenSnapshot?.name, g.state, g.district]
        .filter(Boolean).join(" ").toLowerCase().includes(q);
      const matchesDate = !dateFilter || toYmd(g.createdAt || g.created_at) === dateFilter;
      return matchesQuery && matchesDate;
    });
  }, [grievances, query, dateFilter]);

  const todayStr = toYmd(new Date());

  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const paginatedItems = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const pageNumbers = useMemo(() => {
    if (totalPages <= 1) return [1];
    const pages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
    return Array.from(pages).filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  }, [currentPage, totalPages]);

  useEffect(() => {
    setCurrentPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  return (
    <div
      style={{
        height: "calc(100vh - 73px)",
        overflow: "auto",
        padding: "16px 20px 8px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ width: "100%", display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
        <div style={{ marginBottom: 18, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <h1 style={{ margin: 0, fontSize: 20, lineHeight: 1.3, fontWeight: 600, color: C.t1 }}>
            GRIEVANCES
          </h1>
          <WorkspaceButton
            type="button"
            onClick={() => setShowAddModal(true)}
            style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, minHeight: 32, padding: "0 12px" }}
          >
            <Plus size={14} /> Add Grievances
          </WorkspaceButton>
        </div>

        {showSuccessPopup && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: "var(--portal-sidebar-width, 280px)",
              right: 0,
              bottom: 0,
              zIndex: 2000,
              background: "rgba(0,0,0,0.45)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <div
              style={{
                background: C.card, border: `1px solid ${C.border}`,
                borderRadius: 18, padding: "36px 40px",
                maxWidth: 440, width: "90%", textAlign: "center",
                boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
              }}
            >
              <div
                style={{
                  width: 64, height: 64, borderRadius: "50%",
                  background: "#dcfce7", display: "flex",
                  alignItems: "center", justifyContent: "center",
                  margin: "0 auto 20px",
                }}
              >
                <span style={{ fontSize: 30, color: "#16a34a" }}>✓</span>
              </div>
              <h2 style={{ margin: "0 0 10px", fontSize: 20, fontWeight: 700, color: C.t1 }}>
                Grievance Submitted
              </h2>
              <p style={{ margin: "0 0 28px", fontSize: 13, color: C.t2, lineHeight: 1.6 }}>
                The grievance has been successfully submitted and sent to Admin (Mahendra Pratap Singh).
              </p>
              <WorkspaceButton
                type="button"
                onClick={() => setShowSuccessPopup(false)}
                style={{ minWidth: 120 }}
              >
                OK
              </WorkspaceButton>
            </div>
          </div>
        )}

        <div style={{ marginBottom: 14, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1 }} />
          <div style={{ position: "relative", width: "30%" }}>
            <Search
              style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: C.t3 }}
              size={15}
            />
            <WorkspaceInput
              value={query}
              onChange={(e) => { setQuery(e.target.value); setCurrentPage(1); }}
              placeholder="Search by Id, Title, Citizen, State and District"
              style={{ padding: "6px 14px 6px 34px", minHeight: 34, fontSize: 11 }}
            />
          </div>
          <div style={{ width: "20%" }}>
            <CustomDateFilter
              value={dateFilter}
              onChange={(v) => { setDateFilter(v); setCurrentPage(1); }}
              placeholder="Date"
              max={todayStr}
            />
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          {error && <div style={{ color: C.danger, padding: "12px 0" }}>{error}</div>}
          {loading && <WorkspaceEmptyState title="Loading grievances..." />}

          {!loading && !error && (
            filtered.length === 0 ? (
              <WorkspaceEmptyState title="No pending grievances" subtitle="New grievances will appear here." />
            ) : (
              <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden", display: "flex", flexDirection: "column", marginBottom: 10 }}>
                <table className="w-full text-sm" style={{ borderCollapse: "collapse", tableLayout: "fixed" }}>
                  <colgroup>
                    <col style={{ width: 145, minWidth: 145, maxWidth: 145 }} />
                    <col style={{ width: "26%" }} />
                    <col style={{ width: "16%" }} />
                    <col style={{ width: 100, minWidth: 100, maxWidth: 100 }} />
                    <col style={{ width: 100, minWidth: 100, maxWidth: 100 }} />
                    <col style={{ width: 105, minWidth: 105, maxWidth: 105 }} />
                    <col style={{ width: 84, minWidth: 84, maxWidth: 84 }} />
                  </colgroup>
                  <thead>
                    <tr>
                      {[
                        { label: "Grievance ID", align: "left" },
                        { label: "Title", align: "left" },
                        { label: "Citizen Name", align: "left" },
                        { label: "State", align: "left" },
                        { label: "District", align: "left" },
                        { label: "Date", align: "left" },
                        { label: "Action", align: "center" },
                      ].map(({ label, align }, i) => (
                        <th
                          key={label}
                          style={{
                            padding: "13px 16px",
                            fontSize: 10,
                            fontWeight: 600,
                            color: tableHeaderText,
                            textTransform: "uppercase",
                            letterSpacing: "0.06em",
                            textAlign: align,
                            whiteSpace: "nowrap",
                            background: tableHeaderBackground,
                            borderBottom: `1px solid ${C.border}`,
                            verticalAlign: "middle",
                            borderTopLeftRadius: i === 0 ? 12 : 0,
                            borderTopRightRadius: i === 6 ? 12 : 0,
                          }}
                        >
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedItems.map((g, index) => {
                      const rowBg = index % 2 === 0 ? C.card : alternateRowBackground;
                      const isHovered = hoveredActionId === g.id;
                      return (
                        <tr
                          key={g.id}
                          style={{ borderBottom: `1px solid ${C.borderLight}`, background: rowBg, verticalAlign: "middle" }}
                        >
                          <td style={{ padding: "10px 16px", fontSize: 13, color: C.t2, verticalAlign: "middle" }}>
                            <span style={{ ...tableCellTextStyle, fontWeight: 600, fontFamily: "monospace", fontSize: 11 }}>
                              {g.grievanceId}
                            </span>
                          </td>
                          <td style={{ padding: "10px 16px", verticalAlign: "middle", maxWidth: 0 }}>
                            <div style={{ ...tableCellTextStyle, fontSize: 13, fontWeight: 600, color: C.t1 }}>
                              {g.subject || "-"}
                            </div>
                          </td>
                          <td style={{ padding: "10px 16px", fontSize: 13, color: C.t2, verticalAlign: "middle", maxWidth: 0 }}>
                            <span style={tableCellTextStyle}>{g.citizenSnapshot?.name || "-"}</span>
                          </td>
                          <td style={{ padding: "10px 16px", fontSize: 13, color: C.t2, verticalAlign: "middle" }}>
                            <span style={tableCellTextStyle}>{g.state || "-"}</span>
                          </td>
                          <td style={{ padding: "10px 16px", fontSize: 13, color: C.t2, verticalAlign: "middle" }}>
                            <span style={tableCellTextStyle}>{g.district || "-"}</span>
                          </td>
                          <td style={{ padding: "10px 16px", fontSize: 13, color: C.t2, verticalAlign: "middle", whiteSpace: "nowrap" }}>
                            <span style={tableCellTextStyle}>{formatDate(g.createdAt || g.created_at)}</span>
                          </td>
                          <td style={{ padding: "10px 16px", textAlign: "center", verticalAlign: "middle", whiteSpace: "nowrap" }}>
                            <button
                              type="button"
                              onMouseEnter={() => setHoveredActionId(g.id)}
                              onMouseLeave={() => setHoveredActionId(null)}
                              onClick={() =>
                                navigate(
                                  PATHS.deo.grievanceDetail.replace(":id", g.id),
                                  { state: { grievance: g } }
                                )
                              }
                              title="View details"
                              style={{
                                minWidth: 0, padding: 7, borderRadius: 10, border: "none",
                                background: isHovered ? C.purple : "transparent",
                                color: isHovered ? "#ffffff" : C.purple,
                                display: "inline-flex", alignItems: "center", justifyContent: "center",
                                cursor: "pointer",
                                transition: "background var(--portal-duration-fast) ease, color var(--portal-duration-fast) ease",
                              }}
                            >
                              <Eye size={18} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div style={{ background: C.bgElevated, borderTop: `1px solid ${C.border}` }}>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                      padding: "6px 12px",
                      width: "100%",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
                      <span style={{ color: C.t2, whiteSpace: "nowrap", fontSize: 12 }}>Show</span>
                      <input
                        type="number"
                        min={1}
                        max={25}
                        value={itemsPerPage}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          if (!Number.isFinite(v)) return;
                          setItemsPerPage(Math.min(25, Math.max(1, v)));
                          setCurrentPage(1);
                        }}
                        onFocus={() => setShowEntriesFocused(true)}
                        onBlur={() => setShowEntriesFocused(false)}
                        style={{
                          width: 64, minHeight: 34, padding: "6px 14px",
                          border: `1px solid ${showEntriesFocused ? C.purple : C.border}`,
                          borderRadius: "var(--portal-radius-sm, 10px)",
                          background: C.inp, color: C.t1, fontSize: 13, fontWeight: 500, outline: "none",
                          boxShadow: showEntriesFocused ? `0 0 0 3px ${C.purpleDim}` : "none",
                          transition: "border-color var(--portal-duration-fast) ease, box-shadow var(--portal-duration-fast) ease",
                        }}
                      />
                      <span style={{ color: C.t2, whiteSpace: "nowrap", fontSize: 12 }}>Entries</span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, justifyContent: "center", flexWrap: "wrap" }}>
                      {totalPages > 1 ? (
                        <>
                          <WorkspaceButton
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            variant="outline"
                            onMouseEnter={() => setHoveredPagerButton("prev")}
                            onMouseLeave={() => setHoveredPagerButton(null)}
                            style={{
                              minWidth: 30, minHeight: 30, padding: 6, border: "none",
                              background: "transparent", color: C.purple,
                              opacity: currentPage === 1 ? 0.35 : 1,
                              display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: 8,
                            }}
                          >
                            <ChevronLeft size={16} />
                          </WorkspaceButton>
                          {pageNumbers.map((pageNum, idx) => {
                            const prev = pageNumbers[idx - 1];
                            const showGap = idx > 0 && prev !== undefined && pageNum - prev > 1;
                            return (
                              <div key={pageNum} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                {showGap && <span style={{ color: C.t3, fontSize: 12 }}>...</span>}
                                <WorkspaceButton
                                  onClick={() => setCurrentPage(pageNum)}
                                  variant="outline"
                                  onMouseEnter={() => setHoveredPagerButton(`p-${pageNum}`)}
                                  onMouseLeave={() => setHoveredPagerButton(null)}
                                  style={{
                                    minWidth: 30, minHeight: 30, padding: 6, border: "none", borderRadius: 8, fontSize: 12,
                                    fontWeight: pageNum === currentPage ? 700 : 600, background: "transparent",
                                    color: pageNum === currentPage || hoveredPagerButton === `p-${pageNum}` ? "#ffffff" : C.purple,
                                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                                    textShadow: pageNum === currentPage || hoveredPagerButton === `p-${pageNum}` ? "0 0 10px rgba(255,255,255,0.9)" : "none",
                                    transition: "text-shadow 0.18s ease, color 0.18s ease",
                                  }}
                                >
                                  {pageNum}
                                </WorkspaceButton>
                              </div>
                            );
                          })}
                          <WorkspaceButton
                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages}
                            variant="outline"
                            onMouseEnter={() => setHoveredPagerButton("next")}
                            onMouseLeave={() => setHoveredPagerButton(null)}
                            style={{
                              minWidth: 30, minHeight: 30, padding: 6, border: "none",
                              background: "transparent", color: C.purple,
                              opacity: currentPage === totalPages ? 0.35 : 1,
                              display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: 8,
                            }}
                          >
                            <ChevronRight size={16} />
                          </WorkspaceButton>
                        </>
                      ) : (
                        <span style={{ color: "#ffffff", fontSize: 14, fontWeight: 700, textShadow: "0 0 10px rgba(255,255,255,0.9)", lineHeight: 1 }}>
                          1
                        </span>
                      )}
                    </div>

                    <p style={{ color: C.t2, margin: 0, whiteSpace: "nowrap", textAlign: "right", flex: 1, fontSize: 12 }}>
                      Showing{" "}
                      <strong>{Math.min((currentPage - 1) * itemsPerPage + 1, filtered.length)}</strong>
                      –
                      <strong>{Math.min(currentPage * itemsPerPage, filtered.length)}</strong>
                      {" "}of{" "}
                      <strong>{filtered.length}</strong>
                    </p>
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      </div>

      {showAddModal && (
        <AddGrievanceModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            setShowSuccessPopup(true);
            loadGrievances();
          }}
          C={C}
        />
      )}
    </div>
  );
}
