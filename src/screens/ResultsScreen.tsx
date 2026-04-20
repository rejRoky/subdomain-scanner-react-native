import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Share,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme';
import { getJob } from '../services/database';
import type { Job, SourceSummary } from '../types';
import type { RootStackParamList } from '../navigation/AppNavigator';

type ResultsRouteProp = RouteProp<RootStackParamList, 'Results'>;
type TabKey = 'overview' | 'live' | 'dead' | 'sources';

// ── Inline bar chart ──────────────────────────────────────────────────────────

function BarChart({ data }: { data: SourceSummary[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <View>
      {data.map((item) => (
        <View key={item.name} style={bar.row}>
          <Text style={bar.label} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={bar.track}>
            <View
              style={[
                bar.fill,
                { width: `${Math.max(4, (item.count / max) * 100)}%` as `${number}%` },
              ]}
            />
          </View>
          <Text style={bar.count}>{item.count}</Text>
        </View>
      ))}
    </View>
  );
}

const bar = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    width: 96,
    fontSize: 12,
    color: COLORS.TEXT_SECONDARY,
    fontFamily: 'monospace',
  },
  track: {
    flex: 1,
    height: 8,
    backgroundColor: COLORS.BORDER,
    borderRadius: 4,
    overflow: 'hidden',
    marginHorizontal: 8,
  },
  fill: {
    height: '100%',
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 4,
  },
  count: {
    width: 36,
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.TEXT,
    textAlign: 'right',
  },
});

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  value,
  label,
  color,
}: {
  value: number;
  label: string;
  color?: string;
}) {
  return (
    <View style={sc.card}>
      <Text style={[sc.value, color ? { color } : {}]}>{value}</Text>
      <Text style={sc.label}>{label}</Text>
    </View>
  );
}

const sc = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  value: {
    fontSize: 30,
    fontWeight: '800',
    color: COLORS.TEXT,
  },
  label: {
    fontSize: 11,
    color: COLORS.TEXT_SECONDARY,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
});

// ── Main screen ───────────────────────────────────────────────────────────────

