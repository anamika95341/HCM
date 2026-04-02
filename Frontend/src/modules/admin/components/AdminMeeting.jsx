// import { useEffect, useMemo, useState } from "react";
// import { ChevronLeft, Search } from "lucide-react";
// import { useNavigate, useParams } from "react-router-dom";
// import { PATHS } from "../../../routes/paths.js";
// import { apiClient, authorizedConfig } from "../../../shared/api/client.js";
// import { useAuth } from "../../../shared/auth/AuthContext.jsx";
// import {
//   WorkspaceBadge,
//   WorkspaceButton,
//   WorkspaceCard,
//   WorkspaceCardHeader,
//   WorkspaceEmptyState,
//   WorkspaceInput,
//   WorkspacePage,
//   WorkspaceSectionHeader,
//   WorkspaceSelect,
//   WorkspaceStatGrid,
// } from "../../../shared/components/WorkspaceUI.jsx";
// import { usePortalTheme } from "../../../shared/theme/portalTheme.jsx";

// function statusLabel(status) {
//   return String(status || "")
//     .split("_")
//     .filter(Boolean)
//     .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
//     .join(" ");
// }

// export default function AdminMeeting() {
//   const { C } = usePortalTheme();
//   const navigate = useNavigate();
//   const { meetingId } = useParams();
//   const { session } = useAuth();
//   const [meetings, setMeetings] = useState([]);
//   const [selectedMeeting, setSelectedMeeting] = useState(null);
//   const [history, setHistory] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState("");
//   const [query, setQuery] = useState("");
//   const [actionError, setActionError] = useState("");
//   const [actionLoading, setActionLoading] = useState(false);
//   const [verificationForm, setVerificationForm] = useState({ deoId: "", reason: "" });
//   const [decisionReason, setDecisionReason] = useState("");
//   const [scheduleForm, setScheduleForm] = useState({
//     ministerId: "",
//     startsAt: "",
//     endsAt: "",
//     location: "",
//     isVip: false,
//     comments: "",
//   });
//   const [workflowDirectory, setWorkflowDirectory] = useState({ deos: [], ministers: [] });
//   const [meetingFiles, setMeetingFiles] = useState([]);
//   const [uploadFile, setUploadFile] = useState(null);
//   const [uploadingFile, setUploadingFile] = useState(false);

//   useEffect(() => {
//     let mounted = true;

//     async function loadQueue() {
//       try {
//         const [queueResponse, directoryResponse] = await Promise.all([
//           apiClient.get("/admin/work-queue", authorizedConfig(session.accessToken)),
//           apiClient.get("/admin/workflow-directory", authorizedConfig(session.accessToken)),
//         ]);
//         if (mounted) {
//           setMeetings(queueResponse.data.meetings || []);
//           setWorkflowDirectory(directoryResponse.data || { deos: [], ministers: [] });
//         }
//       } catch (loadError) {
//         if (mounted) {
//           setError(loadError?.response?.data?.error || "Unable to load admin meeting queue");
//         }
//       } finally {
//         if (mounted) {
//           setLoading(false);
//         }
//       }
//     }

//     if (session?.accessToken) {
//       loadQueue();
//     }

//     return () => {
//       mounted = false;
//     };
//   }, [session?.accessToken]);

//   useEffect(() => {
//     let mounted = true;

//     async function loadMeetingDetail() {
//       if (!meetingId || !session?.accessToken) {
//         setSelectedMeeting(null);
//         setHistory([]);
//         setMeetingFiles([]);
//         return;
//       }

//       try {
//         const [detailResult, filesResult] = await Promise.allSettled([
//           apiClient.get(`/meetings/${meetingId}/admin-view`, authorizedConfig(session.accessToken)),
//           apiClient.get(`/meetings/${meetingId}/files`, authorizedConfig(session.accessToken)),
//         ]);

//         if (detailResult.status === "rejected") {
//           throw detailResult.reason;
//         }

//         if (mounted) {
//           const { data } = detailResult.value;
//           setSelectedMeeting(data.meeting);
//           setHistory(data.history || []);
//           if (filesResult.status === "fulfilled") {
//             setMeetingFiles(filesResult.value.data.files || []);
//           }
//         }
//       } catch (detailError) {
//         if (mounted) {
//           setError(detailError?.response?.data?.error || "Unable to load meeting details");
//         }
//       }
//     }

//     loadMeetingDetail();
//     return () => {
//       mounted = false;
//     };
//   }, [meetingId, session?.accessToken]);

//   const filteredMeetings = useMemo(() => {
//     const q = query.trim().toLowerCase();
//     return meetings.filter((meeting) => {
//       if (!q) return true;
//       return [
//         meeting.title,
//         meeting.purpose,
//         meeting.citizen_id,
//         meeting.first_name,
//         meeting.last_name,
//         meeting.status,
//       ].filter(Boolean).join(" ").toLowerCase().includes(q);
//     });
//   }, [meetings, query]);

//   const queueStats = useMemo(() => {
//     const active = meetings.filter((meeting) => !["completed", "cancelled", "rejected"].includes(meeting.status)).length;
//     const scheduled = meetings.filter((meeting) => meeting.status === "scheduled").length;
//     const verification = meetings.filter((meeting) => meeting.status === "verification_pending").length;
//     return [
//       { label: "Queue Size", value: meetings.length },
//       { label: "Active", value: active },
//       { label: "Verification", value: verification },
//       { label: "Scheduled", value: scheduled },
//     ];
//   }, [meetings]);

//   if (meetingId && selectedMeeting) {
//     const canAccept = ["pending", "not_verified"].includes(selectedMeeting.status);
//     const canSendVerification = ["accepted", "not_verified"].includes(selectedMeeting.status);
//     const canSchedule = ["accepted", "verified", "scheduled"].includes(selectedMeeting.status);
//     const canCompleteOrCancel = selectedMeeting.status === "scheduled";
//     const canUploadPhotos = ["scheduled", "completed"].includes(selectedMeeting.status);

//     const runAction = async (request) => {
//       setActionLoading(true);
//       setActionError("");
//       try {
//         await request();
//         const [detailResult, filesResult] = await Promise.allSettled([
//           apiClient.get(`/meetings/${meetingId}/admin-view`, authorizedConfig(session.accessToken)),
//           apiClient.get(`/meetings/${meetingId}/files`, authorizedConfig(session.accessToken)),
//         ]);
//         if (detailResult.status === "fulfilled") {
//           setSelectedMeeting(detailResult.value.data.meeting);
//           setHistory(detailResult.value.data.history || []);
//         }
//         if (filesResult.status === "fulfilled") {
//           setMeetingFiles(filesResult.value.data.files || []);
//         }
//       } catch (error) {
//         setActionError(error?.response?.data?.error || "Unable to update meeting");
//       } finally {
//         setActionLoading(false);
//       }
//     };

