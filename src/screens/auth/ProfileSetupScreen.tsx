// src/screens/auth/ProfileSetupScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  SafeAreaView,
} from 'react-native';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { updateCoreUser } from '@/store/slices/authSlice';
import { updateUserProfile, uploadProfileImage } from '@/store/slices/userSlice';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { ImagePicker } from '@/components/common/ImagePicker';

// Custom hook for unified loading state
const useLoadingState = () => {
  const { loading: authLoading } = useAppSelector((state) => state.auth);
  const { loading: userLoading } = useAppSelector((state) => state.user);
  return authLoading || userLoading;
};

export const ProfileSetupScreen: React.FC = () => {
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [profileImageUri, setProfileImageUri] = useState<string | null>(null);
  const dispatch = useAppDispatch();
  const isLoading = useLoadingState();

  const handleSaveProfile = async () => {
    if (!displayName.trim()) {
      Alert.alert('Display Name Required', 'Please enter how you want to be seen.');
      return;
    }
    try {
      // Dispatch synchronous action to update core user immediately
      dispatch(updateCoreUser({ displayName }));

      // Collect async thunks (which return promise-like results from dispatch)
      const asyncPromises: Promise<any>[] = [];
      if (profileImageUri) {
        asyncPromises.push(dispatch(uploadProfileImage(profileImageUri)) as Promise<any>);
      }
      if (bio.trim()) {
        asyncPromises.push(dispatch(updateUserProfile({ bio })) as Promise<any>);
      }

      // Wait for all async thunks to resolve (they expose `unwrap`)
      await Promise.all(asyncPromises.map((p) => (p as any).unwrap()));

      Alert.alert('Profile Saved!', 'Welcome to the app.');
    } catch (error: any) {
      console.error('Profile setup failed:', error);
      // REFACTOR: Provide a more specific error message from the rejected thunk payload.
      const errorMessage =
        error?.message || 'An unknown error occurred while saving your profile.';
      Alert.alert('Save Failed', errorMessage);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Complete Your Profile</Text>
          <Text style={styles.subtitle}>This is how others will see you.</Text>
        </View>
        <View style={styles.form}>
          <ImagePicker
            value={profileImageUri}
            onSelect={setProfileImageUri}
            style={styles.imagePicker}
          />
          <Input
            label="Display Name *"
            placeholder="e.g., Jane D."
            value={displayName}
            onChangeText={setDisplayName}
            maxLength={50}
          />
          <Input
            label="Bio"
            placeholder="Tell us a little about yourself..."
            value={bio}
            onChangeText={setBio}
            multiline
            numberOfLines={3}
            maxLength={200}
            containerStyle={styles.bioInput}
          />
          <Button
            title="Save & Continue"
            onPress={handleSaveProfile}
            loading={isLoading}
            style={styles.button}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// Styles are unchanged
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  header: { alignItems: 'center', paddingTop: 40, paddingBottom: 30 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#666', textAlign: 'center', lineHeight: 22 },
  form: { flex: 1 },
  imagePicker: { alignSelf: 'center', marginBottom: 30 },
  bioInput: { height: 100 },
  button: { marginTop: 30 },
});