export default function ResultsScreen() {
  const navigation = useNavigation();
  const route = useRoute<ResultsRouteProp>();
  const { jobId, domain } = route.params;

  const [job, setJob] = useState<Job | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  useFocusEffect(
    useCallback(() => {
      const load = () => {
        const j = getJob(jobId);
        setJob(j);
        return j;
      };
      const j = load();
      if (j?.status === 'running' || j?.status === 'pending') {
        const interval = setInterval(() => {
          const updated = load();
          if (
            updated?.status === 'completed' ||
            updated?.status === 'failed'
          ) {
            clearInterval(interval);
          }
        }, 1500);
        return () => clearInterval(interval);
      }
    }, [jobId])
  );

  const shareCSV = async (content: string, filename: string) => {
    try {
      await Share.share({ message: content, title: filename });
    } catch {
      Alert.alert('Error', 'Could not open share sheet');
    }
  };

  const exportLive = () => {
    if (!job?.result) return;
    const lines = [
      'subdomain,ip',
      ...Object.entries(job.result.live).map(([s, ip]) => `${s},${ip}`),
    ];
    shareCSV(lines.join('\n'), `${domain}_live.csv`);
  };

  const exportDead = () => {
    if (!job?.result) return;
    shareCSV(['subdomain', ...job.result.dead].join('\n'), `${domain}_dead.csv`);
  };

  if (!job) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.notFound}>Job not found</Text>
      </SafeAreaView>
    );
  }

  const result = job.result;
  const liveEntries = result ? Object.entries(result.live) : [];
  const maxSrc = result
    ? Math.max(...result.source_summary.map((s) => s.count), 1)
    : 1;

  const tabs: Array<{ key: TabKey; label: string }> = [
    { key: 'overview', label: 'Overview' },
    {
      key: 'live',
      label: result ? `Live (${result.live_count})` : 'Live',
    },
    {
      key: 'dead',
      label: result ? `Dead (${result.dead_count})` : 'Dead',
    },
    { key: 'sources', label: 'Sources' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 16 }}
        >
          <Ionicons name="arrow-back" size={22} color={COLORS.TEXT} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerDomain} numberOfLines={1}>
            {domain}
          </Text>
          <Text style={styles.headerStatus}>{job.status}</Text>
        </View>
      </View>

      {/* Running progress */}
      {(job.status === 'running' || job.status === 'pending') && job.progress ? (
        <View style={styles.progressBanner}>
          <Text style={styles.progressText}>{job.progress}</Text>
        </View>
      ) : null}

      {/* Tab bar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabBar}
        contentContainerStyle={styles.tabBarInner}
      >
        {tabs.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, activeTab === t.key && styles.tabActive]}
            onPress={() => setActiveTab(t.key)}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === t.key && styles.tabTextActive,
              ]}
            >
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── Overview ── */}
      {activeTab === 'overview' && (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.pad}
          showsVerticalScrollIndicator={false}
        >
          {result ? (
            <>
              <View style={styles.statRow}>
                <StatCard value={result.total} label="Total" />
                <View style={styles.statGap} />
                <StatCard
                  value={result.live_count}
                  label="Live"
                  color={COLORS.SUCCESS}
                />
                <View style={styles.statGap} />
                <StatCard
                  value={result.dead_count}
                  label="Dead"
                  color={COLORS.ERROR}
                />
              </View>

              <Text style={styles.sectionLabel}>RESULTS BY SOURCE</Text>
              <View style={styles.chartCard}>
                <BarChart data={result.source_summary} />
              </View>
            </>
          ) : (
            <View style={styles.waiting}>
              <Text style={styles.waitingText}>
                {job.progress || 'Enumerating…'}
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* ── Live ── */}
      {activeTab === 'live' && (
        <View style={styles.flex}>
          <View style={styles.listHeader}>
            <Text style={styles.listHeaderText}>
              {liveEntries.length} resolved subdomains
            </Text>
            {liveEntries.length > 0 && (
              <TouchableOpacity onPress={exportLive}>
                <Text style={styles.exportBtn}>Export CSV</Text>
              </TouchableOpacity>
            )}
          </View>
          <FlatList
            data={liveEntries}
            keyExtractor={([sub]) => sub}
            renderItem={({ item: [sub, ip] }) => (
              <View style={styles.subRow}>
                <Text style={styles.subDomain} numberOfLines={1}>
                  {sub}
                </Text>
                <Text style={styles.subIp}>{ip}</Text>
              </View>
            )}
            contentContainerStyle={styles.subList}
            ListEmptyComponent={
              <Text style={styles.emptyList}>
                {result ? 'No live subdomains found' : 'Waiting for results…'}
              </Text>
            }
          />
        </View>
      )}

      {/* ── Dead ── */}
      {activeTab === 'dead' && (
        <View style={styles.flex}>
          <View style={styles.listHeader}>
            <Text style={styles.listHeaderText}>
              {result?.dead.length ?? 0} unresolved subdomains
            </Text>
            {(result?.dead.length ?? 0) > 0 && (
              <TouchableOpacity onPress={exportDead}>
                <Text style={styles.exportBtn}>Export CSV</Text>
              </TouchableOpacity>
            )}
          </View>
          <FlatList
            data={result?.dead ?? []}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <View style={styles.subRow}>
                <Text
                  style={[styles.subDomain, { color: COLORS.TEXT_SECONDARY }]}
                  numberOfLines={1}
                >
                  {item}
                </Text>
                <Text style={[styles.subIp, { color: COLORS.ERROR }]}>
                  unresolved
                </Text>
              </View>
            )}
            contentContainerStyle={styles.subList}
            ListEmptyComponent={
              <Text style={styles.emptyList}>
                {result ? 'No dead subdomains' : 'Waiting for results…'}
              </Text>
            }
          />
        </View>
      )}

      {/* ── Sources ── */}
      {activeTab === 'sources' && (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.pad}
          showsVerticalScrollIndicator={false}
        >
          {result ? (
            Object.entries(result.sources).map(([name, subs]) => (
              <View key={name} style={styles.srcSection}>
                <View style={styles.srcHeader}>
                  <Text style={styles.srcName}>{name}</Text>
                  <View style={styles.srcBadge}>
                    <Text style={styles.srcBadgeText}>{subs.length}</Text>
                  </View>
                </View>
                {subs.length === 0 ? (
                  <Text style={styles.srcEmpty}>No results from this source</Text>
                ) : (
                  <>
                    {subs.slice(0, 25).map((s) => (
                      <Text key={s} style={styles.srcItem}>
                        {s}
                      </Text>
                    ))}
                    {subs.length > 25 && (
                      <Text style={styles.srcMore}>
                        +{subs.length - 25} more
                      </Text>
                    )}
                  </>
                )}
              </View>
            ))
          ) : (
            <Text style={styles.emptyList}>Waiting for results…</Text>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.BACKGROUND },
  flex: { flex: 1 },
  notFound: {
    color: COLORS.TEXT,
    textAlign: 'center',
    marginTop: 60,
    fontSize: 16,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  headerText: { flex: 1, marginLeft: 12 },
  headerDomain: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.TEXT,
    fontFamily: 'monospace',
  },
  headerStatus: {
    fontSize: 11,
    color: COLORS.TEXT_SECONDARY,
    marginTop: 2,
    textTransform: 'capitalize',
  },

  // Progress
  progressBanner: {
    backgroundColor: COLORS.WARNING + '18',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.WARNING + '33',
  },
  progressText: {
    color: COLORS.WARNING,
    fontSize: 12,
    fontFamily: 'monospace',
  },

  // Tab bar
  tabBar: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
    maxHeight: 44,
  },
  tabBarInner: { paddingHorizontal: 10 },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginHorizontal: 2,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.PRIMARY,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.TEXT_SECONDARY,
  },
  tabTextActive: {
    color: COLORS.PRIMARY,
    fontWeight: '700',
  },

  // Overview
  pad: { padding: 16 },
  statRow: { flexDirection: 'row', marginBottom: 24 },
  statGap: { width: 10 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.TEXT_SECONDARY,
    letterSpacing: 1,
    marginBottom: 12,
  },
  chartCard: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  waiting: { alignItems: 'center', paddingTop: 60 },
  waitingText: {
    color: COLORS.WARNING,
    fontSize: 13,
    fontFamily: 'monospace',
  },

  // List (live / dead)
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  listHeaderText: { fontSize: 12, color: COLORS.TEXT_SECONDARY },
  exportBtn: {
    fontSize: 13,
    color: COLORS.PRIMARY,
    fontWeight: '600',
  },
  subList: { paddingHorizontal: 16, paddingTop: 4 },
  subRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER + '55',
  },
  subDomain: {
    flex: 1,
    fontSize: 13,
    color: COLORS.TEXT,
    fontFamily: 'monospace',
    marginRight: 10,
  },
  subIp: {
    fontSize: 12,
    color: COLORS.PRIMARY,
    fontFamily: 'monospace',
  },
  emptyList: {
    color: COLORS.TEXT_SECONDARY,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 50,
  },

  // Sources
  srcSection: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  srcHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  srcName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.TEXT,
    fontFamily: 'monospace',
  },
  srcBadge: {
    backgroundColor: COLORS.PRIMARY + '22',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 5,
  },
  srcBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.PRIMARY,
  },
  srcItem: {
    fontSize: 12,
    color: COLORS.TEXT_SECONDARY,
    fontFamily: 'monospace',
    paddingVertical: 2,
  },
  srcEmpty: {
    fontSize: 12,
    color: COLORS.TEXT_SECONDARY,
    fontStyle: 'italic',
  },
  srcMore: {
    fontSize: 11,
    color: COLORS.TEXT_SECONDARY,
    marginTop: 4,
    fontStyle: 'italic',
  },
});
