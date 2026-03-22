import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Image, Alert, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { saveWorkout } from '@/db/database';
import { analyzeImage } from '@/services/imageAnalyzer';

export default function Upload() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function pickImage(useCamera: boolean) {
    const launcher = useCamera
      ? ImagePicker.launchCameraAsync
      : ImagePicker.launchImageLibraryAsync;

    const result = await launcher({
      mediaTypes: ['images'],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  }

  async function analyze() {
    if (!imageUri) return;
    setLoading(true);
    try {
      const data = await analyzeImage(imageUri);

      const id = await saveWorkout({
        source: 'image',
        activity_type: data.activity_type ?? 'walk',
        date: data.date ?? new Date().toISOString().slice(0, 10),
        start_time: data.start_time,
        duration_seconds: data.duration_seconds,
        distance_miles: data.distance_miles,
        calories_burned: data.calories_burned,
        steps: data.steps,
        avg_pace: data.avg_pace,
        avg_heart_rate: data.avg_heart_rate,
        heart_rate_zones: data.heart_rate_zones ? JSON.stringify(data.heart_rate_zones) : null,
        elevation_gain_ft: data.elevation_gain_ft,
        cardio_load: data.cardio_load,
        zone_minutes: data.zone_minutes,
        image_uri: imageUri,
        fitbit_activity_id: null,
      });

      Alert.alert('Success', 'Workout data extracted and saved!');
      router.push(`/workout/${id}`);
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Analysis failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Upload Fitness Screenshot</Text>
      <Text style={styles.sub}>
        Snap or pick a screenshot from any fitness app. AI will extract all the data.
      </Text>

      <View style={styles.buttons}>
        <Pressable style={styles.btn} onPress={() => pickImage(true)}>
          <Text style={styles.btnText}>Camera</Text>
        </Pressable>
        <Pressable style={[styles.btn, styles.btnSecondary]} onPress={() => pickImage(false)}>
          <Text style={styles.btnText}>Gallery</Text>
        </Pressable>
      </View>

      {imageUri && (
        <View style={styles.previewContainer}>
          <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="contain" />
        </View>
      )}

      {imageUri && (
        <Pressable
          style={[styles.analyzeBtn, loading && styles.disabled]}
          onPress={analyze}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#1a1a2e" />
          ) : (
            <Text style={styles.analyzeBtnText}>Analyze & Save</Text>
          )}
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e', padding: 16 },
  heading: { color: '#fff', fontSize: 22, fontWeight: '700', marginBottom: 8 },
  sub: { color: '#888', fontSize: 14, marginBottom: 20 },
  buttons: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  btn: { flex: 1, backgroundColor: '#4fc3f7', borderRadius: 10, padding: 16, alignItems: 'center' },
  btnSecondary: { backgroundColor: '#2a2a3e' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  previewContainer: { alignItems: 'center', marginBottom: 20 },
  preview: { width: '100%', height: 350, borderRadius: 12 },
  analyzeBtn: { backgroundColor: '#4fc3f7', borderRadius: 10, padding: 16, alignItems: 'center' },
  analyzeBtnText: { color: '#1a1a2e', fontWeight: '700', fontSize: 16 },
  disabled: { opacity: 0.6 },
});
