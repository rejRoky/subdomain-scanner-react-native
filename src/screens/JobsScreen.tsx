import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useFocusEffect,
  useNavigation,
  CompositeNavigationProp,
} from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { StackNavigationProp } from '@react-navigation/stack';
import { COLORS } from '../theme';
import { getAllJobs, deleteJob } from '../services/database';
import type { Job } from '../types';
import type { RootStackParamList, TabParamList } from '../navigation/AppNavigator';

type NavProp = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'Jobs'>,
  StackNavigationProp<RootStackParamList>
>;

const STATUS_COLORS: Record<string, string> = {
  pending: COLORS.TEXT_SECONDARY,
  running: COLORS.WARNING,
  completed: COLORS.SUCCESS,
  failed: COLORS.ERROR,
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function JobCard({
  job,
  onDelete,
  onPress,
}: {
  job: Job;
  onDelete: () => void;
  onPress: () => void;
}) {
  const statusColor = STATUS_COLORS[job.status] ?? COLORS.TEXT_SECONDARY;
  const isCompleted = job.status === 'completed';

  return (
    <TouchableOpacity
      style={[styles.card, isCompleted && styles.cardTappable]}
      onPress={onPress}
      activeOpacity={isCompleted ? 0.7 : 1}
    >
      <View style={styles.cardTop}>
        <Text style={styles.domain} numberOfLines={1}>
          {job.domain}
        </Text>
        <View
          style={[
            styles.badge,
            { backgroundColor: statusColor + '22', borderColor: statusColor },
          ]}
        >
          <Text style={[styles.badgeText, { color: statusColor }]}>
            {job.status.toUpperCase()}
          </Text>
        </View>
      </View>

      {job.status === 'running' && job.progress ? (
        <Text style={styles.progress} numberOfLines={1}>
          {job.progress}
        </Text>
      ) : null}

      {job.result ? (
        <View style={styles.statsRow}>
          <Stat label="total" value={job.result.total} color={COLORS.TEXT} />
          <Text style={styles.sep}>·</Text>
          <Stat label="live" value={job.result.live_count} color={COLORS.SUCCESS} />
          <Text style={styles.sep}>·</Text>
          <Stat label="dead" value={job.result.dead_count} color={COLORS.ERROR} />
        </View>
      ) : null}

      {job.error ? (
        <Text style={styles.errorText} numberOfLines={2}>
          {job.error}
        </Text>
      ) : null}

      <View style={styles.cardBottom}>
        <Text style={styles.dateText}>{formatDate(job.created_at)}</Text>
        <View style={styles.actions}>
          {isCompleted && (
            <Text style={styles.viewBtn}>View results →</Text>
          )}
          <TouchableOpacity
            onPress={onDelete}
            hitSlop={{ top: 8, bottom: 8, left: 12, right: 4 }}
          >
            <Text style={styles.deleteBtn}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <Text style={styles.statText}>
      <Text style={[styles.statNum, { color }]}>{value}</Text> {label}
    </Text>
  );
}

export default function JobsScreen() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation<NavProp>();

  const loadJobs = useCallback(() => {
    setJobs(getAllJobs());
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadJobs();
      const interval = setInterval(loadJobs, 2000);
      return () => clearInterval(interval);
    }, [loadJobs])
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadJobs();
    setRefreshing(false);
  }, [loadJobs]);

  const handleDelete = (job: Job) => {
    Alert.alert('Delete Job', `Remove enumeration for ${job.domain}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteJob(job.job_id);
          loadJobs();
        },
      },
    ]);
  };

  const handlePress = (job: Job) => {
    if (job.status === 'completed') {
      navigation.navigate('Results', { jobId: job.job_id, domain: job.domain });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Jobs</Text>
        <Text style={styles.subtitle}>
          {jobs.length} enumeration{jobs.length !== 1 ? 's' : ''}
        </Text>
      </View>

      <FlatList
        data={jobs}
        keyExtractor={(item) => item.job_id}
        renderItem={({ item }) => (
          <JobCard
            job={item}
            onDelete={() => handleDelete(item)}
            onPress={() => handlePress(item)}
          />
        )}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.PRIMARY}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>⌕</Text>
            <Text style={styles.emptyTitle}>No jobs yet</Text>
            <Text style={styles.emptyHint}>
              Start an enumeration from the Enumerate tab
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.TEXT,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.TEXT_SECONDARY,
    marginTop: 2,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  cardTappable: {
    borderColor: COLORS.PRIMARY + '44',
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  domain: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.TEXT,
    flex: 1,
    marginRight: 10,
    fontFamily: 'monospace',
  },
  badge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  progress: {
    fontSize: 12,
    color: COLORS.WARNING,
    marginBottom: 8,
    fontFamily: 'monospace',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  statText: {
    fontSize: 13,
    color: COLORS.TEXT_SECONDARY,
  },
  statNum: {
    fontWeight: '700',
  },
  sep: {
    color: COLORS.BORDER,
    marginHorizontal: 8,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.ERROR,
    marginBottom: 8,
    lineHeight: 17,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 11,
    color: COLORS.TEXT_SECONDARY,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  viewBtn: {
    fontSize: 12,
    color: COLORS.PRIMARY,
    fontWeight: '600',
  },
  deleteBtn: {
    fontSize: 12,
    color: COLORS.ERROR,
    fontWeight: '500',
  },
  empty: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 48,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.TEXT_SECONDARY,
  },
  emptyHint: {
    fontSize: 13,
    color: COLORS.TEXT_SECONDARY,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
});