//     const uploadMeetingPhoto = async () => {
//       if (!uploadFile) return;
//       setUploadingFile(true);
//       setActionError("");
//       try {
//         const formData = new FormData();
//         formData.append("file", uploadFile);
//         await apiClient.post(`/meetings/${meetingId}/photos`, formData, authorizedConfig(session.accessToken));
//         const { data } = await apiClient.get(`/meetings/${meetingId}/files`, authorizedConfig(session.accessToken));
//         setMeetingFiles(data.files || []);
//         setUploadFile(null);
//       } catch (error) {
//         setActionError(error?.response?.data?.error || "Unable to upload meeting photo");
//       } finally {
//         setUploadingFile(false);
//       }
//     };

//     return (
//       <WorkspacePage width={1200}>
//         <WorkspaceSectionHeader
//           eyebrow="Admin Workspace"
//           title={selectedMeeting.title}
//           subtitle={selectedMeeting.purpose}
//           action={
//             <WorkspaceButton type="button" variant="ghost" onClick={() => navigate(PATHS.admin.meetings)}>
//               <ChevronLeft size={16} />
//               Back to Meetings
//             </WorkspaceButton>
//           }
//         />
//         <div style={{ display: "grid", gap: 24 }}>
//           {actionError && <WorkspaceCard style={{ color: C.danger }}>{actionError}</WorkspaceCard>}
//           <div className="grid md:grid-cols-3 gap-6">
//             <InfoCard label="Status" value={statusLabel(selectedMeeting.status)} />
//             <InfoCard label="Citizen" value={[selectedMeeting.first_name, selectedMeeting.last_name].filter(Boolean).join(" ")} subValue={selectedMeeting.mobile_number || selectedMeeting.email || "No contact"} />
//             <InfoCard label="Preferred Time" value={selectedMeeting.preferred_time ? new Date(selectedMeeting.preferred_time).toLocaleString("en-IN") : "Not provided"} />
//           </div>

//           <WorkspaceCard style={{ display: "grid", gap: 18 }}>
//             <WorkspaceCardHeader
//               title="Workflow Actions"
//               subtitle="All state changes here follow the secured meeting workflow."
//             />

//             {canAccept && (
//               <WorkspaceButton
//                 type="button"
//                 disabled={actionLoading}
//                 onClick={() => runAction(() => apiClient.patch(`/meetings/${meetingId}/accept`, {}, authorizedConfig(session.accessToken)))}
//               >
//                 Accept Meeting
//               </WorkspaceButton>
//             )}

//             {(canAccept || canSendVerification || canSchedule || canCompleteOrCancel) && (
//               <div
//                 className="space-y-3"
//                 style={{
//                   padding: 18,
//                   borderRadius: 12,
//                   border: `1px solid ${C.border}`,
//                   background: C.bgElevated,
//                 }}
//               >
//                 <div style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: ".08em" }}>
//                   Decision Notes
//                 </div>
//                 <textarea
//                   value={decisionReason}
//                   onChange={(event) => setDecisionReason(event.target.value)}
//                   rows={3}
//                   placeholder="Reason or administrative note"
//                   style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.inp, color: C.t1, fontSize: 13, outline: "none" }}
//                 />
//                 <div className="flex flex-wrap gap-3">
//                   {(canAccept || canSendVerification || canSchedule) && (
//                     <WorkspaceButton
//                       type="button"
//                       variant="danger"
//                       disabled={actionLoading || decisionReason.trim().length < 3}
//                       onClick={() => runAction(() => apiClient.patch(`/meetings/${meetingId}/reject`, { reason: decisionReason }, authorizedConfig(session.accessToken)))}
//                     >
//                       Reject Meeting
//                     </WorkspaceButton>
//                   )}
//                   {canCompleteOrCancel && (
//                     <>
//                       <WorkspaceButton
//                         type="button"
//                         disabled={actionLoading || decisionReason.trim().length < 3}
//                         onClick={() => runAction(() => apiClient.patch(`/meetings/${meetingId}/complete`, { reason: decisionReason }, authorizedConfig(session.accessToken)))}
//                         style={{ background: C.mint, color: "#ffffff", border: "none" }}
//                       >
//                         Mark Completed
//                       </WorkspaceButton>
//                       <WorkspaceButton
//                         type="button"
//                         variant="danger"
//                         disabled={actionLoading || decisionReason.trim().length < 3}
//                         onClick={() => runAction(() => apiClient.patch(`/meetings/${meetingId}/cancel`, { reason: decisionReason }, authorizedConfig(session.accessToken)))}
//                       >
//                         Cancel Meeting
//                       </WorkspaceButton>
//                     </>
//                   )}
//                 </div>
//               </div>
//             )}

//             {canSendVerification && (
//               <div
//                 className="space-y-3 pt-4"
//                 style={{
//                   borderTop: `1px solid ${C.border}`,
//                   paddingTop: 20,
//                 }}
//               >
//                 <div style={{ padding: 18, borderRadius: 12, border: `1px solid ${C.border}`, background: C.bgElevated }}>
//                   <h3 style={{ fontSize: 16, fontWeight: 700, color: C.t1 }}>Send for DEO Verification</h3>
//                   <p style={{ fontSize: 12, color: C.t3, marginTop: 4 }}>Assign a verified DEO to complete the verification pass.</p>
//                 </div>
//                 <input
//                   type="hidden"
//                   value={verificationForm.deoId}
//                   readOnly
//                 />
//                 <WorkspaceSelect value={verificationForm.deoId} onChange={(event) => setVerificationForm((current) => ({ ...current, deoId: event.target.value }))}>
//                   <option value="">Select DEO</option>
//                   {workflowDirectory.deos.map((deo) => (
//                     <option key={deo.id} value={deo.id}>
//                       {[deo.first_name, deo.last_name].filter(Boolean).join(" ")} · {deo.designation}
//                     </option>
//                   ))}
//                 </WorkspaceSelect>
//                 <WorkspaceButton
//                   type="button"
//                   disabled={actionLoading || !verificationForm.deoId}
//                   onClick={() => runAction(() => apiClient.patch(`/meetings/${meetingId}/assign-verification`, { deoId: verificationForm.deoId }, authorizedConfig(session.accessToken)))}
//                 >
//                   Send to Verification
//                 </WorkspaceButton>
//               </div>
//             )}

