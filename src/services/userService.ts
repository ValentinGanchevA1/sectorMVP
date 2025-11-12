// src/services/userService.ts
import { apiClient } from './api';
import { UserProfile } from '../types';

interface ProfileUpdateData {
displayName?: string;
bio?: string;
interests?: string[];
ageMin?: number;
ageMax?: number;
maxDistance?: number;
lookingFor?: ('dating' | 'friendship' | 'trading' | 'events')[];
}

interface PreferencesData {
  notifications: boolean;
  locationSharing: boolean;
  showOnMap: boolean;
  privacyLevel: 1 | 2 | 3;
}

export const userService = {
  async getProfile(userId: string) {
    const response = await apiClient.get(`/users/${userId}/profile`);
    return response;
  },

  async updateProfile(profileData: ProfileUpdateData) {
    const response = await apiClient.put('/users/profile', profileData);
    return response;
  },

  async uploadProfileImage(imageUri: string) {
    const formData = new FormData();
    formData.append('image', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'profile.jpg',
    } as any);

    const response = await apiClient.post('/users/profile/image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response;
  },

  async updatePreferences(preferences: Partial<PreferencesData>) {
    const response = await apiClient.put('/users/preferences', preferences);
    return response;
  },

  async deleteAccount() {
    const response = await apiClient.delete('/users/account');
    return response;
  },

  async blockUser(userId: string) {
    const response = await apiClient.post(`/users/${userId}/block`);
    return response;
  },

  async reportUser(userId: string, reason: string) {
    const response = await apiClient.post(`/users/${userId}/report`, { reason });
    return response;
  },
};
