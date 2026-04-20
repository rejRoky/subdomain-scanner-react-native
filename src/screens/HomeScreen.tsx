import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { COLORS } from '../theme';
import { createJob, runEnumeration } from '../services/enumerator';
import type { TabParamList } from '../navigation/AppNavigator';

const DOMAIN_REGEX =
  /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,63}$/;

type NavProp = BottomTabNavigationProp<TabParamList, 'Home'>;

const SOURCES = [
  { name: 'crt.sh', desc: 'Certificate Transparency logs' },
  { name: 'HackerTarget', desc: 'Passive DNS search' },
  { name: 'RapidDNS', desc: 'DNS dataset' },
  { name: 'AlienVault OTX', desc: 'Open Threat Exchange' },
  { name: 'urlscan.io', desc: 'Web scan history' },
  { name: 'VirusTotal *', desc: 'Requires API key' },
];

export default function HomeScreen() {
  const navigation = useNavigation<NavProp>();
  const [domain, setDomain] = useState('');
  const [vtApiKey, setVtApiKey] = useState('');
  const [resolveDns, setResolveDns] = useState(true);
  const [showVt, setShowVt] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleEnumerate = () => {
    const trimmed = domain.trim().toLowerCase();
    if (!DOMAIN_REGEX.test(trimmed)) {
      Alert.alert('Invalid Domain', 'Enter a valid domain like example.com');
      return;
    }
    setLoading(true);
    try {
      const jobId = createJob({
        domain: trimmed,
        vt_api_key: vtApiKey.trim() || undefined,
        resolve_dns: resolveDns,
      });
      // fire-and-forget — runs in JS thread while UI continues
      runEnumeration(jobId, trimmed, vtApiKey.trim() || null, resolveDns);
      navigation.navigate('Jobs');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Subdomain</Text>
          <Text style={styles.titleAccent}>Enumerator</Text>
          <Text style={styles.subtitle}>
            Passive recon · 6 public sources · self-contained
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.fieldLabel}>TARGET DOMAIN</Text>
          <TextInput
            style={styles.input}
            placeholder="example.com"
            placeholderTextColor={COLORS.TEXT_SECONDARY}
            value={domain}
            onChangeText={setDomain}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            returnKeyType="go"
            onSubmitEditing={handleEnumerate}
          />

          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.fieldLabel}>RESOLVE DNS</Text>
              <Text style={styles.toggleHint}>Map each subdomain to an IP address</Text>
            </View>
            <Switch
              value={resolveDns}
              onValueChange={setResolveDns}
              trackColor={{ false: COLORS.BORDER, true: COLORS.PRIMARY + '88' }}
              thumbColor={resolveDns ? COLORS.PRIMARY : COLORS.TEXT_SECONDARY}
            />
          </View>

          <TouchableOpacity
            style={styles.vtToggle}
            onPress={() => setShowVt((v) => !v)}
            activeOpacity={0.7}
          >
            <Text style={styles.vtToggleText}>
              {showVt ? '▾' : '▸'} VirusTotal API Key{' '}
              <Text style={styles.vtOptional}>(optional)</Text>
            </Text>
          </TouchableOpacity>

          {showVt && (
            <TextInput
              style={[styles.input, { marginTop: 10, marginBottom: 0 }]}
              placeholder="Paste VirusTotal API key…"
              placeholderTextColor={COLORS.TEXT_SECONDARY}
              value={vtApiKey}
              onChangeText={setVtApiKey}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
            />
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.fieldLabel}>DATA SOURCES</Text>
          {SOURCES.map((src) => (
            <View key={src.name} style={styles.sourceRow}>
              <View style={styles.dot} />
              <Text style={styles.sourceName}>{src.name}</Text>
              <Text style={styles.sourceDesc}>{src.desc}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleEnumerate}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.BACKGROUND} />
          ) : (
            <Text style={styles.buttonText}>Start Enumeration</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.keepOpen}>
          Keep the app open while enumeration runs
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  scroll: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
    marginTop: 4,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: COLORS.TEXT,
    lineHeight: 38,
  },
  titleAccent: {
    fontSize: 34,
    fontWeight: '800',
    color: COLORS.PRIMARY,
    lineHeight: 42,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.TEXT_SECONDARY,
    marginTop: 4,
  },
  card: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.TEXT_SECONDARY,
    letterSpacing: 1,
    marginBottom: 10,
  },
  input: {
    backgroundColor: COLORS.INPUT_BG,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: COLORS.TEXT,
    fontSize: 16,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    marginBottom: 16,
    fontFamily: 'monospace',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  toggleInfo: {
    flex: 1,
    marginRight: 12,
  },
  toggleHint: {
    fontSize: 12,
    color: COLORS.TEXT_SECONDARY,
    marginTop: 2,
  },
  vtToggle: {
    paddingVertical: 4,
  },
  vtToggleText: {
    color: COLORS.PRIMARY,
    fontSize: 14,
    fontWeight: '600',
  },
  vtOptional: {
    color: COLORS.TEXT_SECONDARY,
    fontWeight: '400',
    fontSize: 12,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.PRIMARY,
    marginRight: 10,
  },
  sourceName: {
    fontSize: 13,
    color: COLORS.TEXT,
    fontWeight: '500',
    width: 120,
  },
  sourceDesc: {
    fontSize: 12,
    color: COLORS.TEXT_SECONDARY,
    flex: 1,
  },
  button: {
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  buttonText: {
    color: COLORS.BACKGROUND,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  keepOpen: {
    textAlign: 'center',
    fontSize: 11,
    color: COLORS.TEXT_SECONDARY,
    marginTop: 12,
  },
});
