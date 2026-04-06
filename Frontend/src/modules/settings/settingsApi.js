import { apiClient, authorizedConfig } from '../../shared/api/client.js';

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

export async function fetchProfile(role, accessToken) {
  const path = roleToProfilePath[role] ?? roleToProfilePath.citizen;
  const { data } = await apiClient.get(path, authorizedConfig(accessToken));
  return data.profile ?? null;
}

export async function updateProfile(role, payload, accessToken) {
  const path = roleToProfilePath[role] ?? roleToProfilePath.citizen;
  const { data } = await apiClient.patch(path, payload, authorizedConfig(accessToken));
  return data;
}

export async function changePassword(role, payload, accessToken) {
  const path = roleToChangePasswordPath[role] ?? roleToChangePasswordPath.citizen;
  const { data } = await apiClient.post(path, payload, authorizedConfig(accessToken));
  return data;
}

export async function updateNotifications(role, payload, accessToken) {
  const path = roleToNotificationsPath[role] ?? roleToNotificationsPath.citizen;
  const { data } = await apiClient.patch(path, payload, authorizedConfig(accessToken));
  return data;
}

export async function fetchNotificationPreferences(role, accessToken) {
  const path = roleToNotificationsPath[role] ?? roleToNotificationsPath.citizen;
  const { data } = await apiClient.get(path, authorizedConfig(accessToken));
  return data.preferences ?? null;
}
