export const execSummary = {
  visitorsScheduledToday: 148,
  vipDelegationToday: 12,
  pendingComplaints: 44,
  resolvedThisWeek: 67,
  avgTAT: 3.2,
  highPriorityCases: 8,
  meetingsWithHCM: 5,
};

export const meetingsData = {
  week: [
    { label: "Mon", conducted: 3, scheduled: 4, cancelled: 1 },
    { label: "Tue", conducted: 5, scheduled: 5, cancelled: 0 },
    { label: "Wed", conducted: 2, scheduled: 3, cancelled: 1 },
    { label: "Thu", conducted: 6, scheduled: 6, cancelled: 0 },
    { label: "Fri", conducted: 4, scheduled: 5, cancelled: 1 },
    { label: "Sat", conducted: 1, scheduled: 2, cancelled: 1 },
    { label: "Sun", conducted: 0, scheduled: 1, cancelled: 1 },
  ],
  month: [
    { label: "Week 1", conducted: 18, scheduled: 22, cancelled: 4 },
    { label: "Week 2", conducted: 24, scheduled: 26, cancelled: 2 },
    { label: "Week 3", conducted: 20, scheduled: 23, cancelled: 3 },
    { label: "Week 4", conducted: 28, scheduled: 30, cancelled: 2 },
  ],
  year: [
    { label: "Jan", conducted: 82, scheduled: 90, cancelled: 8 },
    { label: "Feb", conducted: 76, scheduled: 84, cancelled: 8 },
    { label: "Mar", conducted: 94, scheduled: 100, cancelled: 6 },
    { label: "Apr", conducted: 88, scheduled: 95, cancelled: 7 },
    { label: "May", conducted: 102, scheduled: 110, cancelled: 8 },
    { label: "Jun", conducted: 91, scheduled: 98, cancelled: 7 },
    { label: "Jul", conducted: 78, scheduled: 85, cancelled: 7 },
    { label: "Aug", conducted: 85, scheduled: 92, cancelled: 7 },
    { label: "Sep", conducted: 99, scheduled: 106, cancelled: 7 },
    { label: "Oct", conducted: 108, scheduled: 115, cancelled: 7 },
    { label: "Nov", conducted: 96, scheduled: 104, cancelled: 8 },
    { label: "Dec", conducted: 72, scheduled: 80, cancelled: 8 },
  ],
};

export const meetingStats = {
  week: { total: 21, completionRate: 84, upcoming: 3, cancelled: 3 },
  month: { total: 90, completionRate: 87, upcoming: 11, cancelled: 11 },
  year: { total: 1071, completionRate: 88, upcoming: 42, cancelled: 83 },
};

export const complaintsData = {
  week: [
    { label: "Mon", received: 12, resolved: 8, pending: 4 },
    { label: "Tue", received: 15, resolved: 11, pending: 4 },
    { label: "Wed", received: 9, resolved: 6, pending: 3 },
    { label: "Thu", received: 18, resolved: 14, pending: 4 },
    { label: "Fri", received: 13, resolved: 9, pending: 4 },
    { label: "Sat", received: 6, resolved: 4, pending: 2 },
    { label: "Sun", received: 3, resolved: 2, pending: 1 },
  ],
  month: [
    { label: "Week 1", received: 67, resolved: 48, pending: 19 },
    { label: "Week 2", received: 82, resolved: 61, pending: 21 },
    { label: "Week 3", received: 74, resolved: 54, pending: 20 },
    { label: "Week 4", received: 91, resolved: 70, pending: 21 },
  ],
  year: [
    { label: "Jan", received: 312, resolved: 245, pending: 67 },
    { label: "Feb", received: 287, resolved: 221, pending: 66 },
    { label: "Mar", received: 341, resolved: 268, pending: 73 },
    { label: "Apr", received: 314, resolved: 247, pending: 67 },
    { label: "May", received: 378, resolved: 302, pending: 76 },
    { label: "Jun", received: 356, resolved: 281, pending: 75 },
    { label: "Jul", received: 298, resolved: 234, pending: 64 },
    { label: "Aug", received: 323, resolved: 257, pending: 66 },
    { label: "Sep", received: 367, resolved: 291, pending: 76 },
    { label: "Oct", received: 401, resolved: 318, pending: 83 },
    { label: "Nov", received: 352, resolved: 276, pending: 76 },
    { label: "Dec", received: 271, resolved: 210, pending: 61 },
  ],
};

