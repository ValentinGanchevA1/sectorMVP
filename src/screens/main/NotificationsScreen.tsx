// src/screens/main/NotificationsScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Card } from '@/components/common/Card';
import { Avatar } from '@/components/common/Avatar';
import { COLORS, SPACING, TYPOGRAPHY } from '@/config/app';

interface Notification {
  id: string;
  type: 'match' | 'message' | 'like' | 'nearby' | 'system';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  avatarUri?: string;
  userName?: string;
}

const NotificationsScreen: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      // TODO: Fetch from API
      // const response = await apiClient.get('/notifications');
      // setNotifications(response.data);

      // Mock data for now
      const mockNotifications: Notification[] = [
        {
          id: '1',
          type: 'match',
          title: 'New Match!',
          message: 'You matched with Sarah',
          timestamp: new Date(Date.now() - 1000 * 60 * 5),
          read: false,
          userName: 'Sarah',
        },
        {
          id: '2',
          type: 'message',
          title: 'New Message',
          message: 'Hey, how are you?',
          timestamp: new Date(Date.now() - 1000 * 60 * 30),
          read: false,
          userName: 'John',
        },
        {
          id: '3',
          type: 'nearby',
          title: 'Nearby User',
          message: 'Alex is 500m away',
          timestamp: new Date(Date.now() - 1000 * 60 * 60),
          read: true,
          userName: 'Alex',
        },
        {
          id: '4',
          type: 'system',
          title: 'Profile Update',
          message: 'Your profile has been updated successfully',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
          read: true,
        },
      ];

      setNotifications(mockNotifications);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  const handleNotificationPress = (notification: Notification) => {
    // Mark as read
    setNotifications(prev =>
      prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
    );

    // TODO: Navigate based on notification type
    console.log('Notification pressed:', notification);
  };

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    // TODO: API call to mark all as read
  };

  const getNotificationIcon = (type: Notification['type']): string => {
    switch (type) {
      case 'match': return 'people';
      case 'message': return 'chatbubble';
      case 'like': return 'heart';
      case 'nearby': return 'location';
      case 'system': return 'information-circle';
      default: return 'notifications';
    }
  };

  const getNotificationColor = (type: Notification['type']): string => {
    switch (type) {
      case 'match': return COLORS.SUCCESS;
      case 'message': return COLORS.PRIMARY;
      case 'like': return COLORS.DANGER;
      case 'nearby': return COLORS.WARNING;
      case 'system': return COLORS.INFO;
      default: return COLORS.GRAY;
    }
  };

  const formatTimestamp = (timestamp: Date): string => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return timestamp.toLocaleDateString();
  };

  const renderNotificationItem = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      onPress={() => handleNotificationPress(item)}
      activeOpacity={0.7}
    >
      <Card
        style={[
          styles.notificationCard,
          !item.read && styles.unreadCard,
        ]}
        padding="medium"
      >
        <View style={styles.notificationContent}>
          {/* Icon or Avatar */}
          <View style={styles.iconContainer}>
            {item.avatarUri || item.userName ? (
              <Avatar
                imageUri={item.avatarUri}
                name={item.userName}
                size="medium"
              />
            ) : (
              <View
                style={[
                  styles.iconCircle,
                  { backgroundColor: getNotificationColor(item.type) + '20' },
                ]}
              >
                <Icon
                  name={getNotificationIcon(item.type)}
                  size={24}
                  color={getNotificationColor(item.type)}
                />
              </View>
            )}
          </View>

          {/* Content */}
          <View style={styles.textContent}>
            <View style={styles.titleRow}>
              <Text
                style={[
                  styles.notificationTitle,
                  !item.read && styles.unreadTitle,
                ]}
              >
                {item.title}
              </Text>
              {!item.read && <View style={styles.unreadDot} />}
            </View>
            <Text style={styles.notificationMessage} numberOfLines={2}>
              {item.message}
            </Text>
            <Text style={styles.timestamp}>
              {formatTimestamp(item.timestamp)}
            </Text>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="notifications-outline" size={64} color={COLORS.GRAY} />
      <Text style={styles.emptyTitle}>No Notifications</Text>
      <Text style={styles.emptyMessage}>
        You're all caught up! Check back later for updates.
      </Text>
    </View>
  );

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Notifications</Text>
          {unreadCount > 0 && (
            <TouchableOpacity onPress={handleMarkAllRead}>
              <Text style={styles.markAllRead}>Mark all read</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Unread Badge */}
        {unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>
              {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
            </Text>
          </View>
        )}

        {/* Notifications List */}
        <FlatList
          data={notifications}
          renderItem={renderNotificationItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            notifications.length === 0 && styles.emptyListContent,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.PRIMARY}
            />
          }
          ListEmptyComponent={!loading ? renderEmptyState : null}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.LIGHT,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.MD,
    backgroundColor: COLORS.WHITE,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.GRAY + '20',
  },
  title: {
    fontSize: TYPOGRAPHY.SIZES.XXL,
    fontWeight: TYPOGRAPHY.WEIGHTS.BOLD,
    color: COLORS.DARK,
  },
  markAllRead: {
    fontSize: TYPOGRAPHY.SIZES.SM,
    color: COLORS.PRIMARY,
    fontWeight: TYPOGRAPHY.WEIGHTS.MEDIUM,
  },
  unreadBadge: {
    backgroundColor: COLORS.PRIMARY + '15',
    paddingVertical: SPACING.SM,
    paddingHorizontal: SPACING.MD,
    marginHorizontal: SPACING.MD,
    marginTop: SPACING.SM,
    borderRadius: 8,
  },
  unreadBadgeText: {
    fontSize: TYPOGRAPHY.SIZES.SM,
    color: COLORS.PRIMARY,
    fontWeight: TYPOGRAPHY.WEIGHTS.MEDIUM,
  },
  listContent: {
    padding: SPACING.MD,
  },
  emptyListContent: {
    flex: 1,
  },
  notificationCard: {
    marginBottom: SPACING.SM,
  },
  unreadCard: {
    backgroundColor: COLORS.PRIMARY + '05',
    borderLeftWidth: 3,
    borderLeftColor: COLORS.PRIMARY,
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    marginRight: SPACING.MD,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContent: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.XS,
  },
  notificationTitle: {
    fontSize: TYPOGRAPHY.SIZES.MD,
    fontWeight: TYPOGRAPHY.WEIGHTS.MEDIUM,
    color: COLORS.DARK,
    flex: 1,
  },
  unreadTitle: {
    fontWeight: TYPOGRAPHY.WEIGHTS.BOLD,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.PRIMARY,
    marginLeft: SPACING.SM,
  },
  notificationMessage: {
    fontSize: TYPOGRAPHY.SIZES.SM,
    color: COLORS.GRAY,
    lineHeight: 20,
    marginBottom: SPACING.XS,
  },
  timestamp: {
    fontSize: TYPOGRAPHY.SIZES.XS,
    color: COLORS.GRAY,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.XL,
  },
  emptyTitle: {
    fontSize: TYPOGRAPHY.SIZES.XL,
    fontWeight: TYPOGRAPHY.WEIGHTS.BOLD,
    color: COLORS.DARK,
    marginTop: SPACING.MD,
  },
  emptyMessage: {
    fontSize: TYPOGRAPHY.SIZES.MD,
    color: COLORS.GRAY,
    textAlign: 'center',
    marginTop: SPACING.SM,
  },
});

export default NotificationsScreen;