//             {canSchedule && (
//               <div
//                 className="space-y-3 pt-4"
//                 style={{
//                   borderTop: `1px solid ${C.border}`,
//                   paddingTop: 20,
//                 }}
//               >
//                 <div style={{ padding: 18, borderRadius: 12, border: `1px solid ${C.border}`, background: C.bgElevated }}>
//                   <h3 style={{ fontSize: 16, fontWeight: 700, color: C.t1 }}>{selectedMeeting.status === "scheduled" ? "Reschedule Meeting" : "Schedule Meeting"}</h3>
//                   <p style={{ fontSize: 12, color: C.t3, marginTop: 4 }}>Finalize the minister, venue, and time window for the citizen meeting.</p>
//                 </div>
//                 <div className="grid md:grid-cols-2 gap-3">
//                   <WorkspaceSelect value={scheduleForm.ministerId} onChange={(event) => setScheduleForm((current) => ({ ...current, ministerId: event.target.value }))}>
//                     <option value="">Select Minister</option>
//                     {workflowDirectory.ministers.map((minister) => (
//                       <option key={minister.id} value={minister.id}>
//                         {[minister.first_name, minister.last_name].filter(Boolean).join(" ")}
//                       </option>
//                     ))}
//                   </WorkspaceSelect>
//                   <WorkspaceInput value={scheduleForm.location} onChange={(event) => setScheduleForm((current) => ({ ...current, location: event.target.value }))} placeholder="Location" />
//                   <WorkspaceInput type="datetime-local" value={scheduleForm.startsAt} onChange={(event) => setScheduleForm((current) => ({ ...current, startsAt: event.target.value }))} />
//                   <WorkspaceInput type="datetime-local" value={scheduleForm.endsAt} onChange={(event) => setScheduleForm((current) => ({ ...current, endsAt: event.target.value }))} />
//                 </div>
//                 <label className="flex items-center gap-2" style={{ fontSize: 13, color: C.t2 }}>
//                   <input type="checkbox" checked={scheduleForm.isVip} onChange={(event) => setScheduleForm((current) => ({ ...current, isVip: event.target.checked }))} />
//                   Mark as VIP meeting
//                 </label>
//                 <textarea value={scheduleForm.comments} onChange={(event) => setScheduleForm((current) => ({ ...current, comments: event.target.value }))} rows={3} placeholder="Comments" style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.inp, color: C.t1, fontSize: 13, outline: "none" }} />
//                 <WorkspaceButton
//                   type="button"
//                   disabled={actionLoading || !scheduleForm.ministerId || !scheduleForm.startsAt || !scheduleForm.endsAt || !scheduleForm.location}
//                   onClick={() => runAction(() => apiClient.patch(`/meetings/${meetingId}/schedule`, {
//                     ministerId: scheduleForm.ministerId,
//                     startsAt: new Date(scheduleForm.startsAt).toISOString(),
//                     endsAt: new Date(scheduleForm.endsAt).toISOString(),
//                     location: scheduleForm.location,
//                     isVip: scheduleForm.isVip,
//                     comments: scheduleForm.comments,
//                   }, authorizedConfig(session.accessToken)))}
//                 >
//                   {selectedMeeting.status === "scheduled" ? "Reschedule Meeting" : "Schedule Meeting"}
//                 </WorkspaceButton>
//               </div>
//             )}
//           </WorkspaceCard>

//           <WorkspaceCard style={{ display: "grid", gap: 16 }}>
//             <WorkspaceCardHeader
//               title="Meeting Files"
//               subtitle="This meeting only. Uploaded photos here are what the minister sees in the calendar details."
//             />
//             {canUploadPhotos ? (
//               <div className="flex flex-wrap items-center gap-3">
//                 <input
//                   type="file"
//                   accept="image/png,image/jpeg"
//                   onChange={(event) => setUploadFile(event.target.files?.[0] || null)}
//                 />
//                 <WorkspaceButton type="button" disabled={!uploadFile || uploadingFile} onClick={uploadMeetingPhoto}>
//                   {uploadingFile ? "Uploading..." : "Upload Photo"}
//                 </WorkspaceButton>
//               </div>
//             ) : (
//               <div style={{ fontSize: 13, color: C.t3 }}>Photos can be uploaded after the meeting is scheduled.</div>
//             )}
//             {meetingFiles.length === 0 ? (
//               <div style={{ fontSize: 13, color: C.t3 }}>No files attached to this meeting yet.</div>
//             ) : (
//               <div style={{ display: "grid", gap: 10 }}>
//                 {meetingFiles.map((file) => (
//                   <div key={file.id} style={{ padding: 12, borderRadius: 12, border: `1px solid ${C.border}`, background: C.bgElevated }}>
//                     <div style={{ fontSize: 13, fontWeight: 700, color: C.t1 }}>{file.name}</div>
//                     <div style={{ marginTop: 4, fontSize: 12, color: C.t3 }}>{file.mimeType}</div>
//                   </div>
//                 ))}
//               </div>
//             )}
//           </WorkspaceCard>

//           <WorkspaceCard>
//             <WorkspaceCardHeader title="Meeting Information" />
//             <div className="grid md:grid-cols-2 gap-8" style={{ fontSize: 13, color: C.t2 }}>
//               <DetailItem label="Request ID" value={selectedMeeting.requestId || selectedMeeting.id} />
//               <DetailItem label="Citizen ID" value={selectedMeeting.citizen_id || selectedMeeting.citizen_code} />
//               <DetailItem label="Admin Referral" value={selectedMeeting.admin_referral || "Not provided"} />
//               <DetailItem label="Scheduled At" value={selectedMeeting.scheduled_at ? new Date(selectedMeeting.scheduled_at).toLocaleString("en-IN") : "Pending"} />
//               <DetailItem label="Scheduled Location" value={selectedMeeting.scheduled_location || "Pending"} />
//               <DetailItem label="VIP" value={selectedMeeting.is_vip ? "Yes" : "No"} />
//               <DetailItem label="Visitor ID" value={selectedMeeting.visitorId || "Pending"} />
//               <DetailItem label="Meeting Docket" value={selectedMeeting.meetingDocket || "Pending"} />
//               <DetailItem label="Assigned Admin" value={selectedMeeting.assignedAdminName || "Pending"} />
//               <DetailItem label="Assigned DEO" value={selectedMeeting.assignedDeoName || "Pending"} />
//               <DetailItem label="Created At" value={new Date(selectedMeeting.created_at).toLocaleString("en-IN")} />
//             </div>

//             {(selectedMeeting.rejection_reason || selectedMeeting.verification_reason || selectedMeeting.admin_comments || selectedMeeting.completionNote || selectedMeeting.cancellationReason) && (
//               <div className="mt-6 space-y-3">
//                 {selectedMeeting.rejection_reason && <NoticeBox tone="red" label="Rejection Reason" value={selectedMeeting.rejection_reason} />}
//                 {selectedMeeting.verification_reason && <NoticeBox tone="amber" label="Verification Reason" value={selectedMeeting.verification_reason} />}
//                 {selectedMeeting.admin_comments && <NoticeBox tone="blue" label="Admin Comments" value={selectedMeeting.admin_comments} />}
//                 {selectedMeeting.completionNote && <NoticeBox tone="blue" label="Completion Note" value={selectedMeeting.completionNote} />}
//                 {selectedMeeting.cancellationReason && <NoticeBox tone="red" label="Cancellation Reason" value={selectedMeeting.cancellationReason} />}
//               </div>
//             )}
//           </WorkspaceCard>

