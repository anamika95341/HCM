import { apiClient } from '../../shared/api/client.js';

const roleToProfilePath = {
  citizen: '/citizen/me',
  admin: '/admin/me',
  masteradmin: '/masteradmin/me',
  minister: '/minister/me',
  deo: '/deo/me',
};

const roleToChangePasswordPath = {
  citizen: '/auth/citizen/change-password',
  admin: '/auth/admin/change-password',
  masteradmin: '/auth/masteradmin/change-password',
  minister: '/auth/minister/change-password',
  deo: '/auth/deo/change-password',
};

const roleToNotificationsPath = {
  citizen: '/citizen/me/notifications',
  admin: '/admin/me/notifications',
  masteradmin: '/masteradmin/me/notifications',
  minister: '/minister/me/notifications',
  deo: '/deo/me/notifications',
};

export async function fetchProfile(role) {
  const path = roleToProfilePath[role] ?? roleToProfilePath.citizen;
  const { data } = await apiClient.get(path);
  return data.profile ?? null;
}

export async function updateProfile(role, payload) {
  const path = roleToProfilePath[role] ?? roleToProfilePath.citizen;
  const { data } = await apiClient.patch(path, payload);
  return data;
}

export async function changePassword(role, payload) {
  const path = roleToChangePasswordPath[role] ?? roleToChangePasswordPath.citizen;
  const { data } = await apiClient.post(path, payload);
  return data;
}

export async function updateNotifications(role, payload) {
  const path = roleToNotificationsPath[role] ?? roleToNotificationsPath.citizen;
  const { data } = await apiClient.patch(path, payload);
  return data;
}

export async function fetchNotificationPreferences(role) {
  const path = roleToNotificationsPath[role] ?? roleToNotificationsPath.citizen;
  const { data } = await apiClient.get(path);
  return data.preferences ?? null;
}
