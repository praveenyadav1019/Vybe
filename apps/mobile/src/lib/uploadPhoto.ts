import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { api } from './api';

/**
 * Upload a locally-picked image to object storage via a presigned URL and
 * persist the resulting CDN URL on the user's profile.
 *
 * Flow: POST /me/photos/presign → PUT bytes to the presigned URL →
 * POST /me/photos with the public CDN URL. Returns the CDN URL.
 */
export async function uploadPhoto(
  localUri: string,
  mimeType: string = 'image/jpeg',
): Promise<string> {
  // 1. Ask the API for a presigned PUT URL.
  const { data } = await api.post<{ uploadUrl: string; publicUrl: string }>(
    '/me/photos/presign',
    { contentType: mimeType },
  );
  const { uploadUrl, publicUrl } = data;

  // 2. Upload the raw bytes directly to storage.
  if (Platform.OS === 'web') {
    const blob = await (await fetch(localUri)).blob();
    const res = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': mimeType },
      body: blob,
    });
    if (!res.ok) throw new Error(`Upload failed (${res.status})`);
  } else {
    const res = await FileSystem.uploadAsync(uploadUrl, localUri, {
      httpMethod: 'PUT',
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers: { 'Content-Type': mimeType },
    });
    if (res.status < 200 || res.status >= 300) {
      throw new Error(`Upload failed (${res.status})`);
    }
  }

  // 3. Persist the CDN URL on the profile.
  await api.post('/me/photos', { urls: [publicUrl] });
  return publicUrl;
}