//           <WorkspaceCard>
//             <WorkspaceCardHeader title="Activity Timeline" subtitle="Chronological movement of this meeting through the workflow." />
//             <div className="space-y-4">
//               {history.map((event, index) => (
//                 <div key={`${event.created_at}-${index}`} className="flex gap-4">
//                   <div className="flex flex-col items-center">
//                     <div className="w-3 h-3 rounded-full" style={{ background: C.purple, border: `2px solid ${C.card}` }} />
//                     {index !== history.length - 1 && <div className="w-0.5 h-12 mt-2" style={{ background: C.border }} />}
//                   </div>
//                   <div className="flex-1 pb-4">
//                     <div style={{ background: C.bgElevated, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16 }}>
//                       <p style={{ fontWeight: 600, color: C.t1 }}>{statusLabel(event.new_status)}</p>
//                       <p style={{ fontSize: 12, color: C.t3, marginTop: 4 }}>{event.actor_role}</p>
//                       {event.note && <p style={{ fontSize: 13, color: C.t2, marginTop: 8 }}>{event.note}</p>}
//                     </div>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           </WorkspaceCard>
//         </div>
//       </WorkspacePage>
//     );
//   }

//   return (
//     <WorkspacePage width={1280}>
//       <WorkspaceSectionHeader
//         eyebrow="Admin Workspace"
//         title="Meeting Queue"
//         subtitle="Admin-facing queue sourced from the backend meeting workflow."
//       />

//       <div style={{ display: "grid", gap: 24 }}>
//         <WorkspaceStatGrid items={queueStats} />

//         <WorkspaceCard>
//           <WorkspaceCardHeader
//             title="Queue Search"
//             subtitle="Search by title, purpose, citizen identity, or meeting state."
//           />
//           <div className="relative">
//             <Search className="absolute left-3 top-1/2 -translate-y-1/2" size={18} style={{ color: C.t3 }} />
//             <WorkspaceInput
//               type="text"
//               value={query}
//               onChange={(event) => setQuery(event.target.value)}
//               placeholder="Search by title, purpose, citizen, or status..."
//               style={{ paddingLeft: 40 }}
//             />
//           </div>
//         </WorkspaceCard>

//         {loading ? (
//           <WorkspaceEmptyState title="Loading meeting queue..." />
//         ) : error ? (
//           <WorkspaceCard style={{ color: C.danger }}>{error}</WorkspaceCard>
//         ) : (
//           <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
//             {filteredMeetings.map((meeting) => (
//               <WorkspaceCard
//                 key={meeting.id}
//                 style={{ cursor: "pointer", padding: 0, overflow: "hidden" }}
//                 onClick={() => navigate(`/admin/meetings/${meeting.id}`)}
//               >
//                 <div style={{ padding: "18px 18px 14px", borderBottom: `1px solid ${C.borderLight}`, background: C.bgElevated }}>
//                   <div className="flex items-start justify-between gap-2">
//                     <div className="flex-1">
//                       <p style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: ".08em" }}>{meeting.id}</p>
//                       <h3 style={{ fontSize: 14, fontWeight: 700, color: C.t1, marginTop: 6 }}>{meeting.title}</h3>
//                       <p style={{ fontSize: 13, color: C.t2, marginTop: 8, lineHeight: 1.6 }}>{meeting.purpose}</p>
//                     </div>
//                     <WorkspaceBadge status={meeting.status}>{statusLabel(meeting.status)}</WorkspaceBadge>
//                   </div>
//                 </div>

//                 <div className="space-y-3" style={{ fontSize: 13, color: C.t2, padding: 18 }}>
//                   <div>
//                     <div style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 6 }}>Citizen</div>
//                     <div>{[meeting.first_name, meeting.last_name].filter(Boolean).join(" ")}</div>
//                   </div>
//                   <div>
//                     <div style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 6 }}>Contact</div>
//                     <div>{meeting.mobile_number || meeting.email || "No contact"}</div>
//                   </div>
//                   <div>
//                     <div style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 6 }}>Preferred Slot</div>
//                     <div>{meeting.preferred_time ? new Date(meeting.preferred_time).toLocaleString("en-IN") : "No preferred time"}</div>
//                   </div>
//                 </div>
//               </WorkspaceCard>
//             ))}
//           </div>
//         )}
//       </div>
//     </WorkspacePage>
//   );
// }

// function InfoCard({ label, value, subValue }) {
//   const { C } = usePortalTheme();
//   return (
//     <WorkspaceCard style={{ padding: 18 }}>
//       <p style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: ".08em" }}>{label}</p>
//       <div style={{ marginTop: 10, fontSize: 18, fontWeight: 700, color: C.t1, lineHeight: 1.4 }}>{value}</div>
//       {subValue && <p style={{ fontSize: 12, color: C.t3, marginTop: 8 }}>{subValue}</p>}
//     </WorkspaceCard>
//   );
// }

// function DetailItem({ label, value }) {
//   const { C } = usePortalTheme();
//   return (
//     <div>
//       <p style={{ fontSize: 11, color: C.t3, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 }}>{label}</p>
//       <p style={{ fontSize: 16, fontWeight: 600, color: C.t1 }}>{value}</p>
//     </div>
//   );
// }

// function NoticeBox({ tone, label, value }) {
//   const { C } = usePortalTheme();
//   const toneColors = {
//     red: C.danger,
//     amber: C.warn,
//     blue: C.purple,
//   };
//   const color = toneColors[tone] || C.purple;
//   return (
//     <div style={{ padding: 16, borderRadius: 10, border: `1px solid ${color}33`, background: `${color}12` }}>
//       <p style={{ fontSize: 11, fontWeight: 700, color, textTransform: "uppercase", marginBottom: 8 }}>{label}</p>
//       <p style={{ fontSize: 13, color: C.t2 }}>{value}</p>
//     </div>
//   );
// }



import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, Search, LayoutGrid, List, Eye } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { PATHS } from "../../../routes/paths.js";
import { apiClient, authorizedConfig } from "../../../shared/api/client.js";
import { useAuth } from "../../../shared/auth/AuthContext.jsx";
import {
  WorkspaceBadge,
  WorkspaceButton,
  WorkspaceCard,
  WorkspaceCardHeader,
  WorkspaceEmptyState,
  WorkspaceInput,
  WorkspacePage,
  WorkspaceSectionHeader,
  WorkspaceSelect,
  WorkspaceStatGrid,
} from "../../../shared/components/WorkspaceUI.jsx";
import { usePortalTheme } from "../../../shared/theme/portalTheme.jsx";

