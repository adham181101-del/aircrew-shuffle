import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentUser } from '@/lib/auth';

export interface Notification {
  id: string;
  type: 'incoming_request' | 'counter_offer' | 'accepted_swap';
  title: string;
  message: string;
  swapRequestId: string;
  createdAt: string;
  read: boolean;
  shiftDate?: string;
  shiftTime?: string;
  requesterName?: string;
  accepterName?: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const user = await getCurrentUser();
      if (!user) return;

      // Fetch incoming swap requests (where user is the accepter)
      const { data: incomingRequests, error: incomingError } = await supabase
        .from('swap_requests')
        .select(`
          id,
          status,
          message,
          created_at,
          requester_shift_id,
          requester:staff!swap_requests_requester_id_fkey (
            email,
            staff_number
          ),
          requester_shift:shifts!swap_requests_requester_shift_id_fkey (
            date,
            time
          )
        `)
        .eq('accepter_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (incomingError) {
        console.error('Error fetching incoming requests:', incomingError);
      }

      // Fetch counter offers (where user is the requester and there's a counter_offer_date)
      const { data: counterOffers, error: counterError } = await supabase
        .from('swap_requests')
        .select(`
          id,
          status,
          message,
          created_at,
          counter_offer_date,
          accepter:staff!swap_requests_accepter_id_fkey (
            email,
            staff_number
          ),
          requester_shift:shifts!swap_requests_requester_shift_id_fkey (
            date,
            time
          )
        `)
        .eq('requester_id', user.id)
        .not('counter_offer_date', 'is', null)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (counterError) {
        console.error('Error fetching counter offers:', counterError);
      }

      // Fetch accepted swaps (where user is either requester or accepter)
      const { data: acceptedSwaps, error: acceptedError } = await supabase
        .from('swap_requests')
        .select(`
          id,
          status,
          message,
          created_at,
          requester:staff!swap_requests_requester_id_fkey (
            email,
            staff_number
          ),
          accepter:staff!swap_requests_accepter_id_fkey (
            email,
            staff_number
          ),
          requester_shift:shifts!swap_requests_requester_shift_id_fkey (
            date,
            time
          )
        `)
        .or(`requester_id.eq.${user.id},accepter_id.eq.${user.id}`)
        .eq('status', 'accepted')
        .order('created_at', { ascending: false })
        .limit(10); // Only show recent accepted swaps

      if (acceptedError) {
        console.error('Error fetching accepted swaps:', acceptedError);
      }

      // Transform data into notifications
      const allNotifications: Notification[] = [];

      // Incoming requests
      if (incomingRequests) {
        incomingRequests.forEach((request: any) => {
          allNotifications.push({
            id: `incoming_${request.id}`,
            type: 'incoming_request',
            title: 'New Swap Request',
            message: `${request.requester?.email?.split('@')[0] || 'Someone'} wants to swap your shift`,
            swapRequestId: request.id,
            createdAt: request.created_at,
            read: false,
            shiftDate: request.requester_shift?.date,
            shiftTime: request.requester_shift?.time,
            requesterName: request.requester?.email?.split('@')[0]
          });
        });
      }

      // Counter offers
      if (counterOffers) {
        counterOffers.forEach((offer: any) => {
          allNotifications.push({
            id: `counter_${offer.id}`,
            type: 'counter_offer',
            title: 'Counter Offer Received',
            message: `${offer.accepter?.email?.split('@')[0] || 'Someone'} made a counter offer`,
            swapRequestId: offer.id,
            createdAt: offer.created_at,
            read: false,
            shiftDate: offer.requester_shift?.date,
            shiftTime: offer.requester_shift?.time,
            accepterName: offer.accepter?.email?.split('@')[0]
          });
        });
      }

      // Accepted swaps
      if (acceptedSwaps) {
        acceptedSwaps.forEach((swap: any) => {
          const isRequester = swap.requester?.email === user.email;
          const otherPerson = isRequester ? swap.accepter : swap.requester;
          
          allNotifications.push({
            id: `accepted_${swap.id}`,
            type: 'accepted_swap',
            title: 'Swap Accepted',
            message: `Your swap with ${otherPerson?.email?.split('@')[0] || 'someone'} has been accepted`,
            swapRequestId: swap.id,
            createdAt: swap.created_at,
            read: false,
            shiftDate: swap.requester_shift?.date,
            shiftTime: swap.requester_shift?.time,
            requesterName: swap.requester?.email?.split('@')[0],
            accepterName: swap.accepter?.email?.split('@')[0]
          });
        });
      }

      // Sort by creation date (newest first)
      allNotifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setNotifications(allNotifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === notificationId 
          ? { ...notification, read: true }
          : notification
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
  };

  const refreshNotifications = async () => {
    await fetchNotifications();
  };

  useEffect(() => {
    fetchNotifications();
    
    // Set up real-time subscription for swap_requests
    const subscription = supabase
      .channel('swap_requests_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'swap_requests' 
        }, 
        () => {
          // Refresh notifications when swap requests change
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      loading,
      markAsRead,
      markAllAsRead,
      refreshNotifications
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
