import { useEffect, useState } from "react";
import {
  FileText, CheckCircle, AlertCircle, Users, Upload, Phone,
  ChevronRight, Calendar, MapPin, Briefcase, X, ArrowRight, Home, Clock,
  File, FileImage, FileSpreadsheet, FileJson, FileAudio,
  FileVideo, FileArchive, FileCode, FileCheck, FileX, FileBarChart,
  Database, Presentation
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { FaFilePdf } from "react-icons/fa";
import { sanitizeSelectedFiles as sanitizeUploadedFiles } from "../../../shared/security/files.js";
import { PATHS } from "../../../routes/paths.js";
import { apiClient, authorizedConfig } from "../../../shared/api/client.js";
import { useAuth } from "../../../shared/auth/AuthContext.jsx";
import { usePortalTheme } from "../../../shared/theme/portalTheme.jsx";
import { WorkspaceButton, WorkspaceCard, WorkspaceCardHeader, WorkspaceInput, WorkspacePage, WorkspaceSectionHeader, WorkspaceSelect } from "../../../shared/components/WorkspaceUI.jsx";

const FILE_UPLOAD_OPTIONS = {
  maxFiles: 5,
  maxFileSizeBytes: 10 * 1024 * 1024,
};

const ACCEPTED_UPLOAD_TYPES = ".pdf,.png,.jpg,.jpeg,.webp,.xls,.xlsx,.doc,.docx,.txt";

function SuccessModal({ open, title, message, onClose }) {
  const { C } = usePortalTheme();
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm">
      <div
        className="w-full max-w-md rounded-xl overflow-hidden animate-in fade-in zoom-in-95 duration-300"
        style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, boxShadow: C.dialogShadow }}
      >
        <div className="px-6 py-6 border-b" style={{ background: C.bgElevated, borderColor: C.border }}>
          <div className="flex items-center justify-center mb-4">
            <div className="h-16 w-16 rounded-full flex items-center justify-center" style={{ background: `${C.mint}20` }}>
              <CheckCircle size={32} style={{ color: C.mint }} />
            </div>
          </div>
          <h3 className="text-lg font-bold text-center" style={{ color: C.t1 }}>{title}</h3>
        </div>
        <div className="px-6 py-6">
          <p className="text-sm text-center leading-6" style={{ color: C.t3 }}>{message}</p>
          <WorkspaceButton onClick={onClose} style={{ width: "100%", marginTop: 24 }}>
            Continue
          </WorkspaceButton>
        </div>
      </div>
    </div>
  );
}

// 🟢 COMPREHENSIVE: Get specific file icon and color based on extension
const getFileIcon = (fileName) => {
  if (!fileName) return { icon: <File size={20} className="text-gray-500" />, color: "gray" };

  const ext = fileName?.split('.').pop().toLowerCase();

  // Images
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'tiff', 'ico'].includes(ext)) {
    return { icon: <FileImage size={20} className="text-slate-600" />, color: "soft" };
  }

  // PDF
  if (ext === 'pdf') {
    return { icon: <FaFilePdf size={20} className="text-red-500" />, color: "red" };
  }

  // Spreadsheets
  if (['xls', 'xlsx', 'csv', 'tsv', 'ods'].includes(ext)) {
    return { icon: <FileSpreadsheet size={20} className="text-green-500" />, color: "green" };
  }

  // Presentations
  if (['ppt', 'pptx', 'odp', 'key'].includes(ext)) {
    return { icon: <Presentation size={20} className="text-orange-500" />, color: "orange" };
  }

  // Documents/Text
  if (['doc', 'docx', 'txt', 'rtf', 'odt', 'pages'].includes(ext)) {
    return { icon: <FileText size={20} className="text-slate-700" />, color: "soft" };
  }

  // JSON/Code
  if (ext === 'json') {
    return { icon: <FileJson size={20} className="text-yellow-600" />, color: "yellow" };
  }

  // Code files
  if (['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'cpp', 'c', 'html', 'css', 'scss', 'php', 'rb', 'go', 'rs'].includes(ext)) {
    return { icon: <FileCode size={20} className="text-purple-600" />, color: "purple" };
  }

  // Audio
  if (['mp3', 'wav', 'flac', 'aac', 'm4a', 'ogg', 'wma', 'aiff'].includes(ext)) {
    return { icon: <FileAudio size={20} className="text-pink-500" />, color: "pink" };
  }

  // Video
  if (['mp4', 'avi', 'mov', 'mkv', 'flv', 'wmv', 'webm', 'mpg', '3gp'].includes(ext)) {
    return { icon: <FileVideo size={20} className="text-red-600" />, color: "red" };
  }

  // Archives
  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'iso'].includes(ext)) {
    return { icon: <FileArchive size={20} className="text-purple-500" />, color: "purple" };
  }

  // Database
  if (['db', 'sqlite', 'mdb', 'sql'].includes(ext)) {
    return { icon: <Database size={20} className="text-slate-700" />, color: "soft" };
  }

  // Checkmark files
  if (['todo', 'checklist'].includes(ext)) {
    return { icon: <FileCheck size={20} className="text-green-600" />, color: "green" };
  }

  // Default
  return { icon: <File size={20} className="text-gray-500" />, color: "gray" };
};