function statusLabel(status) {
  return String(status || "")
    .split("_")
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
}

export default function AdminMeeting() {
  const { C } = usePortalTheme();
  const navigate = useNavigate();
  const { meetingId } = useParams();
  const { session } = useAuth();
  const [meetings, setMeetings] = useState([]);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "list"
  const [actionError, setActionError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [verificationForm, setVerificationForm] = useState({ deoId: "", reason: "" });
  const [decisionReason, setDecisionReason] = useState("");
  const [scheduleForm, setScheduleForm] = useState({
    ministerId: "",
    startsAt: "",
    endsAt: "",
    location: "",
    isVip: false,
    comments: "",
  });
  const [workflowDirectory, setWorkflowDirectory] = useState({ deos: [], ministers: [] });
  const [meetingFiles, setMeetingFiles] = useState([]);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function loadQueue() {
      try {
        const [queueResponse, directoryResponse] = await Promise.all([
          apiClient.get("/admin/work-queue", authorizedConfig(session.accessToken)),
          apiClient.get("/admin/workflow-directory", authorizedConfig(session.accessToken)),
        ]);
        if (mounted) {
          setMeetings(queueResponse.data.meetings || []);
          setWorkflowDirectory(directoryResponse.data || { deos: [], ministers: [] });
        }
      } catch (loadError) {
        if (mounted) setError(loadError?.response?.data?.error || "Unable to load admin meeting queue");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    if (session?.accessToken) loadQueue();
    return () => { mounted = false; };
  }, [session?.accessToken]);

  useEffect(() => {
    let mounted = true;
    async function loadMeetingDetail() {
      if (!meetingId || !session?.accessToken) {
        setSelectedMeeting(null); setHistory([]); setMeetingFiles([]);
        return;
      }
      try {
        const [detailResult, filesResult] = await Promise.allSettled([
          apiClient.get(`/meetings/${meetingId}/admin-view`, authorizedConfig(session.accessToken)),
          apiClient.get(`/meetings/${meetingId}/files`, authorizedConfig(session.accessToken)),
        ]);
        if (detailResult.status === "rejected") throw detailResult.reason;
        if (mounted) {
          const { data } = detailResult.value;
          setSelectedMeeting(data.meeting);
          setHistory(data.history || []);
          if (filesResult.status === "fulfilled") setMeetingFiles(filesResult.value.data.files || []);
        }
      } catch (detailError) {
        if (mounted) setError(detailError?.response?.data?.error || "Unable to load meeting details");
      }
    }
    loadMeetingDetail();
    return () => { mounted = false; };
  }, [meetingId, session?.accessToken]);

  const filteredMeetings = useMemo(() => {
    const q = query.trim().toLowerCase();
    return meetings.filter((meeting) => {
      if (!q) return true;
      return [meeting.title, meeting.purpose, meeting.citizen_id, meeting.first_name, meeting.last_name, meeting.status]
        .filter(Boolean).join(" ").toLowerCase().includes(q);
    });
  }, [meetings, query]);

  const queueStats = useMemo(() => {
    const active = meetings.filter((m) => !["completed", "cancelled", "rejected"].includes(m.status)).length;
    const scheduled = meetings.filter((m) => m.status === "scheduled").length;
    const verification = meetings.filter((m) => m.status === "verification_pending").length;
    return [
      { label: "Queue Size", value: meetings.length },
      { label: "Active", value: active },
      { label: "Verification", value: verification },
      { label: "Scheduled", value: scheduled },
    ];
  }, [meetings]);

  // ── DETAIL VIEW ───────────────────────────────────────────────────────────
  if (meetingId && selectedMeeting) {
    const canAccept          = ["pending", "not_verified"].includes(selectedMeeting.status);
    const canSendVerification = ["accepted", "not_verified"].includes(selectedMeeting.status);
    const canSchedule        = ["accepted", "verified", "scheduled"].includes(selectedMeeting.status);
    const canCompleteOrCancel = selectedMeeting.status === "scheduled";
    const canUploadPhotos    = ["scheduled", "completed"].includes(selectedMeeting.status);

    const runAction = async (request) => {
      setActionLoading(true); setActionError("");
      try {
        await request();
        const [detailResult, filesResult] = await Promise.allSettled([
          apiClient.get(`/meetings/${meetingId}/admin-view`, authorizedConfig(session.accessToken)),
          apiClient.get(`/meetings/${meetingId}/files`, authorizedConfig(session.accessToken)),
        ]);
        if (detailResult.status === "fulfilled") {
          setSelectedMeeting(detailResult.value.data.meeting);
          setHistory(detailResult.value.data.history || []);
        }
        if (filesResult.status === "fulfilled") setMeetingFiles(filesResult.value.data.files || []);
      } catch (error) {
        setActionError(error?.response?.data?.error || "Unable to update meeting");
      } finally {
        setActionLoading(false);
      }
    };

    const uploadMeetingPhoto = async () => {
      if (!uploadFile) return;
      setUploadingFile(true); setActionError("");
      try {
        const formData = new FormData();
        formData.append("file", uploadFile);
        await apiClient.post(`/meetings/${meetingId}/photos`, formData, authorizedConfig(session.accessToken));
        const { data } = await apiClient.get(`/meetings/${meetingId}/files`, authorizedConfig(session.accessToken));
        setMeetingFiles(data.files || []);
        setUploadFile(null);
      } catch (error) {
        setActionError(error?.response?.data?.error || "Unable to upload meeting photo");
      } finally {
        setUploadingFile(false);
      }
    };

    return (
      <WorkspacePage width={1200}>
        <WorkspaceSectionHeader
          eyebrow="Admin Workspace"
          title={selectedMeeting.title}
          subtitle={selectedMeeting.purpose}
          action={
            <WorkspaceButton type="button" variant="ghost" onClick={() => navigate(PATHS.admin.meetings)}>
              <ChevronLeft size={16} /> Back to Meetings
            </WorkspaceButton>
          }
        />
        <div style={{ display: "grid", gap: 24 }}>
          {actionError && <WorkspaceCard style={{ color: C.danger }}>{actionError}</WorkspaceCard>}
          <div className="grid md:grid-cols-3 gap-6">
            <InfoCard label="Status" value={statusLabel(selectedMeeting.status)} />
            <InfoCard label="Citizen" value={[selectedMeeting.first_name, selectedMeeting.last_name].filter(Boolean).join(" ")} subValue={selectedMeeting.mobile_number || selectedMeeting.email || "No contact"} />
            <InfoCard label="Preferred Time" value={selectedMeeting.preferred_time ? new Date(selectedMeeting.preferred_time).toLocaleString("en-IN") : "Not provided"} />
          </div>

          <WorkspaceCard style={{ display: "grid", gap: 18 }}>
            <WorkspaceCardHeader title="Workflow Actions" subtitle="All state changes here follow the secured meeting workflow." />
            {canAccept && (
              <WorkspaceButton type="button" disabled={actionLoading}
                onClick={() => runAction(() => apiClient.patch(`/meetings/${meetingId}/accept`, {}, authorizedConfig(session.accessToken)))}>
                Accept Meeting
              </WorkspaceButton>
            )}
            {(canAccept || canSendVerification || canSchedule || canCompleteOrCancel) && (
              <div className="space-y-3" style={{ padding: 18, borderRadius: 12, border: `1px solid ${C.border}`, background: C.bgElevated }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: ".08em" }}>Decision Notes</div>
                <textarea value={decisionReason} onChange={(e) => setDecisionReason(e.target.value)} rows={3} placeholder="Reason or administrative note"
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.inp, color: C.t1, fontSize: 13, outline: "none" }} />
                <div className="flex flex-wrap gap-3">
                  {(canAccept || canSendVerification || canSchedule) && (
                    <WorkspaceButton type="button" variant="danger" disabled={actionLoading || decisionReason.trim().length < 3}
                      onClick={() => runAction(() => apiClient.patch(`/meetings/${meetingId}/reject`, { reason: decisionReason }, authorizedConfig(session.accessToken)))}>
                      Reject Meeting
                    </WorkspaceButton>
                  )}
                  {canCompleteOrCancel && (
                    <>
                      <WorkspaceButton type="button" disabled={actionLoading || decisionReason.trim().length < 3}
                        onClick={() => runAction(() => apiClient.patch(`/meetings/${meetingId}/complete`, { reason: decisionReason }, authorizedConfig(session.accessToken)))}
                        style={{ background: C.mint, color: "#ffffff", border: "none" }}>
                        Mark Completed
                      </WorkspaceButton>
                      <WorkspaceButton type="button" variant="danger" disabled={actionLoading || decisionReason.trim().length < 3}
                        onClick={() => runAction(() => apiClient.patch(`/meetings/${meetingId}/cancel`, { reason: decisionReason }, authorizedConfig(session.accessToken)))}>
                        Cancel Meeting
                      </WorkspaceButton>
                    </>
                  )}
                </div>
              </div>
            )}
            {canSendVerification && (
              <div className="space-y-3 pt-4" style={{ borderTop: `1px solid ${C.border}`, paddingTop: 20 }}>
                <div style={{ padding: 18, borderRadius: 12, border: `1px solid ${C.border}`, background: C.bgElevated }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: C.t1 }}>Send for DEO Verification</h3>
                  <p style={{ fontSize: 12, color: C.t3, marginTop: 4 }}>Assign a verified DEO to complete the verification pass.</p>
                </div>
                <input type="hidden" value={verificationForm.deoId} readOnly />
                <WorkspaceSelect value={verificationForm.deoId} onChange={(e) => setVerificationForm((c) => ({ ...c, deoId: e.target.value }))}>
                  <option value="">Select DEO</option>
                  {workflowDirectory.deos.map((deo) => (
                    <option key={deo.id} value={deo.id}>{[deo.first_name, deo.last_name].filter(Boolean).join(" ")} · {deo.designation}</option>
                  ))}
                </WorkspaceSelect>
                <WorkspaceButton type="button" disabled={actionLoading || !verificationForm.deoId}
                  onClick={() => runAction(() => apiClient.patch(`/meetings/${meetingId}/assign-verification`, { deoId: verificationForm.deoId }, authorizedConfig(session.accessToken)))}>
                  Send to Verification
                </WorkspaceButton>
              </div>
            )}
            {canSchedule && (
              <div className="space-y-3 pt-4" style={{ borderTop: `1px solid ${C.border}`, paddingTop: 20 }}>
                <div style={{ padding: 18, borderRadius: 12, border: `1px solid ${C.border}`, background: C.bgElevated }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: C.t1 }}>{selectedMeeting.status === "scheduled" ? "Reschedule Meeting" : "Schedule Meeting"}</h3>
                  <p style={{ fontSize: 12, color: C.t3, marginTop: 4 }}>Finalize the minister, venue, and time window for the citizen meeting.</p>
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  <WorkspaceSelect value={scheduleForm.ministerId} onChange={(e) => setScheduleForm((c) => ({ ...c, ministerId: e.target.value }))}>
                    <option value="">Select Minister</option>
                    {workflowDirectory.ministers.map((m) => (
                      <option key={m.id} value={m.id}>{[m.first_name, m.last_name].filter(Boolean).join(" ")}</option>
                    ))}
                  </WorkspaceSelect>
                  <WorkspaceInput value={scheduleForm.location} onChange={(e) => setScheduleForm((c) => ({ ...c, location: e.target.value }))} placeholder="Location" />
                  <WorkspaceInput type="datetime-local" value={scheduleForm.startsAt} onChange={(e) => setScheduleForm((c) => ({ ...c, startsAt: e.target.value }))} />
                  <WorkspaceInput type="datetime-local" value={scheduleForm.endsAt} onChange={(e) => setScheduleForm((c) => ({ ...c, endsAt: e.target.value }))} />
                </div>
                <label className="flex items-center gap-2" style={{ fontSize: 13, color: C.t2 }}>
                  <input type="checkbox" checked={scheduleForm.isVip} onChange={(e) => setScheduleForm((c) => ({ ...c, isVip: e.target.checked }))} />
                  Mark as VIP meeting
                </label>
                <textarea value={scheduleForm.comments} onChange={(e) => setScheduleForm((c) => ({ ...c, comments: e.target.value }))} rows={3} placeholder="Comments"
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.inp, color: C.t1, fontSize: 13, outline: "none" }} />
                <WorkspaceButton type="button"
                  disabled={actionLoading || !scheduleForm.ministerId || !scheduleForm.startsAt || !scheduleForm.endsAt || !scheduleForm.location}
                  onClick={() => runAction(() => apiClient.patch(`/meetings/${meetingId}/schedule`, {
                    ministerId: scheduleForm.ministerId,
                    startsAt: new Date(scheduleForm.startsAt).toISOString(),
                    endsAt: new Date(scheduleForm.endsAt).toISOString(),
                    location: scheduleForm.location,
                    isVip: scheduleForm.isVip,
                    comments: scheduleForm.comments,
                  }, authorizedConfig(session.accessToken)))}>
                  {selectedMeeting.status === "scheduled" ? "Reschedule Meeting" : "Schedule Meeting"}
                </WorkspaceButton>
              </div>
            )}
          </WorkspaceCard>

          <WorkspaceCard style={{ display: "grid", gap: 16 }}>
            <WorkspaceCardHeader title="Meeting Files" subtitle="This meeting only. Uploaded photos here are what the minister sees in the calendar details." />
            {canUploadPhotos ? (
              <div className="flex flex-wrap items-center gap-3">
                <input type="file" accept="image/png,image/jpeg" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} />
                <WorkspaceButton type="button" disabled={!uploadFile || uploadingFile} onClick={uploadMeetingPhoto}>
                  {uploadingFile ? "Uploading..." : "Upload Photo"}
                </WorkspaceButton>
              </div>
            ) : (
              <div style={{ fontSize: 13, color: C.t3 }}>Photos can be uploaded after the meeting is scheduled.</div>
            )}
            {meetingFiles.length === 0 ? (
              <div style={{ fontSize: 13, color: C.t3 }}>No files attached to this meeting yet.</div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {meetingFiles.map((file) => (
                  <div key={file.id} style={{ padding: 12, borderRadius: 12, border: `1px solid ${C.border}`, background: C.bgElevated }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.t1 }}>{file.name}</div>
                    <div style={{ marginTop: 4, fontSize: 12, color: C.t3 }}>{file.mimeType}</div>
                  </div>
                ))}
              </div>
            )}
          </WorkspaceCard>

          <WorkspaceCard>
            <WorkspaceCardHeader title="Meeting Information" />
            <div className="grid md:grid-cols-2 gap-8" style={{ fontSize: 13, color: C.t2 }}>
              <DetailItem label="Request ID"         value={selectedMeeting.requestId || selectedMeeting.id} />
              <DetailItem label="Citizen ID"         value={selectedMeeting.citizen_id || selectedMeeting.citizen_code} />
              <DetailItem label="Admin Referral"     value={selectedMeeting.admin_referral || "Not provided"} />
              <DetailItem label="Scheduled At"       value={selectedMeeting.scheduled_at ? new Date(selectedMeeting.scheduled_at).toLocaleString("en-IN") : "Pending"} />
              <DetailItem label="Scheduled Location" value={selectedMeeting.scheduled_location || "Pending"} />
              <DetailItem label="VIP"                value={selectedMeeting.is_vip ? "Yes" : "No"} />
              <DetailItem label="Visitor ID"         value={selectedMeeting.visitorId || "Pending"} />
              <DetailItem label="Meeting Docket"     value={selectedMeeting.meetingDocket || "Pending"} />
              <DetailItem label="Assigned Admin"     value={selectedMeeting.assignedAdminName || "Pending"} />
              <DetailItem label="Assigned DEO"       value={selectedMeeting.assignedDeoName || "Pending"} />
              <DetailItem label="Created At"         value={new Date(selectedMeeting.created_at).toLocaleString("en-IN")} />
            </div>
            {(selectedMeeting.rejection_reason || selectedMeeting.verification_reason || selectedMeeting.admin_comments || selectedMeeting.completionNote || selectedMeeting.cancellationReason) && (
              <div className="mt-6 space-y-3">
                {selectedMeeting.rejection_reason   && <NoticeBox tone="red"   label="Rejection Reason"    value={selectedMeeting.rejection_reason} />}
                {selectedMeeting.verification_reason && <NoticeBox tone="amber" label="Verification Reason" value={selectedMeeting.verification_reason} />}
                {selectedMeeting.admin_comments      && <NoticeBox tone="blue"  label="Admin Comments"      value={selectedMeeting.admin_comments} />}
                {selectedMeeting.completionNote      && <NoticeBox tone="blue"  label="Completion Note"     value={selectedMeeting.completionNote} />}
                {selectedMeeting.cancellationReason  && <NoticeBox tone="red"   label="Cancellation Reason" value={selectedMeeting.cancellationReason} />}
              </div>
            )}
          </WorkspaceCard>

          <WorkspaceCard>
            <WorkspaceCardHeader title="Activity Timeline" subtitle="Chronological movement of this meeting through the workflow." />
            <div className="space-y-4">
              {history.map((event, index) => (
                <div key={`${event.created_at}-${index}`} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full" style={{ background: C.purple, border: `2px solid ${C.card}` }} />
                    {index !== history.length - 1 && <div className="w-0.5 h-12 mt-2" style={{ background: C.border }} />}
                  </div>
                  <div className="flex-1 pb-4">
                    <div style={{ background: C.bgElevated, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16 }}>
                      <p style={{ fontWeight: 600, color: C.t1 }}>{statusLabel(event.new_status)}</p>
                      <p style={{ fontSize: 12, color: C.t3, marginTop: 4 }}>{event.actor_role}</p>
                      {event.note && <p style={{ fontSize: 13, color: C.t2, marginTop: 8 }}>{event.note}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </WorkspaceCard>
        </div>
      </WorkspacePage>
    );
  }

  // ── LIST VIEW ─────────────────────────────────────────────────────────────
  return (
    <WorkspacePage width={1280}>
      {/* Container set to max-width to match the image layout */}
      <div style={{ maxWidth: "1150px", margin: "0 auto", width: "100%" }}>
        <WorkspaceSectionHeader
          eyebrow="Admin Workspace"
          title="Meeting Queue"
          subtitle="Admin-facing queue sourced from the backend meeting workflow."
        />

        <div style={{ display: "grid", gap: 24 }}>
          <WorkspaceStatGrid items={queueStats} />

          <WorkspaceCard>
            <WorkspaceCardHeader title="Queue Search" subtitle="Search by title, purpose, citizen identity, or meeting state." />
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              {/* Search input */}
              <div className="relative" style={{ flex: 1 }}>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2" size={18} style={{ color: C.t3 }} />
                <WorkspaceInput
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by title, purpose, citizen, or status..."
                  style={{ paddingLeft: 40 }}
                />
              </div>

              {/* ── View toggle ── */}
              <div style={{ display: "flex", border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden", flexShrink: 0 }}>
                <button
                  onClick={() => setViewMode("grid")}
                  title="Grid view"
                  style={{
                    padding: "9px 14px",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    border: "none",
                    background: viewMode === "grid" ? C.purple : C.card,
                    color: viewMode === "grid" ? "#fff" : C.t3,
                    transition: "all 0.15s",
                  }}
                >
                  <LayoutGrid size={15} />
                  Grid
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  title="List view"
                  style={{
                    padding: "9px 14px",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    border: "none",
                    borderLeft: `1px solid ${C.border}`,
                    background: viewMode === "list" ? C.purple : C.card,
                    color: viewMode === "list" ? "#fff" : C.t3,
                    transition: "all 0.15s",
                  }}
                >
                  <List size={15} />
                  List
                </button>
              </div>
            </div>
          </WorkspaceCard>

          {loading ? (
            <WorkspaceEmptyState title="Loading meeting queue..." />
          ) : error ? (
            <WorkspaceCard style={{ color: C.danger }}>{error}</WorkspaceCard>
          ) : filteredMeetings.length === 0 ? (
            <WorkspaceEmptyState title="No meetings found" subtitle="Try adjusting your search." />
          ) : viewMode === "grid" ? (

            /* ── GRID LAYOUT ── */
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMeetings.map((meeting) => (
                <WorkspaceCard
                  key={meeting.id}
                  style={{ cursor: "pointer", padding: 0, overflow: "hidden" }}
                  onClick={() => navigate(`/admin/meetings/${meeting.id}`)}
                >
                  <div style={{ padding: "18px 18px 14px", borderBottom: `1px solid ${C.borderLight}`, background: C.bgElevated }}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: ".08em" }}>{meeting.id}</p>
                        <h3 style={{ fontSize: 14, fontWeight: 700, color: C.t1, marginTop: 6 }}>{meeting.title}</h3>
                        <p style={{ fontSize: 13, color: C.t2, marginTop: 8, lineHeight: 1.6 }}>{meeting.purpose}</p>
                      </div>
                      <WorkspaceBadge status={meeting.status}>{statusLabel(meeting.status)}</WorkspaceBadge>
                    </div>
                  </div>
                  <div className="space-y-3" style={{ fontSize: 13, color: C.t2, padding: 18 }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 6 }}>Citizen</div>
                      <div>{[meeting.first_name, meeting.last_name].filter(Boolean).join(" ")}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 6 }}>Contact</div>
                      <div>{meeting.mobile_number || meeting.email || "No contact"}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 6 }}>Preferred Slot</div>
                      <div>{meeting.preferred_time ? new Date(meeting.preferred_time).toLocaleString("en-IN") : "No preferred time"}</div>
                    </div>
                  </div>
                </WorkspaceCard>
              ))}
            </div>

          ) : (

            /* ── LIST LAYOUT ── */
            <WorkspaceCard style={{ padding: 0, overflow: "hidden" }}>
              {/* List header */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr 1.5fr 1.5fr 1.5fr auto 60px", gap: 16, padding: "10px 20px", background: C.bgElevated, borderBottom: `1px solid ${C.border}` }}>
                {["Citizen ID", "Meeting Title", "Citizen", "Contact", "Preferred Slot", "Status", "Action"].map((col) => (
                  <div key={col} style={{ fontSize: 10, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: ".08em", textAlign: col === "Action" || col === "Status" ? "center" : "left" }}>
                    {col}
                  </div>
                ))}
              </div>

              {filteredMeetings.map((meeting, idx) => (
                <div
                  key={meeting.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 2fr 1.5fr 1.5fr 1.5fr auto 60px",
                    gap: 16,
                    padding: "14px 20px",
                    alignItems: "center",
                    background: idx % 2 === 0 ? C.card : C.bgElevated,
                    borderBottom: `1px solid ${C.borderLight}`,
                    transition: "background 0.12s",
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = `${C.purple}0d`}
                  onMouseLeave={(e) => e.currentTarget.style.background = idx % 2 === 0 ? C.card : C.bgElevated}
                >
                  
                 {/* Citizen ID */}
                  <div 
                    title={meeting.citizen_id || meeting.citizen_code} 
                    style={{ 
                      fontSize: 13, 
                      fontWeight: 600, 
                      color: C.purple, 
                      whiteSpace: "nowrap", 
                      overflow: "hidden", 
                      textOverflow: "ellipsis" 
                    }}
                  >
                    {meeting.citizen_id || meeting.citizen_code || "—"}
                  </div>

                  {/* Meeting title */}
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: C.t1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{meeting.title}</p>
                  </div>

                  {/* Citizen */}
                  <div style={{ fontSize: 13, color: C.t2, fontWeight: 500 }}>
                    {[meeting.first_name, meeting.last_name].filter(Boolean).join(" ") || "—"}
                  </div>

                  {/* Contact */}
                  <div style={{ fontSize: 13, color: C.t2 }}>
                    {meeting.mobile_number || meeting.email || "—"}
                  </div>

                  {/* Preferred slot */}
                  <div style={{ fontSize: 13, color: C.t2 }}>
                    {meeting.preferred_time ? new Date(meeting.preferred_time).toLocaleString("en-IN") : "—"}
                  </div>

                  {/* Badge */}
                  <div style={{ textAlign: "center" }}>
                    <WorkspaceBadge status={meeting.status}>{statusLabel(meeting.status)}</WorkspaceBadge>
                  </div>

                  {/* Action (Eye Icon) */}
                  <div style={{ textAlign: "center" }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/admin/meetings/${meeting.id}`);
                      }}
                      style={{
                        color: C.purple,
                        background: `${C.purple}10`,
                        border: `1px solid ${C.purple}22`,
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        transition: "all 0.2s"
                      }}
                      title="View details"
                      onMouseEnter={(e) => e.currentTarget.style.background = `${C.purple}20`}
                      onMouseLeave={(e) => e.currentTarget.style.background = `${C.purple}10`}
                    >
                      <Eye size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </WorkspaceCard>
          )}
        </div>
      </div>
    </WorkspacePage>
  );
}

function InfoCard({ label, value, subValue }) {
  const { C } = usePortalTheme();
  return (
    <WorkspaceCard style={{ padding: 18 }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: ".08em" }}>{label}</p>
      <div style={{ marginTop: 10, fontSize: 18, fontWeight: 700, color: C.t1, lineHeight: 1.4 }}>{value}</div>
      {subValue && <p style={{ fontSize: 12, color: C.t3, marginTop: 8 }}>{subValue}</p>}
    </WorkspaceCard>
  );
}

function DetailItem({ label, value }) {
  const { C } = usePortalTheme();
  return (
    <div>
      <p style={{ fontSize: 11, color: C.t3, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 }}>{label}</p>
      <p style={{ fontSize: 16, fontWeight: 600, color: C.t1 }}>{value}</p>
    </div>
  );
}

function NoticeBox({ tone, label, value }) {
  const { C } = usePortalTheme();
  const color = { red: C.danger, amber: C.warn, blue: C.purple }[tone] || C.purple;
  return (
    <div style={{ padding: 16, borderRadius: 10, border: `1px solid ${color}33`, background: `${color}12` }}>
      <p style={{ fontSize: 11, fontWeight: 700, color, textTransform: "uppercase", marginBottom: 8 }}>{label}</p>
      <p style={{ fontSize: 13, color: C.t2 }}>{value}</p>
    </div>
  );
}