export const complaintStatusBuckets = {
  week: [
    { name: "Resolved", value: 54 },
    { name: "Open", value: 15 },
    { name: "In Progress", value: 8 },
    { name: "Escalated", value: 5 },
    { name: "Closed", value: 2 },
  ],
  month: [
    { name: "Resolved", value: 233 },
    { name: "Open", value: 54 },
    { name: "In Progress", value: 38 },
    { name: "Escalated", value: 22 },
    { name: "Closed", value: 67 },
  ],
  year: [
    { name: "Resolved", value: 2950 },
    { name: "Open", value: 312 },
    { name: "In Progress", value: 228 },
    { name: "Escalated", value: 144 },
    { name: "Closed", value: 750 },
  ],
};

export const complaintsByCategory = [
  { category: "Public Grievance", count: 72, resolved: 54 },
  { category: "Infrastructure", count: 55, resolved: 38 },
  { category: "Heritage", count: 48, resolved: 32 },
  { category: "Staff Misconduct", count: 36, resolved: 22 },
  { category: "Event Issues", count: 28, resolved: 20 },
  { category: "Digital Services", count: 19, resolved: 14 },
];

export const departmentPending = [
  { dept: "Admin", pending: 24, slaBreached: 6 },
  { dept: "Heritage", pending: 18, slaBreached: 4 },
  { dept: "Maintenance", pending: 21, slaBreached: 5 },
  { dept: "IT & Digital", pending: 15, slaBreached: 3 },
  { dept: "Events", pending: 12, slaBreached: 2 },
  { dept: "Security", pending: 8, slaBreached: 1 },
];

export const tatData = {
  week: [
    { label: "Mon", avgDays: 2.8, target: 3 },
    { label: "Tue", avgDays: 3.1, target: 3 },
    { label: "Wed", avgDays: 2.5, target: 3 },
    { label: "Thu", avgDays: 3.8, target: 3 },
    { label: "Fri", avgDays: 3.2, target: 3 },
    { label: "Sat", avgDays: 2.9, target: 3 },
    { label: "Sun", avgDays: 2.1, target: 3 },
  ],
  month: [
    { label: "Week 1", avgDays: 2.9, target: 3 },
    { label: "Week 2", avgDays: 3.2, target: 3 },
    { label: "Week 3", avgDays: 2.7, target: 3 },
    { label: "Week 4", avgDays: 3.5, target: 3 },
  ],
  year: [
    { label: "Jan", avgDays: 3.2, target: 3 },
    { label: "Feb", avgDays: 3.5, target: 3 },
    { label: "Mar", avgDays: 2.9, target: 3 },
    { label: "Apr", avgDays: 3.1, target: 3 },
    { label: "May", avgDays: 2.8, target: 3 },
    { label: "Jun", avgDays: 3.3, target: 3 },
    { label: "Jul", avgDays: 3.8, target: 3 },
    { label: "Aug", avgDays: 3.4, target: 3 },
    { label: "Sep", avgDays: 3.1, target: 3 },
    { label: "Oct", avgDays: 2.7, target: 3 },
    { label: "Nov", avgDays: 2.9, target: 3 },
    { label: "Dec", avgDays: 3.0, target: 3 },
  ],
};

export const slaBreachAlerts = [
  { id: "C-2481", dept: "Heritage Dept", daysOverdue: 4, priority: "High" },
  { id: "C-2475", dept: "Maintenance", daysOverdue: 2, priority: "Critical" },
  { id: "C-2469", dept: "Admin", daysOverdue: 6, priority: "Critical" },
  { id: "C-2461", dept: "IT & Digital", daysOverdue: 1, priority: "Medium" },
  { id: "C-2455", dept: "Events", daysOverdue: 3, priority: "High" },
];

export const escalationLadder = [
  { level: "Level 1 – Dept Officer", count: 28 },
  { level: "Level 2 – Director", count: 12 },
  { level: "Level 3 – DG / Secretary", count: 5 },
  { level: "Level 4 – Minister", count: 2 },
];

