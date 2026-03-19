import { useEffect, useState } from "react";
import {
  FileText, CheckCircle, AlertCircle, Users, Upload, Phone,
  ChevronRight, Calendar, MapPin, Briefcase, X, ArrowRight, Home
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

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

  const [activeTab, setActiveTab] = useState("");
  const [admins, setAdmins] = useState([]); // Placeholder for UI mapping
  const [error, setError] = useState("");
  const [successModal, setSuccessModal] = useState({ open: false, title: "", message: "" });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const [meetingForm, setMeetingForm] = useState({
    purpose: "",
    referralAdminUserId: "",
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

  // API calls removed from useEffect
  useEffect(() => {
    // Admin list fetch removed
  }, []);

  const submitMeeting = async (event) => {
    event.preventDefault();
    // API logic removed
    console.log("Meeting Form Data:", meetingForm);
    setSuccessModal({
      open: true,
      title: "Action Simulated",
      message: "API call has been removed. Form data logged to console.",
    });
  };

  const submitComplaint = async (event) => {
    event.preventDefault();
    // API logic removed
    console.log("Complaint Form Data:", complaintForm);
    setSuccessModal({
      open: true,
      title: "Action Simulated",
      message: "API call has been removed. Form data logged to console.",
    });
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
                disabled={loading || !meetingForm.purpose}
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