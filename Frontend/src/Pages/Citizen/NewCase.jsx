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

// Helper functions kept for UI logic
function sanitizeSelectedFiles(fileList) {
  return Array.from(fileList || []).filter((file) => file && typeof file.name === "string");
}

function SuccessModal({ open, title, message, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-6 border-b border-green-200">
          <div className="flex items-center justify-center mb-4">
            <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle size={32} className="text-green-600" />
            </div>
          </div>
          <h3 className="text-lg font-bold text-gray-900 text-center">{title}</h3>
        </div>
        <div className="px-6 py-6">
          <p className="text-sm text-gray-600 text-center leading-6">{message}</p>
          <button
            onClick={onClose}
            className="w-full mt-6 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors"
          >
            Continue
          </button>
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
    return { icon: <FileImage size={20} className="text-blue-500" />, color: "blue" };
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
    return { icon: <FileText size={20} className="text-blue-600" />, color: "blue" };
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
    return { icon: <Database size={20} className="text-indigo-600" />, color: "indigo" };
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
    blue: 'bg-blue-50 border-blue-200 group-hover:border-blue-400',
    red: 'bg-red-50 border-red-200 group-hover:border-red-400',
    green: 'bg-green-50 border-green-200 group-hover:border-green-400',
    orange: 'bg-orange-50 border-orange-200 group-hover:border-orange-400',
    yellow: 'bg-yellow-50 border-yellow-200 group-hover:border-yellow-400',
    purple: 'bg-purple-50 border-purple-200 group-hover:border-purple-400',
    pink: 'bg-pink-50 border-pink-200 group-hover:border-pink-400',
    indigo: 'bg-indigo-50 border-indigo-200 group-hover:border-indigo-400',
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

export default function HCMNewCasePage() {
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
    // Admin list fetch removed
  }, []);

  const submitMeeting = async (event) => {
    event.preventDefault();
    console.log("Meeting Form Data:", meetingForm);
    setSuccessModal({
      open: true,
      title: "Action Simulated",
      message: "API call has been removed. Form data logged to console.",
    });
  };

  const submitComplaint = async (event) => {
    event.preventDefault();
    console.log("Complaint Form Data:", complaintForm);
    setSuccessModal({
      open: true,
      title: "Action Simulated",
      message: "API call has been removed. Form data logged to console.",
    });
  };

  // 🟢 NEW: Render file card component
  const FileCard = ({ file, index, formType }) => {
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
        className={`flex items-center justify-between p-4 ${colorClass} border rounded-xl hover:shadow-md transition-all group`}
        onClick={(e) => e.preventDefault()}
      >
        <div className="flex items-center gap-3 overflow-hidden flex-1">
          <div className="p-2.5 bg-white rounded-lg border border-current border-opacity-20 group-hover:shadow-sm transition-all flex-shrink-0">
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-indigo-600 transition-colors" title={file.name}>
              {file.name}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs bg-white bg-opacity-50 px-2 py-0.5 rounded font-medium text-gray-700">
                {fileType}
              </span>
              <span className="text-xs text-gray-500">
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
          className="text-gray-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-lg transition-all ml-2 flex-shrink-0"
        >
          <X size={18} />
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
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
        <div className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
            <button
              onClick={() => {
                setActiveTab("");
                setError("");
              }}
              className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
            >
              <ChevronRight size={20} className="rotate-180" />
              Back to Services
            </button>
            <h2 className="text-xl font-bold text-gray-900">
              {activeTab === "meeting" ? "Meeting Request" : "Submit Complaint"}
            </h2>
            <div className="w-20"></div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* ERROR ALERT */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-red-900">Error</h4>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* SERVICE SELECTION */}
        {!activeTab ? (
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            {/* MEETING REQUEST */}
            <button
              onClick={() => setActiveTab("meeting")}
              className="group relative bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden text-left"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-indigo-100 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative p-8">
                <div className="h-12 w-12 bg-indigo-100 rounded-xl flex items-center justify-center mb-4">
                  <Calendar size={24} className="text-indigo-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Request a Meeting</h3>
                <p className="text-gray-600 text-sm leading-relaxed mb-6">
                  Schedule a meeting with an administration desk. You can specify purpose, add supporting documents, and invite companions.
                </p>
                <div className="flex items-center gap-2 text-indigo-600 font-medium group-hover:gap-3 transition-all duration-300">
                  Get Started
                  <ArrowRight size={18} />
                </div>
              </div>
            </button>

            {/* SUBMIT COMPLAINT */}
            <button
              onClick={() => setActiveTab("complaint")}
              className="group relative bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden text-left"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-emerald-100 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative p-8">
                <div className="h-12 w-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-4">
                  <FileText size={24} className="text-emerald-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Submit a Complaint</h3>
                <p className="text-gray-600 text-sm leading-relaxed mb-6">
                  File a formal complaint regarding any civic or government issue. Supports multiple document formats and categories.
                </p>
                <div className="flex items-center gap-2 text-emerald-600 font-medium group-hover:gap-3 transition-all duration-300">
                  Get Started
                  <ArrowRight size={18} />
                </div>
              </div>
            </button>
          </div>
        ) : activeTab === "meeting" ? (
          // MEETING FORM
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 mb-8">
            <form onSubmit={submitMeeting} className="space-y-8">

              {/* TITLE */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  Meeting Title <span className="text-red-600">*</span>
                </label>
                <input
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* PURPOSE */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  Purpose of Meeting <span className="text-red-600">*</span>
                </label>
                <textarea
                  required
                  value={meetingForm.purpose}
                  onChange={(event) =>
                    setMeetingForm((current) => ({ ...current, purpose: event.target.value }))
                  }
                  placeholder="Explain the purpose of your meeting request in detail"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  rows={5}
                />
              </div>

              {/* DATE AND TIME */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Calendar size={16} />
                    Preferred Date <span className="text-red-600">*</span>
                  </label>
                  <input
                    required
                    type="date"
                    value={meetingForm.preferredDate}
                    onChange={(event) =>
                      setMeetingForm((current) => ({ ...current, preferredDate: event.target.value }))
                    }
                    min={getTomorrowDate()}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-xs text-gray-500 mt-2">Select a date from tomorrow onwards</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Clock size={16} />
                    Preferred Time <span className="text-red-600">*</span>
                  </label>
                  <select
                    required
                    value={meetingForm.preferredTime}
                    onChange={(event) =>
                      setMeetingForm((current) => ({ ...current, preferredTime: event.target.value }))
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="">-- Select time slot --</option>
                    {timeSlots.map((time) => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-2">24-hour slots available • 30-minute intervals</p>
                </div>
              </div>

              {/* ADMIN REFERRAL */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  Admin Desk (Optional)
                </label>
                <select
                  value={meetingForm.referralAdminUserId}
                  onChange={(event) =>
                    setMeetingForm((current) => ({ ...current, referralAdminUserId: event.target.value }))
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                >
                  <option value="">-- Select an admin desk --</option>
                  {admins.map((admin) => (
                    <option key={admin.id} value={admin.id}>
                      {admin.name} · {admin.department}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-2">Not sure? Leave blank to auto-assign.</p>
              </div>

              {/* FILE UPLOAD */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  Supporting Documents (Optional)
                </label>
                <label className="border-2 border-dashed border-gray-300 rounded-lg p-6 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-colors block">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Upload size={24} className="text-gray-400" />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">
                        {meetingForm.files.length > 0
                          ? `${meetingForm.files.length} file(s) selected`
                          : "Click to upload or drag and drop"}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">PDF, images, or office documents</p>
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
                    className="hidden"
                    onChange={(event) =>
                      setMeetingForm((current) => ({
                        ...current,
                        files: sanitizeSelectedFiles(event.target.files),
                      }))
                    }
                  />
                </label>
              </div>

              {/* COMPANIONS */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
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
                        className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                        className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                        className="px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
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
                    className="px-4 py-3 border border-indigo-300 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors font-medium"
                  >
                    + Add Person
                  </button>
                </div>
              </div>

              {/* SUBMIT */}
              <button
                type="submit"
                disabled={loading || !meetingForm.title || !meetingForm.purpose || !meetingForm.preferredDate || !meetingForm.preferredTime}
                className="w-full px-6 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors"
              >
                {loading ? "Submitting..." : "Submit Meeting Request"}
              </button>
            </form>
          </div>
        ) : (
          // COMPLAINT FORM
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 mb-8">
            <form onSubmit={submitComplaint} className="space-y-8">
              {/* TITLE */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  Complaint Title <span className="text-red-600">*</span>
                </label>
                <input
                  required
                  type="text"
                  value={complaintForm.title}
                  onChange={(event) =>
                    setComplaintForm((current) => ({ ...current, title: event.target.value }))
                  }
                  placeholder="Brief title of your complaint"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* DETAILS */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  Complaint Details <span className="text-red-600">*</span>
                </label>
                <textarea
                  required
                  value={complaintForm.details}
                  onChange={(event) =>
                    setComplaintForm((current) => ({ ...current, details: event.target.value }))
                  }
                  placeholder="Provide detailed description of the issue"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  rows={6}
                />
              </div>

              {/* LOCATION */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <MapPin size={16} />
                    Location <span className="text-red-600">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    value={complaintForm.complaintLocation}
                    onChange={(event) =>
                      setComplaintForm((current) => ({ ...current, complaintLocation: event.target.value }))
                    }
                    placeholder="Where did this issue occur?"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* CATEGORY */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Briefcase size={16} />
                    Category <span className="text-red-600">*</span>
                  </label>
                  <select
                    required
                    value={complaintForm.complaintType}
                    onChange={(event) =>
                      setComplaintForm((current) => ({ ...current, complaintType: event.target.value }))
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="">-- Select category --</option>
                    {complaintCategories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* FILE UPLOAD */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  Supporting Documents
                </label>
                <label className="border-2 border-dashed border-gray-300 rounded-lg p-6 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-colors block">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Upload size={24} className="text-gray-400" />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">
                        {complaintForm.files.length > 0
                          ? `${complaintForm.files.length} file(s) selected`
                          : "Click to upload or drag and drop"}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">PDF, images, Excel (max 50 MB per file)</p>
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
                    accept=".pdf,.png,.jpg,.jpeg,.webp,.xls,.xlsx"
                    className="hidden"
                    onChange={(event) =>
                      setComplaintForm((current) => ({
                        ...current,
                        files: sanitizeSelectedFiles(event.target.files),
                      }))
                    }
                  />
                </label>
              </div>

              {/* SUBMIT */}
              <button
                type="submit"
                disabled={loading || !complaintForm.title || !complaintForm.details || !complaintForm.complaintLocation || !complaintForm.complaintType}
                className="w-full px-6 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors"
              >
                {loading ? "Submitting..." : "Submit Complaint"}
              </button>
            </form>
          </div>
        )}

        {/* TRACK CASES LINK */}
        {!activeTab && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-8 text-center">
            <p className="text-gray-700 mb-4">Already submitted a request or complaint?</p>
            <Link
              to="/my-cases"
              className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors"
            >
              Track Your Cases
              <ArrowRight size={18} />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}