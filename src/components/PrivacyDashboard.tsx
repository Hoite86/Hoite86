import React from 'react';
import { FlatList, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';

import { PrivacyMode, PrivacyState, ProviderRule } from '../types';

type Props = {
  state: PrivacyState;
  onEnabledChange: (enabled: boolean) => void;
  onModeChange: (mode: PrivacyMode) => void;
  onProviderRuleChange: (provider: string, patch: Partial<ProviderRule>) => void;
};

const modes: PrivacyMode[] = ['FULL', 'PARTIAL', 'TRUSTED'];

export const PrivacyDashboard = ({
  state,
  onEnabledChange,
  onModeChange,
  onProviderRuleChange
}: Props) => {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Virtual Private User (Android)</Text>
      <View style={styles.row}>
        <Text style={styles.label}>Privacy Shield</Text>
        <Switch value={state.enabled} onValueChange={onEnabledChange} />
      </View>
      <Text style={styles.subtitle}>Privacy Mode</Text>
      <View style={styles.modeRow}>
        {modes.map((mode) => (
          <TouchableOpacity
            key={mode}
            style={[styles.modeButton, state.mode === mode && styles.modeButtonActive]}
            onPress={() => onModeChange(mode)}
          >
            <Text style={[styles.modeText, state.mode === mode && styles.modeTextActive]}>{mode}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.subtitle}>Provider Rules</Text>
      <FlatList
        data={state.providerRules}
        keyExtractor={(item) => item.provider}
        scrollEnabled={false}
        renderItem={({ item }) => (
          <View style={styles.providerRow}>
            <Text style={styles.providerName}>{item.provider}</Text>

            <View style={styles.inline}>
              <Text style={styles.small}>Location</Text>
              <Switch
                value={item.locationMasking}
                onValueChange={(locationMasking) =>
                  onProviderRuleChange(item.provider, { locationMasking })
                }
              />
              <Text style={styles.small}>Trackers</Text>
              <Switch
                value={item.trackerBlocking}
                onValueChange={(trackerBlocking) =>
                  onProviderRuleChange(item.provider, { trackerBlocking })
                }
              />
            </View>

            <View style={styles.inline}>
              <Text style={styles.small}>Query Mut.</Text>
              <Switch
                value={item.queryMutation}
                onValueChange={(queryMutation) => onProviderRuleChange(item.provider, { queryMutation })}
              />
              <Text style={styles.small}>Header Mut.</Text>
              <Switch
                value={item.headerObfuscation}
                onValueChange={(headerObfuscation) =>
                  onProviderRuleChange(item.provider, { headerObfuscation })
                }
              />
            </View>

            <View style={styles.inline}>
              <Text style={styles.small}>Notify</Text>
              <Switch
                value={item.notifyOnBlock}
                onValueChange={(notifyOnBlock) => onProviderRuleChange(item.provider, { notifyOnBlock })}
              />
              <Text style={styles.small}>Radius: {item.locationRadiusMiles}mi</Text>
              <TouchableOpacity
                style={styles.radiusButton}
                onPress={() =>
                  onProviderRuleChange(item.provider, {
                    locationRadiusMiles: Math.max(1, item.locationRadiusMiles - 5)
                  })
                }
              >
                <Text style={styles.radiusText}>-</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.radiusButton}
                onPress={() =>
                  onProviderRuleChange(item.provider, {
                    locationRadiusMiles: Math.min(100, item.locationRadiusMiles + 5)
                  })
                }
              >
                <Text style={styles.radiusText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  card: { backgroundColor: '#111827', padding: 16, borderRadius: 12, marginBottom: 12 },
  title: { color: '#fff', fontSize: 20, fontWeight: '600' },
  subtitle: { color: '#cbd5e1', marginTop: 10, marginBottom: 8 },
  row: { marginTop: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { color: '#fff', fontSize: 16 },
  modeRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  modeButton: {
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10
  },
  modeButtonActive: { backgroundColor: '#22c55e', borderColor: '#22c55e' },
  modeText: { color: '#cbd5e1', fontSize: 12 },
  modeTextActive: { color: '#0f172a', fontWeight: '600' },
  providerRow: { borderTopWidth: 1, borderTopColor: '#1f2937', paddingTop: 10, marginTop: 10, gap: 8 },
  providerName: { color: '#f8fafc', fontWeight: '600', marginBottom: 2 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  small: { color: '#94a3b8', fontSize: 11 },
  radiusButton: {
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 4,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center'
  },
  radiusText: { color: '#e2e8f0', fontWeight: '700' }
});
