import { useEffect, useState, useCallback } from 'react';
import { Tabs } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { colors } from '../../src/theme/colors';
import { useChatStore } from '../../src/stores/chatStore';
import { useSocket } from '../../src/hooks/useSocket';
import { useLocationStore } from '../../src/stores/locationStore';
import { socketClient } from '../../src/lib/socket';

// ─── Tab configuration ──────────────────────────────────────────────────────

const TABS = [
  { name: 'home',    icon: 'home',           label: 'Home'   },
  { name: 'radar',   icon: 'radio',          label: 'Radar'  },
  { name: 'meet',    icon: 'shuffle',        label: 'Meet'   },
  { name: 'chat',    icon: 'chatbubbles',    label: 'Chat'   },
  { name: 'profile', icon: 'person',         label: 'Profile'},
] as const;

// ─── Custom Tab Bar ──────────────────────────────────────────────────────────

function CustomTabBar({ state, navigation }: {
  state: { index: number; routes: Array<{ key: string; name: string }> };
  navigation: { emit: (event: { type: string; target: string; canPreventDefault: boolean }) => { defaultPrevented: boolean }; navigate: (name: string) => void };
}) {
  const insets = useSafeAreaInsets();
  const getTotalUnread = useChatStore((s) => s.getTotalUnread);
  const totalUnread = getTotalUnread();

  return (
    <View style={[styles.tabBarWrapper, { paddingBottom: insets.bottom + 6 }]}>
      <BlurView intensity={80} style={StyleSheet.absoluteFill} />
      <View style={styles.topBorder} />
      <View style={styles.tabBar}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const tab = TABS.find((t) => t.name === route.name);
          if (!tab) return null;
          const unreadCount = route.name === 'chat' ? totalUnread : 0;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={styles.tab}
              activeOpacity={0.7}
            >
              <View style={styles.iconWrap}>
                <Ionicons
                  name={
                    (isFocused
                      ? tab.icon
                      : `${tab.icon}-outline`) as React.ComponentProps<typeof Ionicons>['name']
                  }
                  size={24}
                  color={isFocused ? colors.primary : colors.subtext}
                />
                {unreadCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </Text>
                  </View>
                )}
              </View>
              <Text
                style={[
                  styles.tabLabel,
                  isFocused && { color: colors.primary },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBarWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255,255,255,0.96)',
  },
  topBorder: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#F1F1F5',
  },
  tabBar: {
    flexDirection: 'row',
    paddingTop: 8,
    paddingHorizontal: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
    paddingVertical: 2,
  },
  iconWrap: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -9,
    backgroundColor: colors.danger,
    borderRadius: 100,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '700',
  },
  tabLabel: {
    color: colors.subtext,
    fontSize: 10,
    fontWeight: '500',
  },
});

// ─── Global Ping Toast ───────────────────────────────────────────────────────

type PingInfo = { fromName: string; fromPhoto: string; message: string };

function GlobalPingToast({ info, onDismiss }: { info: PingInfo; onDismiss: () => void }) {
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <Animated.View
      entering={FadeIn}
      exiting={FadeOut}
      style={[globalToastStyles.wrap, { top: insets.top + 8 }]}
    >
      <LinearGradient colors={['#1A0533', '#2A1050']} style={globalToastStyles.grad}>
        {info.fromPhoto ? (
          <Image source={{ uri: info.fromPhoto }} style={globalToastStyles.photo} />
        ) : (
          <View style={globalToastStyles.photoFallback}>
            <Ionicons name="person" size={18} color={colors.primary} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={globalToastStyles.name}>{info.fromName} pinged you 💜</Text>
          <Text style={globalToastStyles.msg} numberOfLines={1}>{info.message || 'Wants to connect!'}</Text>
        </View>
        <TouchableOpacity onPress={onDismiss} style={globalToastStyles.close}>
          <Ionicons name="close" size={15} color="rgba(255,255,255,0.5)" />
        </TouchableOpacity>
      </LinearGradient>
    </Animated.View>
  );
}

const globalToastStyles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    shadowColor: '#7C3AED',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 12,
    borderRadius: 18,
    overflow: 'hidden',
  },
  grad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.35)',
    borderRadius: 18,
  },
  photo: { width: 42, height: 42, borderRadius: 21, borderWidth: 2, borderColor: '#7C3AED' },
  photoFallback: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(124,58,237,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  name: { fontSize: 14, fontWeight: '700', color: '#FFF' },
  msg: { fontSize: 12, color: '#A1A1AA', marginTop: 1 },
  close: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
});

// ─── Layout ──────────────────────────────────────────────────────────────────

export default function TabsLayout() {
  useSocket();
  const startTracking = useLocationStore((s) => s.startTracking);
  const [pingInfo, setPingInfo] = useState<PingInfo | null>(null);

  useEffect(() => {
    void startTracking();
  }, [startTracking]);

  useEffect(() => {
    const handlePing = (...args: unknown[]) => {
      setPingInfo(args[0] as PingInfo);
    };
    socketClient.on('ping:received', handlePing);
    return () => socketClient.off('ping:received', handlePing);
  }, []);

  const dismissPing = useCallback(() => setPingInfo(null), []);

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        tabBar={(props) => (
          <CustomTabBar
            state={props.state}
            navigation={props.navigation as Parameters<typeof CustomTabBar>[0]['navigation']}
          />
        )}
        screenOptions={{ headerShown: false }}
      >
        <Tabs.Screen name="home"    options={{ title: 'Home'    }} />
        <Tabs.Screen name="radar"   options={{ title: 'Radar'   }} />
        <Tabs.Screen name="meet"    options={{ title: 'Meet'    }} />
        <Tabs.Screen name="chat"    options={{ title: 'Chat'    }} />
        <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
        <Tabs.Screen name="places"  options={{ href: null }}      />
      </Tabs>
      {pingInfo && (
        <GlobalPingToast info={pingInfo} onDismiss={dismissPing} />
      )}
    </View>
  );
}