// 🟢 NEW: Get background color based on file type
const getFileColorClass = (fileName) => {
  const { color } = getFileIcon(fileName);
  const colorMap = {
    soft: 'bg-slate-50 border-slate-200 group-hover:border-slate-300',
    red: 'bg-red-50 border-red-200 group-hover:border-red-400',
    green: 'bg-green-50 border-green-200 group-hover:border-green-400',
    orange: 'bg-orange-50 border-orange-200 group-hover:border-orange-400',
    yellow: 'bg-yellow-50 border-yellow-200 group-hover:border-yellow-400',
    purple: 'bg-purple-50 border-purple-200 group-hover:border-purple-400',
    pink: 'bg-pink-50 border-pink-200 group-hover:border-pink-400',
    gray: 'bg-gray-50 border-gray-200 group-hover:border-gray-400'
  };
  return colorMap[color] || colorMap.gray;
};

// 🟢 NEW: File size formatter
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

// 🟢 NEW: Get file type label
const getFileTypeLabel = (fileName) => {
  if (!fileName) return 'Unknown';
  const ext = fileName?.split('.').pop().toLowerCase();
  const typeMap = {
    // Images
    'jpg': 'JPEG Image', 'jpeg': 'JPEG Image', 'png': 'PNG Image', 'gif': 'GIF Image', 'webp': 'WebP Image', 'svg': 'SVG Image', 'bmp': 'Bitmap Image', 'tiff': 'TIFF Image', 'ico': 'Icon',
    // PDF
    'pdf': 'PDF Document',
    // Spreadsheets
    'xls': 'Excel Sheet', 'xlsx': 'Excel Workbook', 'csv': 'CSV File', 'tsv': 'TSV File', 'ods': 'OpenDocument Spreadsheet',
    // Presentations
    'ppt': 'PowerPoint', 'pptx': 'PowerPoint Presentation', 'odp': 'OpenDocument Presentation', 'key': 'Keynote Presentation',
    // Documents
    'doc': 'Word Document', 'docx': 'Word Document', 'txt': 'Text File', 'rtf': 'Rich Text', 'odt': 'OpenDocument Text', 'pages': 'Pages Document',
    // Code
    'json': 'JSON File', 'js': 'JavaScript', 'jsx': 'React Component', 'ts': 'TypeScript', 'tsx': 'TSX File', 'py': 'Python', 'java': 'Java', 'cpp': 'C++', 'c': 'C File', 'html': 'HTML', 'css': 'CSS', 'scss': 'SCSS', 'php': 'PHP', 'rb': 'Ruby', 'go': 'Go', 'rs': 'Rust',
    // Audio
    'mp3': 'MP3 Audio', 'wav': 'WAV Audio', 'flac': 'FLAC Audio', 'aac': 'AAC Audio', 'm4a': 'M4A Audio', 'ogg': 'OGG Audio', 'wma': 'WMA Audio', 'aiff': 'AIFF Audio',
    // Video
    'mp4': 'MP4 Video', 'avi': 'AVI Video', 'mov': 'MOV Video', 'mkv': 'MKV Video', 'flv': 'FLV Video', 'wmv': 'WMV Video', 'webm': 'WebM Video', 'mpg': 'MPEG Video', '3gp': '3GP Video',
    // Archives
    'zip': 'ZIP Archive', 'rar': 'RAR Archive', '7z': '7Z Archive', 'tar': 'TAR Archive', 'gz': 'GZIP Archive', 'bz2': 'BZIP2 Archive', 'iso': 'ISO Image',
    // Database
    'db': 'Database', 'sqlite': 'SQLite Database', 'mdb': 'Access Database', 'sql': 'SQL File',
  };
  return typeMap[ext] || ext.toUpperCase() + ' File';
};

