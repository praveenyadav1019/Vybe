import { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../src/theme/colors';
import { useChatStore } from '../../src/stores/chatStore';
import { useSocket } from '../../src/hooks/useSocket';
import { useLocationStore } from '../../src/stores/locationStore';

// ─── Tab configuration ──────────────────────────────────────────────────────

const TABS = [
  { name: 'home',    icon: 'home',        label: 'Home'   },
  { name: 'radar',   icon: 'radio',       label: 'Radar'  },
  { name: 'chat',    icon: 'chatbubbles', label: 'Chat'   },
  { name: 'places',  icon: 'flame',       label: 'Places' },
  { name: 'profile', icon: 'person',      label: 'Profile'},
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
          const tab = TABS[index];
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
    backgroundColor: 'rgba(10,10,10,0.88)',
  },
  topBorder: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.1)',
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

// ─── Layout ──────────────────────────────────────────────────────────────────

export default function TabsLayout() {
  // Initialise socket connection + location tracking for all tab screens
  useSocket();
  const startTracking = useLocationStore((s) => s.startTracking);

  useEffect(() => {
    void startTracking();
  }, [startTracking]);

  return (
    <Tabs
      tabBar={(props) => (
        <CustomTabBar
          state={props.state}
          navigation={props.navigation as Parameters<typeof CustomTabBar>[0]['navigation']}
        />
      )}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="home"    options={{ title: 'Home'    }} />
      <Tabs.Screen name="radar"   options={{ title: 'Radar'   }} />
      <Tabs.Screen name="chat"    options={{ title: 'Chat'    }} />
      <Tabs.Screen name="places"  options={{ title: 'Places'  }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
