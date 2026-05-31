import { useEffect, useRef, useState } from "react";
import {
  FileText, CheckCircle, AlertCircle, Users, Upload, Phone,
  ChevronRight, Calendar, MapPin, X, ArrowRight, Home, Clock,
  File, FileImage, FileSpreadsheet, FileJson, FileAudio,
  FileVideo, FileArchive, FileCode, FileCheck, FileX, FileBarChart,
  Database, Presentation
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FaFilePdf } from "react-icons/fa";
import { sanitizeSelectedFiles as sanitizeUploadedFiles } from "../../../shared/security/files.js";
import { apiClient } from "../../../shared/api/client.js";
import { uploadPrivateFile } from "../../../shared/api/privateFiles.js";
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
  const { t } = useTranslation();
  if (!open) return null;
  return (
    <div
      className="fixed z-[120] flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm"
      style={{
        top: 0,
        right: 0,
        bottom: 0,
        left: "var(--portal-sidebar-width, 280px)",
      }}
    >
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
            {t("common.continue")}
          </WorkspaceButton>
        </div>
      </div>
    </div>
  );
}

function CustomDatePicker({ value, onChange, min, max, placeholder = "Select date" }) {
  const { C } = usePortalTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [openDirection, setOpenDirection] = useState("down");
  const [viewMode, setViewMode] = useState("day");
  const rootRef = useRef(null);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    if (value) return parseDateValue(value);
    return parseDateValue(min) || parseDateValue(max) || new Date();
  });

  useEffect(() => {
    if (!isOpen) return undefined;

    const updateDirection = () => {
      const root = rootRef.current;
      if (!root) return;
      const rect = root.getBoundingClientRect();
      const dropdownHeight = 340;
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      setOpenDirection(spaceBelow < dropdownHeight && spaceAbove > spaceBelow ? "up" : "down");
    };

    updateDirection();

    const handlePointerDown = (event) => {
      const pickerRoot = event.target.closest?.('[data-appointment-date-picker="true"]');
      if (!pickerRoot) {
        setIsOpen(false);
        setViewMode("day");
      }
    };

    window.addEventListener("resize", updateDirection);
    window.addEventListener("scroll", updateDirection, true);
    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      window.removeEventListener("resize", updateDirection);
      window.removeEventListener("scroll", updateDirection, true);
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!value) return;
    const parsedValue = parseDateValue(value);
    if (parsedValue) {
      setVisibleMonth(parsedValue);
    }
  }, [value]);

  const monthStart = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
  const minDate = parseDateValue(min);
  const maxDate = parseDateValue(max);
  const days = buildCalendarDays(monthStart);
  const yearStart = Math.floor(visibleMonth.getFullYear() / 12) * 12;

  const isPrevDisabled = minDate && new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1) < new Date(minDate.getFullYear(), minDate.getMonth(), 1);
  const isNextDisabled = maxDate && new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1) > new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);

  function isMonthDisabled(monthIndex) {
    const firstDay = new Date(visibleMonth.getFullYear(), monthIndex, 1);
    const lastDay = new Date(visibleMonth.getFullYear(), monthIndex + 1, 0);
    if (minDate && lastDay < minDate) return true;
    if (maxDate && firstDay > maxDate) return true;
    return false;
  }

  function isYearDisabled(year) {
    const firstDay = new Date(year, 0, 1);
    const lastDay = new Date(year, 11, 31);
    if (minDate && lastDay < minDate) return true;
    if (maxDate && firstDay > maxDate) return true;
    return false;
  }

  return (
    <div ref={rootRef} data-appointment-date-picker="true" style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        style={{
          width: "100%",
          minHeight: 42,
          padding: "10px 14px",
          border: `1px solid ${C.border}`,
          background: C.inp,
          color: value ? C.t1 : C.t3,
          fontSize: 13,
          outline: "none",
          borderRadius: "var(--portal-radius-sm, 10px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
        }}
      >
        <span>{value ? formatDisplayDate(value) : placeholder}</span>
        <Calendar size={16} style={{ color: C.t3 }} />
      </button>

      {isOpen ? (
        <div
          style={{
            position: "absolute",
            top: openDirection === "down" ? "calc(100% + 6px)" : "auto",
            bottom: openDirection === "up" ? "calc(100% + 6px)" : "auto",
            left: 0,
            width: "100%",
            minWidth: 280,
            zIndex: 30,
            padding: 12,
            borderRadius: 12,
            border: `1px solid ${C.border}`,
            background: C.card,
            boxShadow: "0 16px 36px rgba(15, 23, 42, 0.14)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, gap: 8 }}>
            <button
              type="button"
              disabled={isPrevDisabled}
              onClick={() => {
                if (isPrevDisabled) return;
                if (viewMode === "year") {
                  setVisibleMonth((current) => new Date(current.getFullYear() - 12, current.getMonth(), 1));
                } else {
                  setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1));
                }
              }}
              style={{ ...calendarNavButtonStyle(C), opacity: isPrevDisabled ? 0.3 : 1, cursor: isPrevDisabled ? "not-allowed" : "pointer" }}
            >
              <ChevronRight size={16} style={{ transform: "rotate(180deg)" }} />
            </button>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => setViewMode("month")}
                style={{ border: "none", background: "transparent", color: C.t1, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
              >
                {monthStart.toLocaleString("en-US", { month: "long" })}
              </button>
              <button
                type="button"
                onClick={() => setViewMode("year")}
                style={{ border: "none", background: "transparent", color: C.t1, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
              >
                {monthStart.getFullYear()}
              </button>
            </div>
            <button
              type="button"
              disabled={isNextDisabled}
              onClick={() => {
                if (isNextDisabled) return;
                if (viewMode === "year") {
                  setVisibleMonth((current) => new Date(current.getFullYear() + 12, current.getMonth(), 1));
                } else {
                  setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1));
                }
              }}
              style={{ ...calendarNavButtonStyle(C), opacity: isNextDisabled ? 0.3 : 1, cursor: isNextDisabled ? "not-allowed" : "pointer" }}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {viewMode === "day" ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 4 }}>
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                <div key={day} style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: C.t3, padding: "6px 0" }}>
                  {day}
                </div>
              ))}
              {days.map((day) => {
                const dayValue = formatDateValue(day);
                const isCurrentMonth = day.getMonth() === monthStart.getMonth();
                const isDisabled = (minDate && dayValue < min) || (maxDate && dayValue > max) || !isCurrentMonth;
                const isSelected = value === dayValue;

                return (
                  <button
                    key={dayValue}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => {
                      onChange(dayValue);
                      setIsOpen(false);
                      setViewMode("day");
                    }}
                    style={{
                      height: 34,
                      borderRadius: 8,
                      border: `1px solid ${isSelected ? C.purple : "transparent"}`,
                      background: isSelected ? C.purple : "transparent",
                      color: isSelected ? "#ffffff" : isCurrentMonth ? C.t1 : C.t3,
                      opacity: isDisabled ? 0.35 : 1,
                      cursor: isDisabled ? "not-allowed" : "pointer",
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {day.getDate()}
                  </button>
                );
              })}
            </div>
          ) : null}

          {viewMode === "month" ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
              {Array.from({ length: 12 }, (_, monthIndex) => {
                const disabled = isMonthDisabled(monthIndex);
                const selected = monthIndex === visibleMonth.getMonth();

                return (
                  <button
                    key={monthIndex}
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      setVisibleMonth((current) => new Date(current.getFullYear(), monthIndex, 1));
                      setViewMode("day");
                    }}
                    style={{
                      minHeight: 36,
                      borderRadius: 8,
                      border: `1px solid ${selected ? C.purple : C.border}`,
                      background: selected ? `${C.purple}12` : "transparent",
                      color: C.t1,
                      opacity: disabled ? 0.35 : 1,
                      cursor: disabled ? "not-allowed" : "pointer",
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {new Date(2000, monthIndex, 1).toLocaleString("en-US", { month: "short" })}
                  </button>
                );
              })}
            </div>
          ) : null}

          {viewMode === "year" ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
              {Array.from({ length: 12 }, (_, index) => {
                const year = yearStart + index;
                const disabled = isYearDisabled(year);
                const selected = year === visibleMonth.getFullYear();

                return (
                  <button
                    key={year}
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      setVisibleMonth((current) => new Date(year, current.getMonth(), 1));
                      setViewMode("month");
                    }}
                    style={{
                      minHeight: 36,
                      borderRadius: 8,
                      border: `1px solid ${selected ? C.purple : C.border}`,
                      background: selected ? `${C.purple}12` : "transparent",
                      color: C.t1,
                      opacity: disabled ? 0.35 : 1,
                      cursor: disabled ? "not-allowed" : "pointer",
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {year}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function CustomTimePicker({ value, onChange, options }) {
  const { C } = usePortalTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [openDirection, setOpenDirection] = useState("down");
  const rootRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    const updateDirection = () => {
      const root = rootRef.current;
      if (!root) return;
      const rect = root.getBoundingClientRect();
      const dropdownHeight = 232;
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      setOpenDirection(spaceBelow < dropdownHeight && spaceAbove > spaceBelow ? "up" : "down");
    };

    updateDirection();

    const handlePointerDown = (event) => {
      const pickerRoot = event.target.closest?.('[data-appointment-time-picker="true"]');
      if (!pickerRoot) {
        setIsOpen(false);
      }
    };

    window.addEventListener("resize", updateDirection);
    window.addEventListener("scroll", updateDirection, true);
    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      window.removeEventListener("resize", updateDirection);
      window.removeEventListener("scroll", updateDirection, true);
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [isOpen]);

  return (
    <div ref={rootRef} data-appointment-time-picker="true" style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        style={{
          width: "100%",
          minHeight: 42,
          padding: "10px 14px",
          border: `1px solid ${C.border}`,
          background: C.inp,
          color: value ? C.t1 : C.t3,
          fontSize: 13,
          outline: "none",
          borderRadius: "var(--portal-radius-sm, 10px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
        }}
      >
        <span>{value || "Select time slot"}</span>
        <Clock size={16} style={{ color: C.t3 }} />
      </button>

      {isOpen ? (
        <div
          style={{
            position: "absolute",
            top: openDirection === "down" ? "calc(100% + 6px)" : "auto",
            bottom: openDirection === "up" ? "calc(100% + 6px)" : "auto",
            left: 0,
            width: "100%",
            zIndex: 30,
            maxHeight: 220,
            overflowY: "auto",
            padding: 6,
            borderRadius: 12,
            border: `1px solid ${C.border}`,
            background: C.card,
            boxShadow: "0 16px 36px rgba(15, 23, 42, 0.14)",
          }}
        >
          <button
            type="button"
            onClick={() => {
              onChange("");
              setIsOpen(false);
            }}
            style={{
              width: "100%",
              minHeight: 34,
              borderRadius: 8,
              border: "none",
              background: "transparent",
              color: C.t3,
              textAlign: "left",
              padding: "8px 10px",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            Select time slot
          </button>
          {options.map((option) => {
            const isSelected = value === option;

            return (
              <button
                key={option}
                type="button"
                onClick={() => {
                  onChange(option);
                  setIsOpen(false);
                }}
                style={{
                  width: "100%",
                  minHeight: 34,
                  borderRadius: 8,
                  border: `1px solid ${isSelected ? C.purple : "transparent"}`,
                  background: isSelected ? C.purple : "transparent",
                  color: isSelected ? "#ffffff" : C.t1,
                  textAlign: "left",
                  padding: "8px 10px",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                {option}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

const getFileIcon = (fileName) => {
  if (!fileName) return { icon: <File size={20} className="text-gray-500" />, color: "gray" };

  const ext = fileName?.split('.').pop().toLowerCase();

  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'tiff', 'ico'].includes(ext)) {
    return { icon: <FileImage size={20} className="text-slate-600" />, color: "soft" };
  }
  if (ext === 'pdf') {
    return { icon: <FaFilePdf size={20} className="text-red-500" />, color: "red" };
  }
  if (['xls', 'xlsx', 'csv', 'tsv', 'ods'].includes(ext)) {
    return { icon: <FileSpreadsheet size={20} className="text-green-500" />, color: "green" };
  }
  if (['ppt', 'pptx', 'odp', 'key'].includes(ext)) {
    return { icon: <Presentation size={20} className="text-orange-500" />, color: "orange" };
  }
  if (['doc', 'docx', 'txt', 'rtf', 'odt', 'pages'].includes(ext)) {
    return { icon: <FileText size={20} className="text-slate-700" />, color: "soft" };
  }
  if (ext === 'json') {
    return { icon: <FileJson size={20} className="text-yellow-600" />, color: "yellow" };
  }
  if (['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'cpp', 'c', 'html', 'css', 'scss', 'php', 'rb', 'go', 'rs'].includes(ext)) {
    return { icon: <FileCode size={20} className="text-purple-600" />, color: "purple" };
  }
  if (['mp3', 'wav', 'flac', 'aac', 'm4a', 'ogg', 'wma', 'aiff'].includes(ext)) {
    return { icon: <FileAudio size={20} className="text-pink-500" />, color: "pink" };
  }
  if (['mp4', 'avi', 'mov', 'mkv', 'flv', 'wmv', 'webm', 'mpg', '3gp'].includes(ext)) {
    return { icon: <FileVideo size={20} className="text-red-600" />, color: "red" };
  }
  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'iso'].includes(ext)) {
    return { icon: <FileArchive size={20} className="text-purple-500" />, color: "purple" };
  }
  if (['db', 'sqlite', 'mdb', 'sql'].includes(ext)) {
    return { icon: <Database size={20} className="text-slate-700" />, color: "soft" };
  }
  if (['todo', 'checklist'].includes(ext)) {
    return { icon: <FileCheck size={20} className="text-green-600" />, color: "green" };
  }
  return { icon: <File size={20} className="text-gray-500" />, color: "gray" };
};


const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

const getFileTypeLabel = (fileName) => {
  if (!fileName) return 'Unknown';
  const ext = fileName?.split('.').pop().toLowerCase();
  const typeMap = {
    'jpg': 'JPEG Image', 'jpeg': 'JPEG Image', 'png': 'PNG Image', 'gif': 'GIF Image', 'webp': 'WebP Image', 'svg': 'SVG Image', 'bmp': 'Bitmap Image', 'tiff': 'TIFF Image', 'ico': 'Icon',
    'pdf': 'PDF Document',
    'xls': 'Excel Sheet', 'xlsx': 'Excel Workbook', 'csv': 'CSV File', 'tsv': 'TSV File', 'ods': 'OpenDocument Spreadsheet',
    'ppt': 'PowerPoint', 'pptx': 'PowerPoint Presentation', 'odp': 'OpenDocument Presentation', 'key': 'Keynote Presentation',
    'doc': 'Word Document', 'docx': 'Word Document', 'txt': 'Text File', 'rtf': 'Rich Text', 'odt': 'OpenDocument Text', 'pages': 'Pages Document',
    'json': 'JSON File', 'js': 'JavaScript', 'jsx': 'React Component', 'ts': 'TypeScript', 'tsx': 'TSX File', 'py': 'Python', 'java': 'Java', 'cpp': 'C++', 'c': 'C File', 'html': 'HTML', 'css': 'CSS', 'scss': 'SCSS', 'php': 'PHP', 'rb': 'Ruby', 'go': 'Go', 'rs': 'Rust',
    'mp3': 'MP3 Audio', 'wav': 'WAV Audio', 'flac': 'FLAC Audio', 'aac': 'AAC Audio', 'm4a': 'M4A Audio', 'ogg': 'OGG Audio', 'wma': 'WMA Audio', 'aiff': 'AIFF Audio',
    'mp4': 'MP4 Video', 'avi': 'AVI Video', 'mov': 'MOV Video', 'mkv': 'MKV Video', 'flv': 'FLV Video', 'wmv': 'WMV Video', 'webm': 'WebM Video', 'mpg': 'MPEG Video', '3gp': '3GP Video',
    'zip': 'ZIP Archive', 'rar': 'RAR Archive', '7z': '7Z Archive', 'tar': 'TAR Archive', 'gz': 'GZIP Archive', 'bz2': 'BZIP2 Archive', 'iso': 'ISO Image',
    'db': 'Database', 'sqlite': 'SQLite Database', 'mdb': 'Access Database', 'sql': 'SQL File',
  };
  return typeMap[ext] || ext.toUpperCase() + ' File';
};

const getTomorrowDate = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split('T')[0];
};

const getTodayDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseDateValue = (value) => {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

const formatDateValue = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const MONTH_NAMES_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const formatDisplayDate = (value) => {
  const parsedDate = parseDateValue(value);
  if (!parsedDate) return "";
  const day = String(parsedDate.getDate()).padStart(2, "0");
  const mon = MONTH_NAMES_SHORT[parsedDate.getMonth()];
  const year = String(parsedDate.getFullYear()).slice(-2);
  return `${day} ${mon},${year}`;
};

const buildCalendarDays = (monthStart) => {
  const startDay = monthStart.getDay();
  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - startDay);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return date;
  });
};

const calendarNavButtonStyle = (C) => ({
  width: 28,
  height: 28,
  borderRadius: 8,
  border: `1px solid ${C.border}`,
  background: C.bgElevated,
  color: C.t2,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
});

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
  const { t } = useTranslation();

  const timeSlots = [
    "12:00 AM", "12:30 AM", "01:00 AM", "01:30 AM", "02:00 AM", "02:30 AM",
    "03:00 AM", "03:30 AM", "04:00 AM", "04:30 AM", "05:00 AM", "05:30 AM",
    "06:00 AM", "06:30 AM", "07:00 AM", "07:30 AM", "08:00 AM", "08:30 AM",
    "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
    "12:00 PM", "12:30 PM", "01:00 PM", "01:30 PM", "02:00 PM", "02:30 PM",
    "03:00 PM", "03:30 PM", "04:00 PM", "04:30 PM", "05:00 PM", "05:30 PM",
    "06:00 PM", "06:30 PM", "07:00 PM", "07:30 PM", "08:00 PM", "08:30 PM",
    "09:00 PM", "09:30 PM", "10:00 PM", "10:30 PM", "11:00 PM", "11:30 PM"
  ];

  const [activeTab, setActiveTab] = useState("");
  const [admins, setAdmins] = useState([]);
  const [error, setError] = useState("");
  const [successModal, setSuccessModal] = useState({ open: false, title: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [isBackHovered, setIsBackHovered] = useState(false);
  const [isAddPersonHovered, setIsAddPersonHovered] = useState(false);
  const [hoveredRemoveIndex, setHoveredRemoveIndex] = useState(null);
  const [appointmentFileError, setAppointmentFileError] = useState("");
  const [grievanceFileError, setGrievanceFileError] = useState("");
  const navigate = useNavigate();
  const appointmentFileInputRef = useRef(null);
  const grievanceFileInputRef = useRef(null);
  const { session } = useAuth();

  const [appointmentForm, setAppointmentForm] = useState({
    title: "",
    purpose: "",
    referralAdminUserId: "",
    preferredDate: "",
    preferredTime: "",
    files: [],
    companions: [{ name: "", phone: "" }],
  });

  const [grievanceForm, setGrievanceForm] = useState({
    title: "",
    details: "",
    state: "",
    district: "",
    incidentDate: "",
    files: [],
  });

  useEffect(() => {
    let mounted = true;

    async function loadAdminDirectory() {
      if (!session?.role) {
        return;
      }

      try {
        const { data } = await apiClient.get("/citizen/admin-directory");
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
  }, [session?.role]);

  useEffect(() => {
    setIsBackHovered(false);
  }, [activeTab]);

  const sectionLabelStyle = {
    display: "block",
    color: C.t2,
    textTransform: "uppercase",
    marginBottom: 8,
  };

  const textareaStyle = {
    width: "100%",
    padding: "9px 14px",
    border: `1px solid ${C.border}`,
    borderRadius: 12,
    background: C.inp,
    color: C.t1,
    fontSize: 14,
    lineHeight: 1.45,
    outline: "none",
  };

  const errorTextStyle = {
    color: C.danger,
    fontSize: "12px",
    marginTop: "6px",
    fontStyle: "italic",
    fontWeight: 500,
  };
  const backButtonAccent = C.purple;

  const uploadSelectedFiles = async ({ files, contextType, contextId }) => {
    for (const file of files) {
      await uploadPrivateFile({
        file,
        contextType,
        contextId,
        role: "citizen",
      });
    }
  };

  const submitAppointment = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const referralAdmin = admins.find((admin) => admin.id === appointmentForm.referralAdminUserId);
      const preferredTimeIso = toIsoFromDateAndSlot(appointmentForm.preferredDate, appointmentForm.preferredTime);

      const payload = new FormData();
      payload.append("title", appointmentForm.title);
      payload.append("purpose", appointmentForm.purpose);
      payload.append("preferredTime", preferredTimeIso);
      payload.append("adminReferral", referralAdmin ? `${referralAdmin.name} · ${referralAdmin.department}` : "");
      payload.append("referralAdminUserId", appointmentForm.referralAdminUserId || "");
      payload.append(
        "additionalAttendees",
        JSON.stringify(
          appointmentForm.companions
            .filter((entry) => entry.name.trim() && entry.phone.trim())
            .map((entry) => ({ attendeeName: entry.name.trim(), attendeePhone: entry.phone.trim() }))
        )
      );
      const xsrfMatch = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/);
      const xsrfToken = xsrfMatch ? decodeURIComponent(xsrfMatch[1]) : null;
      const { data } = await apiClient.post("/appointments/request", payload, {
        headers: {
          "Idempotency-Key": crypto.randomUUID(),
          ...(xsrfToken && { "X-XSRF-TOKEN": xsrfToken }),
        },
      });

      if (appointmentForm.files.length > 0 && data?.appointment?.id) {
        try {
          await uploadSelectedFiles({
            files: appointmentForm.files,
            contextType: "appointment",
            contextId: data.appointment.id,
          });
        } catch (uploadError) {
          setSuccessModal({
            open: true,
            title: t("citizen.newCase.appointmentSubmitted"),
            message: t("citizen.newCase.appointmentSubmittedPartial"),
          });
          setAppointmentForm({
            title: "",
            purpose: "",
            referralAdminUserId: "",
            preferredDate: "",
            preferredTime: "",
            files: [],
            companions: [{ name: "", phone: "" }],
          });
          return;
        }
      }

      setSuccessModal({
        open: true,
        title: t("citizen.newCase.appointmentSubmitted"),
        message: referralAdmin
          ? t("citizen.newCase.appointmentSubmittedMsgDirect")
          : t("citizen.newCase.appointmentSubmittedMsgPool"),
      });
      setAppointmentForm({
        title: "",
        purpose: "",
        referralAdminUserId: "",
        preferredDate: "",
        preferredTime: "",
        files: [],
        companions: [{ name: "", phone: "" }],
      });
    } catch (submissionError) {
      setError(submissionError?.response?.data?.error || t("citizen.newCase.unableToSubmitAppointment"));
    } finally {
      setLoading(false);
    }
  };

  const submitGrievance = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const payload = new FormData();
      payload.append("subject", grievanceForm.title);
      payload.append("description", grievanceForm.details);
      payload.append("state", grievanceForm.state);
      payload.append("district", grievanceForm.district);
      payload.append("incidentDate", grievanceForm.incidentDate);

      const xsrfMatchG = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/);
      const xsrfTokenG = xsrfMatchG ? decodeURIComponent(xsrfMatchG[1]) : null;
      const { data } = await apiClient.post("/grievances", payload, {
        headers: {
          "Idempotency-Key": crypto.randomUUID(),
          ...(xsrfTokenG && { "X-XSRF-TOKEN": xsrfTokenG }),
        },
      });

      let uploadFailed = false;
      if (grievanceForm.files.length > 0 && data?.grievance?.id) {
        try {
          await uploadSelectedFiles({
            files: grievanceForm.files,
            contextType: "grievance",
            contextId: data.grievance.id,
          });
        } catch (_uploadError) {
          uploadFailed = true;
        }
      }

      setSuccessModal({
        open: true,
        title: t("citizen.newCase.grievanceSubmitted"),
        message: uploadFailed
          ? t("citizen.newCase.grievanceSubmittedPartial")
          : t("citizen.newCase.grievanceSubmittedMsg"),
      });
      setGrievanceForm({
        title: "",
        details: "",
        state: "",
        district: "",
        incidentDate: "",
        files: [],
      });
    } catch (submissionError) {
      setError(submissionError?.response?.data?.error || "Unable to submit the grievance");
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelection = (formType, fileList) => {
    const setFileError = formType === "appointment" ? setAppointmentFileError : setGrievanceFileError;
    const currentFiles = formType === "appointment" ? appointmentForm.files : grievanceForm.files;
    const remainingSlots = Math.max(0, 5 - currentFiles.length);

    if (remainingSlots === 0) {
      setFileError("You can upload a maximum of 5 files.");
      return;
    }

    const { acceptedFiles, rejectedFiles } = sanitizeUploadedFiles(fileList, FILE_UPLOAD_OPTIONS);

    if (rejectedFiles.length > 0) {
      setError("Some files were rejected. Allowed types: PDF, PNG, JPG, WEBP, XLS, XLSX, DOC, DOCX, TXT. Max 10 MB each.");
    } else {
      setError("");
    }

    const filesToAdd = acceptedFiles.slice(0, remainingSlots);
    if (acceptedFiles.length > remainingSlots) {
      setFileError(`Only ${filesToAdd.length} file(s) added. Maximum 5 files allowed.`);
    } else {
      setFileError("");
    }

    if (formType === "appointment") {
      setAppointmentForm((current) => ({
        ...current,
        files: [...current.files, ...filesToAdd],
      }));
      return;
    }

    setGrievanceForm((current) => ({
      ...current,
      files: [...current.files, ...filesToAdd],
    }));
  };

  const FileCard = ({ file, index, formType }) => {
    const hoverAccent = C.purple;
    const { icon } = getFileIcon(file.name);
    const fileType = getFileTypeLabel(file.name);

    const handleRemove = (idx) => {
      if (formType === 'appointment') {
        setAppointmentFileError("");
        setAppointmentForm((current) => ({
          ...current,
          files: current.files.filter((_, i) => i !== idx),
        }));
      } else {
        setGrievanceFileError("");
        setGrievanceForm((current) => ({
          ...current,
          files: current.files.filter((_, i) => i !== idx),
        }));
      }
    };

    return (
      <div
        key={index}
        className="flex items-center justify-between p-4 border rounded-xl transition-[opacity,border-color] duration-200 hover:opacity-95 group"
        style={{ borderColor: `${C.purple}4D` }}
        onClick={(e) => e.preventDefault()}
      >
        <div className="flex items-center gap-3 overflow-hidden flex-1">
          <div className="p-2.5 rounded-lg border border-current border-opacity-20 transition-colors flex-shrink-0" style={{ background: C.bgElevated }}>
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="portal-citizen-value truncate transition-colors" style={{ fontWeight: 600, color: C.t1 }} title={file.name}>
              {file.name}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="portal-citizen-caption" style={{ background: C.bgElevated, border: `1px solid ${C.borderLight}`, padding: "2px 8px", borderRadius: 6, fontWeight: 500, color: C.t2 }}>
                {fileType}
              </span>
              <span className="portal-citizen-caption" style={{ color: C.t3 }}>
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

  // Check if any companion has an invalid phone number to disable the submit button
  const isAppointmentFormInvalid =
    !appointmentForm.title ||
    !appointmentForm.purpose ||
    !appointmentForm.preferredDate ||
    !appointmentForm.preferredTime ||
    appointmentForm.companions.some(c => c.phone.length > 0 && (!/^[6-9]/.test(c.phone) || c.phone.length < 10));
  return (
    <WorkspacePage
      width={1440}
      outerStyle={!activeTab ? { height: "100%", overflow: "hidden" } : undefined}
    >
      <SuccessModal
        open={successModal.open}
        title={successModal.title}
        message={successModal.message}
        onClose={() => {
          setSuccessModal((current) => ({ ...current, open: false }));
          setActiveTab("");
        }}
      />
      <div style={{ width: "100%", paddingTop: activeTab ? 8 : 0, paddingBottom: activeTab ? 8 : 0 }}>

        {/* HEADER */}
        {activeTab && (
          <div className="mb-4" style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center" }}>
            <div style={{ justifySelf: "start" }}>
              <button
                onMouseEnter={() => setIsBackHovered(true)}
                onMouseLeave={() => setIsBackHovered(false)}
                onClick={() => {
                  setIsBackHovered(false);
                  setActiveTab("");
                  setError("");
                }}
                className="flex items-center gap-1.5 font-medium transition-colors"
                style={{
                  border: `1px solid ${backButtonAccent}`,
                  background: isBackHovered ? backButtonAccent : "transparent",
                  color: isBackHovered ? "#ffffff" : backButtonAccent,
                  fontSize: 13,
                  padding: "8px 8px",
                  borderRadius: 10,
                }}
              >
                <ChevronRight size={16} className="rotate-180" />
                {t("common.back")}
              </button>
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 600, color: C.t1, margin: 0, textAlign: "center" }}>
              {activeTab === "appointment" ? t("citizen.newCase.appointmentFormTitle") : t("citizen.newCase.grievanceFormTitle")}
            </h2>
            <div />
          </div>
        )}

        {/* ERROR ALERT */}
        {error && (
          <div className="mb-6 p-4 flex items-start gap-3" style={{ background: `${C.danger}12`, border: `1px solid ${C.danger}4D`, borderRadius: 10 }}>
            <AlertCircle size={20} style={{ color: C.danger, flexShrink: 0, marginTop: 2 }} />
            <div>
              <h4 style={{ fontWeight: 600, color: C.danger }}>{t("common.error")}</h4>
              <p style={{ fontSize: 13, color: C.danger, marginTop: 4 }}>{error}</p>
            </div>
          </div>
        )}

        {/* SERVICE SELECTION */}
        {!activeTab ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div className="grid md:grid-cols-2 gap-6">
              {/* APPOINTMENT REQUEST */}
              <button
                onClick={() => {
                  setIsBackHovered(false);
                  setActiveTab("appointment");
                }}
                className="group relative rounded-xl border overflow-hidden text-left transition-all duration-300 hover:-translate-y-1 hover:scale-[1.01] hover:opacity-[0.99]"
                style={{
                  background: C.card,
                  borderColor: C.border,
                  boxShadow: `0 18px 36px rgba(15, 23, 42, 0.08), 0 0 0 0 ${C.purple}00`,
                  minHeight: 340,
                }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.boxShadow = `0 22px 44px rgba(15, 23, 42, 0.12), 0 0 28px ${C.purple}55`;
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.boxShadow = `0 18px 36px rgba(15, 23, 42, 0.08), 0 0 0 0 ${C.purple}00`;
                }}
              >
                <div className="relative p-10" style={{ minHeight: 340, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div
                    className="h-14 w-14 rounded-xl flex items-center justify-center mb-5"
                    style={{ background: C.purpleDim }}
                  >
                    <Calendar size={26} style={{ color: C.purple }} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: 22, fontWeight: 600, color: C.t1, marginBottom: 10 }}>{t("citizen.newCase.requestAppointment")}</h3>
                    <p style={{ color: C.t2, fontSize: 14, lineHeight: 1.7, marginBottom: 28, maxWidth: 520 }}>
                      {t("citizen.newCase.appointmentDesc")}
                    </p>
                  </div>
                  <div
                    className="flex items-center gap-2 font-medium group-hover:gap-3 group-hover:translate-x-1 transition-all duration-300"
                    style={{ color: C.purple, marginTop: 12 }}
                  >
                    <span>{t("common.getStarted")}</span>
                    <ArrowRight size={18} className="group-hover:scale-110 transition-transform duration-300" />
                  </div>
                </div>
              </button>

              {/* SUBMIT GRIEVANCE */}
              <button
                onClick={() => {
                  setIsBackHovered(false);
                  setActiveTab("grievance");
                }}
                className="group relative rounded-xl border overflow-hidden text-left transition-all duration-300 hover:-translate-y-1 hover:scale-[1.01] hover:opacity-[0.99]"
                style={{
                  background: C.card,
                  borderColor: C.border,
                  boxShadow: `0 18px 36px rgba(15, 23, 42, 0.08), 0 0 0 0 ${C.mint}00`,
                  minHeight: 340,
                }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.boxShadow = `0 22px 44px rgba(15, 23, 42, 0.12), 0 0 28px ${C.mint}55`;
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.boxShadow = `0 18px 36px rgba(15, 23, 42, 0.08), 0 0 0 0 ${C.mint}00`;
                }}
              >
                <div className="relative p-10" style={{ minHeight: 340, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div
                    className="h-14 w-14 rounded-xl flex items-center justify-center mb-5"
                    style={{ background: `${C.mint}20` }}
                  >
                    <FileText size={26} style={{ color: C.mint }} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: 22, fontWeight: 600, color: C.t1, marginBottom: 10 }}>{t("citizen.newCase.submitGrievance")}</h3>
                    <p style={{ color: C.t2, fontSize: 14, lineHeight: 1.7, marginBottom: 28, maxWidth: 520 }}>
                      {t("citizen.newCase.grievanceDesc")}
                    </p>
                  </div>
                  <div
                    className="flex items-center gap-2 font-medium group-hover:gap-3 group-hover:translate-x-1 transition-all duration-300"
                    style={{ color: C.mint, marginTop: 12 }}
                  >
                    <span>{t("common.getStarted")}</span>
                    <ArrowRight size={18} className="group-hover:scale-110 transition-transform duration-300" />
                  </div>
                </div>
              </button>
            </div>

            <div
              style={{
                marginTop: 32,
                borderRadius: 18,
                padding: "20px 24px",
                background: `linear-gradient(135deg, ${C.purpleDim} 0%, ${C.card} 46%, ${`${C.mint}12`} 100%)`,
                border: `1px solid ${C.border}`,
                display: "grid",
                gap: 16,
                gridTemplateColumns: "minmax(0, 1.5fr) minmax(280px, 0.9fr)",
              }}
            >
              <div>
                <h2 style={{ margin: 0, fontSize: 28, lineHeight: 1.12, fontWeight: 700, color: C.t1, maxWidth: 640 }}>
                  Start a request, attach proof, and track every update from one place.
                </h2>
                <p style={{ margin: "12px 0 0", maxWidth: 680, color: C.t2, fontSize: 13, lineHeight: 1.65 }}>
                  Use appointment requests for appointments with officials, or file a grievance for civic issues that need action. Both services keep your details, documents, and status updates organized inside the portal.
                </p>
              </div>
              <div style={{ display: "grid", gap: 12, alignContent: "start" }}>
                {[
                  { icon: Clock, title: "Fast intake", text: "Submit in a few steps with guided fields and required validations." },
                  { icon: Upload, title: "Documents supported", text: "Attach supporting files for faster verification and review." },
                ].map((item) => (
                  <div key={item.title} style={{ display: "flex", gap: 12, padding: "14px 16px", borderRadius: 14, background: C.bgElevated, border: `1px solid ${C.border}` }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: C.card, flexShrink: 0 }}>
                      <item.icon size={18} style={{ color: C.purple }} />
                    </div>
                    <div>
                      <div style={{ color: C.t1, fontSize: 13, fontWeight: 700 }}>{item.title}</div>
                      <div style={{ color: C.t3, fontSize: 12, lineHeight: 1.6, marginTop: 3 }}>{item.text}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : activeTab === "appointment" ? (
          // APPOINTMENT FORM
          <WorkspaceCard style={{ marginBottom: 32 }}>
            <form onSubmit={submitAppointment} className="space-y-5">
              

              {/* TITLE */}
              <div>
                <label className="portal-citizen-label" style={sectionLabelStyle}>
                  {t("citizen.newCase.appointmentTitle")} <span style={{ color: C.danger }}>*</span>
                </label>
                <WorkspaceInput
                  required
                  type="text"
                  maxLength={200}
                  value={appointmentForm.title}
                  onChange={(event) =>
                    setAppointmentForm((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  placeholder={t("citizen.newCase.appointmentTitlePlaceholder")}
                />
                <div style={{ marginTop: 4 }}>
                  {appointmentForm.title.length >= 200 ? (
                    <div style={errorTextStyle}>{t("citizen.newCase.maxChars200")}</div>
                  ) : (
                    <div />
                  )}
                </div>
              </div>

              {/* PURPOSE */}
              <div>
                <label className="portal-citizen-label" style={sectionLabelStyle}>
                  {t("citizen.newCase.purposeLabel")} <span style={{ color: C.danger }}>*</span>
                </label>
                <textarea
                  required
                  maxLength={1000}
                  value={appointmentForm.purpose}
                  onChange={(event) =>
                    setAppointmentForm((current) => ({ ...current, purpose: event.target.value }))
                  }
                  placeholder={t("citizen.newCase.purposePlaceholder")}
                  style={textareaStyle}
                  rows={5}
                />
                <div style={{ marginTop: 4 }}>
                  {appointmentForm.purpose.length >= 1000 ? (
                    <div style={errorTextStyle}>{t("citizen.newCase.maxChars1000")}</div>
                  ) : (
                    <div />
                  )}
                </div>
              </div>

              <div className="grid lg:grid-cols-2 gap-3 items-start">
                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <label className="portal-citizen-label flex items-center gap-2" style={{ ...sectionLabelStyle, display: "flex", alignItems: "center" }}>
                      <Calendar size={16} />
                      <span>{t("citizen.newCase.preferredDate")} <span style={{ color: C.danger }}>*</span></span>
                    </label>
                    <CustomDatePicker
                      value={appointmentForm.preferredDate}
                      onChange={(nextDate) =>
                        setAppointmentForm((current) => ({ ...current, preferredDate: nextDate }))
                      }
                      min={getTomorrowDate()}
                      placeholder={t("citizen.newCase.preferredDatePlaceholder")}
                    />
                  </div>

                  <div>
                    <label className="portal-citizen-label flex items-center gap-2" style={{ ...sectionLabelStyle, display: "flex", alignItems: "center" }}>
                      <Clock size={16} />
                      <span>{t("citizen.newCase.preferredTime")} <span style={{ color: C.danger }}>*</span></span>
                    </label>
                    <CustomTimePicker
                      value={appointmentForm.preferredTime}
                      onChange={(nextTime) =>
                        setAppointmentForm((current) => ({ ...current, preferredTime: nextTime }))
                      }
                      options={timeSlots}
                    />
                  </div>
                </div>

                <div>
                  <label className="portal-citizen-label" style={sectionLabelStyle}>
                    {t("citizen.newCase.adminDesk")}
                  </label>
                  <WorkspaceSelect
                    value={appointmentForm.referralAdminUserId}
                    onChange={(event) =>
                      setAppointmentForm((current) => ({ ...current, referralAdminUserId: event.target.value }))
                    }
                    style={{ width: "100%", minWidth: 0, boxSizing: "border-box", color: appointmentForm.referralAdminUserId ? C.t1 : C.t3 }}
                  >
                    <option value="">{t("citizen.newCase.adminDeskPlaceholder")}</option>
                    {admins.map((admin) => (
                      <option key={admin.id} value={admin.id}>
                        {admin.name ? `${admin.name} (${admin.username})` : admin.username} · {admin.department}
                      </option>
                    ))}
                  </WorkspaceSelect>
                </div>
              </div>

              {/* FILE UPLOAD */}
              <div>
                <label className="portal-citizen-label" style={sectionLabelStyle}>
                  {t("citizen.newCase.supportingDocuments")}
                </label>
                {appointmentFileError && (
                  <p style={{ color: C.danger, fontSize: 13, marginBottom: 6, fontWeight: 500 }}>{appointmentFileError}</p>
                )}
                <div className="border-2 border-dashed rounded-xl p-6 transition-colors" style={{ borderColor: C.border, background: C.bgElevated }}>
                  <div
                    className="flex items-center gap-4 cursor-pointer"
                    onClick={() => {
                      if (appointmentForm.files.length >= 5) {
                        setAppointmentFileError(t("citizen.newCase.maxFiles"));
                        return;
                      }
                      setAppointmentFileError("");
                      appointmentFileInputRef.current?.click();
                    }}
                  >
                    <div className="h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: C.card, border: `1px solid ${C.border}` }}>
                      <Upload size={24} style={{ color: C.t3 }} />
                    </div>
                    <div className="flex-1">
                      <div style={{ fontWeight: 600, color: appointmentForm.files.length > 0 ? C.t1 : C.t3 }}>
                        {appointmentForm.files.length > 0
                          ? t("citizen.newCase.filesSelected", { count: appointmentForm.files.length })
                          : t("citizen.newCase.clickToUpload")}
                      </div>
                      <p className="portal-citizen-caption" style={{ color: C.t3, marginTop: 4 }}>{t("citizen.newCase.fileFormats")}</p>
                    </div>
                  </div>

                  {appointmentForm.files.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {appointmentForm.files.map((file, index) => (
                        <FileCard key={index} file={file} index={index} formType="appointment" />
                      ))}
                    </div>
                  )}

                  <input
                    ref={appointmentFileInputRef}
                    type="file"
                    multiple
                    accept={ACCEPTED_UPLOAD_TYPES}
                    className="hidden"
                    onChange={(event) => { handleFileSelection("appointment", event.target.files); event.target.value = ""; }}
                  />
                </div>
              </div>

              {/* COMPANIONS */}

                <label className="portal-citizen-label flex items-center gap-2" style={{ ...sectionLabelStyle, display: "flex", alignItems: "center" }}>
                  <Users size={18} />
                  <span>{t("citizen.newCase.additionalAttendees")}</span>
                </label>
                <button
                  type="button"
                  onMouseEnter={() => setIsAddPersonHovered(true)}
                  onMouseLeave={() => setIsAddPersonHovered(false)}
                  onClick={() =>
                    setAppointmentForm((current) => ({
                      ...current,
                      companions: [...current.companions, { name: "", phone: "" }],
                    }))
                  }
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg transition-colors font-medium text-sm"
                  style={{
                    border: `1px solid ${C.purple}`,
                    background: isAddPersonHovered ? C.purple : "transparent",
                    color: isAddPersonHovered ? "#ffffff" : C.purple,
                    marginBottom: 12,
                    width: "fit-content",
                  }}
                >
                  {t("citizen.newCase.addPerson")}
                </button>
                <div className="space-y-2.5">
                  {appointmentForm.companions.map((person, index) => {
                    // Logic to explicitly check phone validity
                    const isPhoneStartedWrong = person.phone.length > 0 && !/^[6-9]/.test(person.phone);
                    const isPhoneIncomplete = person.phone.length > 0 && person.phone.length < 10 && !isPhoneStartedWrong;

                    return (
                      <div key={`companion-${index}`} className="grid md:grid-cols-[1fr_1fr_auto] gap-2 items-start">
                        {/* Name Input wrapper */}
                        <div className="flex flex-col">
                          <input
                            type="text"
                            maxLength={60}
                            value={person.name}
                            onChange={(event) =>
                              setAppointmentForm((current) => ({
                                ...current,
                                companions: current.companions.map((entry, entryIndex) =>
                                  entryIndex === index ? { ...entry, name: event.target.value } : entry
                                ),
                              }))
                            }
                            placeholder={t("citizen.newCase.fullName")}
                            style={textareaStyle}
                          />
                          <div style={{ marginTop: 4 }}>
                            {person.name.length >= 60 ? (
                              <div style={errorTextStyle}>{t("citizen.newCase.maxChars60")}</div>
                            ) : (
                              <div />
                            )}
                          </div>
                        </div>

                        {/* Phone Input wrapper */}
                        <div className="flex flex-col">
                          <input
                            type="tel"
                            value={person.phone}
                            onChange={(event) =>
                              setAppointmentForm((current) => ({
                                ...current,
                                companions: current.companions.map((entry, entryIndex) =>
                                  entryIndex === index
                                    ? { ...entry, phone: event.target.value.replace(/\D/g, "").slice(0, 10) }
                                    : entry
                                ),
                              }))
                            }
                            placeholder={t("citizen.newCase.phoneNumber")}
                            style={{ 
                              ...textareaStyle, 
                              borderColor: isPhoneStartedWrong || isPhoneIncomplete ? C.danger : C.border 
                            }}
                          />
                          {/* Conditional Validation Text for Phone */}
                          {isPhoneStartedWrong && (
                            <div style={errorTextStyle}>{t("citizen.newCase.phoneStartedWrong")}</div>
                          )}
                          {isPhoneIncomplete && (
                            <div style={errorTextStyle}>{t("citizen.newCase.phoneIncomplete")}</div>
                          )}
                        </div>
                        
                        <button
                          type="button"
                          onMouseEnter={() => setHoveredRemoveIndex(index)}
                          onMouseLeave={() => setHoveredRemoveIndex(null)}
                          onClick={() =>
                            setAppointmentForm((current) => ({
                              ...current,
                              companions:
                                current.companions.length === 1
                                  ? [{ name: "", phone: "" }]
                                  : current.companions.filter((_, entryIndex) => entryIndex !== index),
                            }))
                          }
                          className="px-3 py-2 rounded-lg transition-colors font-medium h-[40px] text-sm"
                          style={{
                            border: `1px solid ${C.danger}`,
                            color: hoveredRemoveIndex === index ? "#ffffff" : C.danger,
                            background: hoveredRemoveIndex === index ? C.danger : "transparent",
                          }}
                        >
                          {t("citizen.newCase.remove")}
                        </button>
                      </div>
                    );
                  })}
                </div>

              {/* SUBMIT */}
              <WorkspaceButton
                type="submit"
                disabled={loading || isAppointmentFormInvalid}
                style={{ width: "30%", minWidth: 220, padding: "16px 24px", margin: "0 auto", display: "flex", justifyContent: "center" }}
              >
                {loading ? t("citizen.newCase.submitting") : t("citizen.newCase.submitRequest")}
              </WorkspaceButton>
            </form>
          </WorkspaceCard>
        ) : (
          // GRIEVANCE FORM
          <WorkspaceCard style={{ marginBottom: 32 }}>
            <form onSubmit={submitGrievance} className="space-y-8">
              
              {/* TITLE */}
              <div>
                <label className="portal-citizen-label" style={sectionLabelStyle}>
                  {t("citizen.newCase.grievanceTitleLabel")} <span style={{ color: C.danger }}>*</span>
                </label>
                <WorkspaceInput
                  required
                  type="text"
                  maxLength={200}
                  value={grievanceForm.title}
                  onChange={(event) =>
                    setGrievanceForm((current) => ({ ...current, title: event.target.value }))
                  }
                  placeholder={t("citizen.newCase.grievanceTitlePlaceholder")}
                />
                <div style={{ marginTop: 4 }}>
                  {grievanceForm.title.length >= 200 ? (
                    <div style={errorTextStyle}>{t("citizen.newCase.maxChars200")}</div>
                  ) : (
                    <div />
                  )}
                </div>
              </div>

              {/* DETAILS */}
              <div>
                <label className="portal-citizen-label" style={sectionLabelStyle}>
                  {t("citizen.newCase.grievanceDetails")} <span style={{ color: C.danger }}>*</span>
                </label>
                <textarea
                  required
                  maxLength={1000}
                  value={grievanceForm.details}
                  onChange={(event) =>
                    setGrievanceForm((current) => ({ ...current, details: event.target.value }))
                  }
                  placeholder={t("citizen.newCase.grievanceDetailsPlaceholder")}
                  style={textareaStyle}
                  rows={6}
                />
                <div style={{ marginTop: 4 }}>
                  {grievanceForm.details.length >= 1000 ? (
                    <div style={errorTextStyle}>{t("citizen.newCase.maxChars1000")}</div>
                  ) : (
                    <div />
                  )}
                </div>
              </div>

              {/* LOCATION */}
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <label className="portal-citizen-label flex items-center gap-2" style={{ ...sectionLabelStyle, display: "flex", alignItems: "center" }}>
                    <MapPin size={16} />
                    <span>{t("citizen.newCase.stateLabel")} <span style={{ color: C.danger }}>*</span></span>
                  </label>
                  <WorkspaceInput
                    required
                    type="text"
                    value={grievanceForm.state}
                    onChange={(event) =>
                      setGrievanceForm((current) => ({ ...current, state: event.target.value }))
                    }
                    placeholder={t("citizen.newCase.statePlaceholder")}
                  />
                </div>

                <div>
                  <label className="portal-citizen-label flex items-center gap-2" style={{ ...sectionLabelStyle, display: "flex", alignItems: "center" }}>
                    <MapPin size={16} />
                    <span>{t("citizen.newCase.districtLabel")} <span style={{ color: C.danger }}>*</span></span>
                  </label>
                  <WorkspaceInput
                    required
                    type="text"
                    value={grievanceForm.district}
                    onChange={(event) =>
                      setGrievanceForm((current) => ({ ...current, district: event.target.value }))
                    }
                    placeholder={t("citizen.newCase.districtPlaceholder")}
                  />
                </div>

                <div>
                  <label className="portal-citizen-label flex items-center gap-2" style={{ ...sectionLabelStyle, display: "flex", alignItems: "center" }}>
                    <Calendar size={16} />
                    <span>{t("common.date")} <span style={{ color: C.danger }}>*</span></span>
                  </label>
                  <CustomDatePicker
                    value={grievanceForm.incidentDate}
                    onChange={(nextDate) =>
                      setGrievanceForm((current) => ({ ...current, incidentDate: nextDate }))
                    }
                    max={getTodayDate()}
                    placeholder={t("citizen.newCase.selectDate")}
                  />
                </div>
              </div>

              {/* FILE UPLOAD */}
              <div>
                <label className="portal-citizen-label" style={sectionLabelStyle}>
                  {t("citizen.newCase.supportingDocumentsGrievance")}
                </label>
                {grievanceFileError && (
                  <p style={{ color: C.danger, fontSize: 13, marginBottom: 6, fontWeight: 500 }}>{grievanceFileError}</p>
                )}
                <div className="border-2 border-dashed rounded-xl p-6 transition-colors" style={{ borderColor: C.border, background: C.bgElevated }}>
                  <div
                    className="flex items-center gap-4 cursor-pointer"
                    onClick={() => {
                      if (grievanceForm.files.length >= 5) {
                        setGrievanceFileError(t("citizen.newCase.maxFiles"));
                        return;
                      }
                      setGrievanceFileError("");
                      grievanceFileInputRef.current?.click();
                    }}
                  >
                    <div className="h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: C.card, border: `1px solid ${C.border}` }}>
                      <Upload size={24} style={{ color: C.t3 }} />
                    </div>
                    <div className="flex-1">
                      <div style={{ fontWeight: 600, color: grievanceForm.files.length > 0 ? C.t1 : C.t3 }}>
                        {grievanceForm.files.length > 0
                          ? t("citizen.newCase.filesSelected", { count: grievanceForm.files.length })
                          : t("citizen.newCase.clickToUpload")}
                      </div>
                      <p className="portal-citizen-caption" style={{ color: C.t3, marginTop: 4 }}>{t("citizen.newCase.fileFormatsGrievance")}</p>
                    </div>
                  </div>

                  {grievanceForm.files.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {grievanceForm.files.map((file, index) => (
                        <FileCard key={index} file={file} index={index} formType="grievance" />
                      ))}
                    </div>
                  )}

                  <input
                    ref={grievanceFileInputRef}
                    type="file"
                    multiple
                    accept={ACCEPTED_UPLOAD_TYPES}
                    className="hidden"
                    onChange={(event) => { handleFileSelection("grievance", event.target.files); event.target.value = ""; }}
                  />
                </div>
              </div>

              {/* SUBMIT */}
              <WorkspaceButton
                type="submit"
                disabled={loading || !grievanceForm.title || !grievanceForm.details || !grievanceForm.state || !grievanceForm.district || !grievanceForm.incidentDate}
                style={{ width: "30%", minWidth: 220, padding: "16px 24px", margin: "0 auto", display: "flex", justifyContent: "center" }}
              >
                {loading ? t("citizen.newCase.submitting") : t("citizen.newCase.submitGrievanceBtn")}
              </WorkspaceButton>
            </form>
          </WorkspaceCard>
        )}

      </div>
    </WorkspacePage>
  );
}