export const topRecurringComplaints = [
  { complaint: "Heritage site maintenance delay", count: 23, trend: "up" },
  { complaint: "Event permit processing time", count: 19, trend: "down" },
  { complaint: "Staff unresponsiveness", count: 17, trend: "up" },
  { complaint: "Online portal errors", count: 15, trend: "down" },
  { complaint: "Public gathering restrictions", count: 12, trend: "neutral" },
];

export const visitorTrends = {
  week: [
    { label: "Mon", visitors: 124, approved: 108, rejected: 16 },
    { label: "Tue", visitors: 148, approved: 132, rejected: 16 },
    { label: "Wed", visitors: 96, approved: 84, rejected: 12 },
    { label: "Thu", visitors: 182, approved: 161, rejected: 21 },
    { label: "Fri", visitors: 156, approved: 138, rejected: 18 },
    { label: "Sat", visitors: 72, approved: 64, rejected: 8 },
    { label: "Sun", visitors: 38, approved: 35, rejected: 3 },
  ],
  month: [
    { label: "Week 1", visitors: 724, approved: 642, rejected: 82 },
    { label: "Week 2", visitors: 856, approved: 768, rejected: 88 },
    { label: "Week 3", visitors: 792, approved: 710, rejected: 82 },
    { label: "Week 4", visitors: 918, approved: 822, rejected: 96 },
  ],
  year: [
    { label: "Jan", visitors: 3240, approved: 2890, rejected: 350 },
    { label: "Feb", visitors: 2980, approved: 2640, rejected: 340 },
    { label: "Mar", visitors: 3540, approved: 3170, rejected: 370 },
    { label: "Apr", visitors: 3280, approved: 2930, rejected: 350 },
    { label: "May", visitors: 3820, approved: 3420, rejected: 400 },
    { label: "Jun", visitors: 3560, approved: 3190, rejected: 370 },
    { label: "Jul", visitors: 2890, approved: 2560, rejected: 330 },
    { label: "Aug", visitors: 3120, approved: 2800, rejected: 320 },
    { label: "Sep", visitors: 3450, approved: 3090, rejected: 360 },
    { label: "Oct", visitors: 3780, approved: 3390, rejected: 390 },
    { label: "Nov", visitors: 3340, approved: 2990, rejected: 350 },
    { label: "Dec", visitors: 2680, approved: 2390, rejected: 290 },
  ],
};

export const visitorByCategory = [
  { category: "Public", count: 842 },
  { category: "Officials", count: 218 },
  { category: "Delegations", count: 124 },
  { category: "Scholars", count: 95 },
  { category: "Artists", count: 76 },
  { category: "NGOs", count: 63 },
  { category: "Foreign Guests", count: 48 },
];

export const peakHoursData = [
  { hour: "08:00", visitors: 24 },
  { hour: "09:00", visitors: 48 },
  { hour: "10:00", visitors: 82 },
  { hour: "11:00", visitors: 96 },
  { hour: "12:00", visitors: 74 },
  { hour: "13:00", visitors: 42 },
  { hour: "14:00", visitors: 88 },
  { hour: "15:00", visitors: 102 },
  { hour: "16:00", visitors: 78 },
  { hour: "17:00", visitors: 56 },
  { hour: "18:00", visitors: 28 },
];

export const securityClearance = { cleared: 1284, pending: 187, flagged: 23 };

export const stateWiseRequests = [
  { state: "Punjab", requests: 1842, approved: 1624 },
  { state: "Sindh", requests: 1241, approved: 1089 },
  { state: "KPK", requests: 834, approved: 721 },
  { state: "Balochistan", requests: 512, approved: 448 },
  { state: "ICT", requests: 421, approved: 378 },
  { state: "AJK", requests: 234, approved: 198 },
  { state: "GB", requests: 156, approved: 134 },
];

export const repeatVisitors = [
  { name: "Muhammad Ali Khan", visits: 24, category: "Official", lastVisit: "2026-04-24" },
  { name: "Sarah Ahmed", visits: 18, category: "NGO", lastVisit: "2026-04-23" },
  { name: "Dr. Tariq Mahmood", visits: 16, category: "Scholar", lastVisit: "2026-04-22" },
  { name: "Zainab Raza", visits: 14, category: "Delegation", lastVisit: "2026-04-21" },
  { name: "Arjun Kapoor", visits: 12, category: "Foreign Guest", lastVisit: "2026-04-20" },
];