// 🟢 Get tomorrow's date in YYYY-MM-DD format (minimum selectable date)
const getTomorrowDate = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split('T')[0];
};

const toIsoFromDateAndSlot = (dateString, timeSlot) => {
  if (!dateString || !timeSlot) {
    return "";
  }

  const [time, meridian] = timeSlot.split(" ");
  const [hoursRaw, minutesRaw] = time.split(":").map(Number);
  let hours = hoursRaw;
  if (meridian === "PM" && hours !== 12) hours += 12;
  if (meridian === "AM" && hours === 12) hours = 0;

  const date = new Date(dateString);
  date.setHours(hours, minutesRaw, 0, 0);
  return date.toISOString();
};

export default function HCMNewCasePage() {
  const { C } = usePortalTheme();
  const complaintCategories = [
    "Tourism Infrastructure",
    "Heritage & Monuments",
    "Cultural Institutions & Activities",
    "Tourism Services & Visitor Experience",
    "Constituency Civic Issues",
    "Government Schemes & Benefits",
    "Employment & Skill Development",
    "Public Grievances Against Departments",
    "Suggestions / Public Feedback",
  ];

  const timeSlots = [
    // Midnight - Early Morning
    "12:00 AM", "12:30 AM", "01:00 AM", "01:30 AM", "02:00 AM", "02:30 AM",
    "03:00 AM", "03:30 AM", "04:00 AM", "04:30 AM", "05:00 AM", "05:30 AM",
    // Early Morning - Morning
    "06:00 AM", "06:30 AM", "07:00 AM", "07:30 AM", "08:00 AM", "08:30 AM",
    "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
    // Noon - Afternoon
    "12:00 PM", "12:30 PM", "01:00 PM", "01:30 PM", "02:00 PM", "02:30 PM",
    "03:00 PM", "03:30 PM", "04:00 PM", "04:30 PM", "05:00 PM", "05:30 PM",
    // Evening - Night
    "06:00 PM", "06:30 PM", "07:00 PM", "07:30 PM", "08:00 PM", "08:30 PM",
    "09:00 PM", "09:30 PM", "10:00 PM", "10:30 PM", "11:00 PM", "11:30 PM"
  ];

  const [activeTab, setActiveTab] = useState("");
  const [admins, setAdmins] = useState([]);
  const [error, setError] = useState("");
  const [successModal, setSuccessModal] = useState({ open: false, title: "", message: "" });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { session } = useAuth();

  const [meetingForm, setMeetingForm] = useState({
    title: "",
    purpose: "",
    referralAdminUserId: "",
    preferredDate: "",
    preferredTime: "",
    files: [],
    companions: [{ name: "", phone: "" }],
  });

  const [complaintForm, setComplaintForm] = useState({
    title: "",
    details: "",
    complaintLocation: "",
    complaintType: "",
    files: [],
  });

  useEffect(() => {
    let mounted = true;

    async function loadAdminDirectory() {
      if (!session?.accessToken) {
        return;
      }

      try {
        const { data } = await apiClient.get(
          "/citizen/admin-directory",
          authorizedConfig(session.accessToken)
        );
        if (mounted) {
          setAdmins(data.admins || []);
        }
      } catch {
        if (mounted) {
          setAdmins([]);
        }
      }
    }

    loadAdminDirectory();
    return () => {
      mounted = false;
    };
  }, [session?.accessToken]);

  const sectionLabelStyle = {
    display: "block",
    fontSize: 11,
    fontWeight: 700,
    color: C.t3,
    textTransform: "uppercase",
    letterSpacing: ".08em",
    marginBottom: 10,
  };

  const textareaStyle = {
    width: "100%",
    padding: "12px 16px",
    border: `1px solid ${C.border}`,
    borderRadius: 12,
    background: C.inp,
    color: C.t1,
    fontSize: 14,
    lineHeight: 1.6,
    outline: "none",
  };

  const submitMeeting = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const referralAdmin = admins.find((admin) => admin.id === meetingForm.referralAdminUserId);
      const preferredTimeIso = toIsoFromDateAndSlot(meetingForm.preferredDate, meetingForm.preferredTime);

      const payload = new FormData();
      payload.append("title", meetingForm.title);
      payload.append("purpose", meetingForm.purpose);
      payload.append("preferredTime", preferredTimeIso);
      payload.append("adminReferral", referralAdmin ? `${referralAdmin.name} · ${referralAdmin.department}` : "");
      payload.append(
        "additionalAttendees",
        JSON.stringify(
          meetingForm.companions
            .filter((entry) => entry.name.trim() && entry.phone.trim())
            .map((entry) => ({ attendeeName: entry.name.trim(), attendeePhone: entry.phone.trim() }))
        )
      );
      if (meetingForm.files[0]) {
        payload.append("file", meetingForm.files[0]);
      }

      await apiClient.post("/meetings/request", payload, authorizedConfig(session.accessToken, {
        headers: {
          "Content-Type": "multipart/form-data",
          "Idempotency-Key": crypto.randomUUID(),
        },
      }));

      setSuccessModal({
        open: true,
        title: "Meeting Submitted",
        message: "Your meeting request has been submitted to the admin meeting queue.",
      });
      setMeetingForm({
        title: "",
        purpose: "",
        referralAdminUserId: "",
        preferredDate: "",
        preferredTime: "",
        files: [],
        companions: [{ name: "", phone: "" }],
      });
    } catch (submissionError) {
      setError(submissionError?.response?.data?.error || "Unable to submit the meeting request");
    } finally {
      setLoading(false);
    }
  };

  const submitComplaint = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const payload = new FormData();
      payload.append("subject", complaintForm.title);
      payload.append("description", complaintForm.details);
      payload.append("complaintLocation", complaintForm.complaintLocation);
      payload.append("complaintType", complaintForm.complaintType);

      if (complaintForm.files[0]) {
        payload.append("file", complaintForm.files[0]);
      }

      await apiClient.post("/complaints", payload, authorizedConfig(session.accessToken, {
        headers: {
          "Content-Type": "multipart/form-data",
          "Idempotency-Key": crypto.randomUUID(),
        },
      }));

      setSuccessModal({
        open: true,
        title: "Complaint Submitted",
        message: "Your complaint has been submitted successfully and routed into the admin workflow.",
      });
      setComplaintForm({
        title: "",
        details: "",
        complaintLocation: "",
        complaintType: "",
        files: [],
      });
    } catch (submissionError) {
      setError(submissionError?.response?.data?.error || "Unable to submit the complaint");
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelection = (formType, fileList) => {
    const { acceptedFiles, rejectedFiles } = sanitizeUploadedFiles(fileList, FILE_UPLOAD_OPTIONS);

    if (rejectedFiles.length > 0) {
      setError("Some files were rejected. Allowed types: PDF, PNG, JPG, WEBP, XLS, XLSX, DOC, DOCX, TXT. Max 10 MB each.");
    } else {
      setError("");
    }

    if (formType === "meeting") {
      setMeetingForm((current) => ({
        ...current,
        files: acceptedFiles,
      }));
      return;
    }

    setComplaintForm((current) => ({
      ...current,
      files: acceptedFiles,
    }));
  };

  // 🟢 NEW: Render file card component
  const FileCard = ({ file, index, formType }) => {
    const hoverAccent = C.purple;
    const { icon } = getFileIcon(file.name);
    const colorClass = getFileColorClass(file.name);
    const fileType = getFileTypeLabel(file.name);

    const handleRemove = (idx) => {
      if (formType === 'meeting') {
        setMeetingForm((current) => ({
          ...current,
          files: current.files.filter((_, i) => i !== idx),
        }));
      } else {
        setComplaintForm((current) => ({
          ...current,
          files: current.files.filter((_, i) => i !== idx),
        }));
      }
    };

    return (
      <div
        key={index}
        className={`flex items-center justify-between p-4 ${colorClass} border rounded-xl transition-[opacity,border-color] duration-200 hover:opacity-95 group`}
        onClick={(e) => e.preventDefault()}
      >
        <div className="flex items-center gap-3 overflow-hidden flex-1">
          <div className="p-2.5 rounded-lg border border-current border-opacity-20 transition-colors flex-shrink-0" style={{ background: C.bgElevated }}>
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate transition-colors" style={{ fontSize: 13, fontWeight: 600, color: C.t1 }} title={file.name}>
              {file.name}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span style={{ fontSize: 11, background: C.bgElevated, border: `1px solid ${C.borderLight}`, padding: "2px 8px", borderRadius: 6, fontWeight: 500, color: C.t2 }}>
                {fileType}
              </span>
              <span style={{ fontSize: 11, color: C.t3 }}>
                {formatFileSize(file.size)}
              </span>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            handleRemove(index);
          }}
          className="p-2 rounded-lg transition-opacity ml-2 flex-shrink-0 hover:opacity-80" style={{ color: C.t3 }}
        >
          <X size={18} />
        </button>
      </div>
    );
  };

  return (
    <WorkspacePage width={1200}>
      <SuccessModal
        open={successModal.open}
        title={successModal.title}
        message={successModal.message}
        onClose={() => {
          setSuccessModal((current) => ({ ...current, open: false }));
          setActiveTab("");
        }}
      />

      {/* HEADER */}
      {activeTab && (
        <div className="sticky top-0 z-40 portal-panel" style={{ background: C.bgElevated, backdropFilter: "blur(14px)", borderBottom: `1px solid ${C.border}`, boxShadow: "none" }}>
          <div className="portal-page-wrap max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
            <button
              onClick={() => {
                setActiveTab("");
                setError("");
              }}
              className="flex items-center gap-2 font-medium transition-colors"
              style={{ color: C.purple }}
            >
              <ChevronRight size={20} className="rotate-180" />
              Back to Services
            </button>
            <h2 style={{ fontSize: 20, fontWeight: 600, color: C.t1 }}>
              {activeTab === "meeting" ? "Meeting Request" : "Submit Complaint"}
            </h2>
            <div className="w-20"></div>
          </div>
        </div>
      )}

      <div className="portal-page-wrap max-w-6xl mx-auto px-6 py-2">

        {/* ERROR ALERT */}
        {error && (
          <div className="mb-6 p-4 flex items-start gap-3" style={{ background: `${C.danger}12`, border: `1px solid ${C.danger}4D`, borderRadius: 10 }}>
            <AlertCircle size={20} style={{ color: C.danger, flexShrink: 0, marginTop: 2 }} />
            <div>
              <h4 style={{ fontWeight: 600, color: C.danger }}>Error</h4>
              <p style={{ fontSize: 13, color: C.danger, marginTop: 4 }}>{error}</p>
            </div>
          </div>
        )}

        {/* SERVICE SELECTION */}
        {!activeTab ? (
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            {/* MEETING REQUEST */}
            <button
              onClick={() => setActiveTab("meeting")}
              className="group relative rounded-xl border transition-[border-color,opacity] duration-200 overflow-hidden text-left hover:opacity-[0.98]"
              style={{ background: C.card, borderColor: C.border, boxShadow: "none" }}
            >
              <div className="relative p-8">
                <div className="h-12 w-12 rounded-xl flex items-center justify-center mb-4" style={{ background: C.purpleDim }}>
                  <Calendar size={24} style={{ color: C.purple }} />
                </div>
                <h3 style={{ fontSize: 20, fontWeight: 600, color: C.t1, marginBottom: 8 }}>Request a Meeting</h3>
                <p style={{ color: C.t2, fontSize: 13, lineHeight: 1.6, marginBottom: 24 }}>
                  Schedule a meeting with an administration desk. You can specify purpose, add supporting documents, and invite companions.
                </p>
                <div className="flex items-center gap-2 font-medium group-hover:gap-3 transition-all duration-300" style={{ color: C.purple }}>
                  Get Started
                  <ArrowRight size={18} />
                </div>
              </div>
            </button>

            {/* SUBMIT COMPLAINT */}
            <button
              onClick={() => setActiveTab("complaint")}
              className="group relative rounded-xl border transition-[border-color,opacity] duration-200 overflow-hidden text-left hover:opacity-[0.98]"
              style={{ background: C.card, borderColor: C.border, boxShadow: "none" }}
            >
              <div className="relative p-8">
                <div className="h-12 w-12 rounded-xl flex items-center justify-center mb-4" style={{ background: `${C.mint}20` }}>
                  <FileText size={24} style={{ color: C.mint }} />
                </div>
                <h3 style={{ fontSize: 20, fontWeight: 600, color: C.t1, marginBottom: 8 }}>Submit a Complaint</h3>
                <p style={{ color: C.t2, fontSize: 13, lineHeight: 1.6, marginBottom: 24 }}>
                  File a formal complaint regarding any civic or government issue. Supports multiple document formats and categories.
                </p>
                <div className="flex items-center gap-2 font-medium group-hover:gap-3 transition-all duration-300" style={{ color: C.mint }}>
                  Get Started
                  <ArrowRight size={18} />
                </div>
              </div>
            </button>
          </div>
        ) : activeTab === "meeting" ? (
          // MEETING FORM
          <WorkspaceCard style={{ marginBottom: 32 }}>
            <form onSubmit={submitMeeting} className="space-y-8">
              <WorkspaceCardHeader
                title="Meeting Request Form"
                subtitle="Share the purpose, timing, supporting documents, and any accompanying attendees."
              />

              {/* TITLE */}
              <div>
                <label style={sectionLabelStyle}>
                  Meeting Title <span style={{ color: C.danger }}>*</span>
                </label>
                <WorkspaceInput
                  required
                  type="text"
                  value={meetingForm.title}
                  onChange={(event) =>
                    setMeetingForm((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  placeholder="Enter meeting title (e.g. Document Verification)"
                />
              </div>

              {/* PURPOSE */}
              <div>
                <label style={sectionLabelStyle}>
                  Purpose of Meeting <span style={{ color: C.danger }}>*</span>
                </label>
                <textarea
                  required
                  value={meetingForm.purpose}
                  onChange={(event) =>
                    setMeetingForm((current) => ({ ...current, purpose: event.target.value }))
                  }
                  placeholder="Explain the purpose of your meeting request in detail"
                  style={textareaStyle}
                  rows={5}
                />
              </div>

              {/* DATE AND TIME */}
              <div style={{ padding: 20, borderRadius: 12, border: `1px solid ${C.border}`, background: C.bgElevated }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 16 }}>
                  Scheduling Preferences
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="flex items-center gap-2" style={sectionLabelStyle}>
                    <Calendar size={16} />
                    Preferred Date <span style={{ color: C.danger }}>*</span>
                  </label>
                  <WorkspaceInput
                    required
                    type="date"
                    value={meetingForm.preferredDate}
                    onChange={(event) =>
                      setMeetingForm((current) => ({ ...current, preferredDate: event.target.value }))
                    }
                    min={getTomorrowDate()}
                  />
                  <p style={{ fontSize: 11, color: C.t3, marginTop: 8 }}>Select a date from tomorrow onwards</p>
                </div>

                <div>
                  <label className="flex items-center gap-2" style={sectionLabelStyle}>
                    <Clock size={16} />
                    Preferred Time <span style={{ color: C.danger }}>*</span>
                  </label>
                  <WorkspaceSelect
                    required
                    value={meetingForm.preferredTime}
                    onChange={(event) =>
                      setMeetingForm((current) => ({ ...current, preferredTime: event.target.value }))
                    }
                  >
                    <option value="">-- Select time slot --</option>
                    {timeSlots.map((time) => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
                  </WorkspaceSelect>
                  <p style={{ fontSize: 11, color: C.t3, marginTop: 8 }}>24-hour slots available • 30-minute intervals</p>
                </div>
              </div>
              </div>

              {/* ADMIN REFERRAL */}
              <div>
                <label style={sectionLabelStyle}>
                  Admin Desk (Optional)
                </label>
                <WorkspaceSelect
                  value={meetingForm.referralAdminUserId}
                  onChange={(event) =>
                    setMeetingForm((current) => ({ ...current, referralAdminUserId: event.target.value }))
                  }
                >
                  <option value="">-- Select an admin desk --</option>
                  {admins.map((admin) => (
                    <option key={admin.id} value={admin.id}>
                      {admin.name ? `${admin.name} (${admin.username})` : admin.username} · {admin.department}
                    </option>
                  ))}
                </WorkspaceSelect>
                <p style={{ fontSize: 11, color: C.t3, marginTop: 8 }}>Not sure? Leave blank to auto-assign.</p>
              </div>

              {/* FILE UPLOAD */}
              <div>
                <label style={sectionLabelStyle}>
                  Supporting Documents (Optional)
                </label>
                <label className="border-2 border-dashed rounded-xl p-6 cursor-pointer transition-colors block" style={{ borderColor: C.border, background: C.bgElevated }}>
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: C.card, border: `1px solid ${C.border}` }}>
                      <Upload size={24} style={{ color: C.t3 }} />
                    </div>
                    <div className="flex-1">
                      <div style={{ fontWeight: 600, color: C.t1 }}>
                        {meetingForm.files.length > 0
                          ? `${meetingForm.files.length} file(s) selected`
                          : "Click to upload or drag and drop"}
                      </div>
                      <p style={{ fontSize: 11, color: C.t3, marginTop: 4 }}>PDF, images, or office documents</p>
                    </div>
                  </div>

                  {/* 🟢 ENHANCED: File List with Full Details */}
                  {meetingForm.files.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {meetingForm.files.map((file, index) => (
                        <FileCard key={index} file={file} index={index} formType="meeting" />
                      ))}
                    </div>
                  )}

                  <input
                    type="file"
                    multiple
                    accept={ACCEPTED_UPLOAD_TYPES}
                    className="hidden"
                    onChange={(event) => handleFileSelection("meeting", event.target.files)}
                  />
                </label>
              </div>

              {/* COMPANIONS */}
              <div style={{ padding: 20, borderRadius: 12, border: `1px solid ${C.border}`, background: C.bgElevated }}>
                <label className="flex items-center gap-2" style={sectionLabelStyle}>
                  <Users size={18} />
                  Additional Attendees
                </label>
                <div className="space-y-3">
                  {meetingForm.companions.map((person, index) => (
                    <div key={`companion-${index}`} className="grid md:grid-cols-[1fr_1fr_auto] gap-3 items-end">
                      <input
                        type="text"
                        value={person.name}
                        onChange={(event) =>
                          setMeetingForm((current) => ({
                            ...current,
                            companions: current.companions.map((entry, entryIndex) =>
                              entryIndex === index ? { ...entry, name: event.target.value } : entry
                            ),
                          }))
                        }
                        placeholder="Full name"
                        style={textareaStyle}
                      />
                      <input
                        type="tel"
                        value={person.phone}
                        onChange={(event) =>
                          setMeetingForm((current) => ({
                            ...current,
                            companions: current.companions.map((entry, entryIndex) =>
                              entryIndex === index
                                ? { ...entry, phone: event.target.value.replace(/\D/g, "").slice(0, 10) }
                                : entry
                            ),
                          }))
                        }
                        placeholder="Phone number"
                        style={textareaStyle}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setMeetingForm((current) => ({
                            ...current,
                            companions:
                              current.companions.length === 1
                                ? [{ name: "", phone: "" }]
                                : current.companions.filter((_, entryIndex) => entryIndex !== index),
                          }))
                        }
                        className="px-4 py-3 rounded-lg transition-colors font-medium"
                        style={{ border: `1px solid ${C.border}`, color: C.t2, background: "transparent" }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setMeetingForm((current) => ({
                        ...current,
                        companions: [...current.companions, { name: "", phone: "" }],
                      }))
                    }
                    className="px-4 py-3 rounded-lg transition-colors font-medium"
                    style={{ border: `1px solid ${C.purple}55`, background: C.purpleDim, color: C.purple }}
                  >
                    + Add Person
                  </button>
                </div>
              </div>
              {/* SUBMIT */}
              <WorkspaceButton
                type="submit"
                disabled={loading || !meetingForm.title || !meetingForm.purpose || !meetingForm.preferredDate || !meetingForm.preferredTime}
                style={{ width: "100%", padding: "16px 24px" }}
              >
                {loading ? "Submitting..." : "Submit Meeting Request"}
              </WorkspaceButton>
            </form>
          </WorkspaceCard>
        ) : (
          // COMPLAINT FORM
          <WorkspaceCard style={{ marginBottom: 32 }}>
            <form onSubmit={submitComplaint} className="space-y-8">
              <WorkspaceCardHeader
                title="Complaint Form"
                subtitle="Provide a clear issue summary, category, location, and any supporting documents."
              />
              {/* TITLE */}
              <div>
                <label style={sectionLabelStyle}>
                  Complaint Title <span style={{ color: C.danger }}>*</span>
                </label>
                <WorkspaceInput
                  required
                  type="text"
                  value={complaintForm.title}
                  onChange={(event) =>
                    setComplaintForm((current) => ({ ...current, title: event.target.value }))
                  }
                  placeholder="Brief title of your complaint"
                />
              </div>

              {/* DETAILS */}
              <div>
                <label style={sectionLabelStyle}>
                  Complaint Details <span style={{ color: C.danger }}>*</span>
                </label>
                <textarea
                  required
                  value={complaintForm.details}
                  onChange={(event) =>
                    setComplaintForm((current) => ({ ...current, details: event.target.value }))
                  }
                  placeholder="Provide detailed description of the issue"
                  style={textareaStyle}
                  rows={6}
                />
              </div>

              {/* LOCATION */}
              <div style={{ padding: 20, borderRadius: 12, border: `1px solid ${C.border}`, background: C.bgElevated }}>
                <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="flex items-center gap-2" style={sectionLabelStyle}>
                    <MapPin size={16} />
                    Location <span style={{ color: C.danger }}>*</span>
                  </label>
                  <WorkspaceInput
                    required
                    type="text"
                    value={complaintForm.complaintLocation}
                    onChange={(event) =>
                      setComplaintForm((current) => ({ ...current, complaintLocation: event.target.value }))
                    }
                    placeholder="Where did this issue occur?"
                  />
                </div>

                {/* CATEGORY */}
                <div>
                  <label className="flex items-center gap-2" style={sectionLabelStyle}>
                    <Briefcase size={16} />
                    Category <span style={{ color: C.danger }}>*</span>
                  </label>
                  <WorkspaceSelect
                    required
                    value={complaintForm.complaintType}
                    onChange={(event) =>
                      setComplaintForm((current) => ({ ...current, complaintType: event.target.value }))
                    }
                  >
                    <option value="">-- Select category --</option>
                    {complaintCategories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </WorkspaceSelect>
                </div>
              </div>
              </div>

              {/* FILE UPLOAD */}
              <div>
                <label style={sectionLabelStyle}>
                  Supporting Documents
                </label>
                <label className="border-2 border-dashed rounded-xl p-6 cursor-pointer transition-colors block" style={{ borderColor: C.border, background: C.bgElevated }}>
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: C.card, border: `1px solid ${C.border}` }}>
                      <Upload size={24} style={{ color: C.t3 }} />
                    </div>
                    <div className="flex-1">
                      <div style={{ fontWeight: 600, color: C.t1 }}>
                        {complaintForm.files.length > 0
                          ? `${complaintForm.files.length} file(s) selected`
                          : "Click to upload or drag and drop"}
                      </div>
                      <p style={{ fontSize: 11, color: C.t3, marginTop: 4 }}>PDF, images, Excel (max 50 MB per file)</p>
                    </div>
                  </div>

                  {/* 🟢 ENHANCED: File List with Full Details */}
                  {complaintForm.files.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {complaintForm.files.map((file, index) => (
                        <FileCard key={index} file={file} index={index} formType="complaint" />
                      ))}
                    </div>
                  )}

                  <input
                    type="file"
                    multiple
                    accept={ACCEPTED_UPLOAD_TYPES}
                    className="hidden"
                    onChange={(event) => handleFileSelection("complaint", event.target.files)}
                  />
                </label>
              </div>

              {/* SUBMIT */}
              <WorkspaceButton
                type="submit"
                disabled={loading || !complaintForm.title || !complaintForm.details || !complaintForm.complaintLocation || !complaintForm.complaintType}
                style={{ width: "100%", padding: "16px 24px" }}
              >
                {loading ? "Submitting..." : "Submit Complaint"}
              </WorkspaceButton>
            </form>
          </WorkspaceCard>
        )}

        {/* TRACK CASES LINK */}
        {!activeTab && (
          <div className="rounded-xl p-8 text-center" style={{ background: C.purpleDim, border: `1px solid ${C.purple}33` }}>
            <p style={{ color: C.t2, marginBottom: 16 }}>Already submitted a request or complaint?</p>
            <Link
              to={PATHS.citizen.cases}
              className="inline-flex items-center gap-2 px-6 py-3 text-white font-semibold rounded-lg transition-colors"
              style={{ background: C.purple }}
            >
              Track Your Cases
              <ArrowRight size={18} />
            </Link>
          </div>
        )}
      </div>
    </WorkspacePage>
  );
}
