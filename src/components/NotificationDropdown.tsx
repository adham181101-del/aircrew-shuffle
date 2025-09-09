import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Bell,
  CheckCircle,
  Clock,
  ArrowRightLeft,
  X,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import { useNotifications, type Notification } from '@/contexts/NotificationContext';
import { formatDistanceToNow } from 'date-fns';

const NotificationDropdown = () => {
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead, refreshNotifications } = useNotifications();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'incoming_request':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'counter_offer':
        return <ArrowRightLeft className="h-4 w-4 text-orange-500" />;
      case 'accepted_swap':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  const getNotificationColor = (type: Notification['type']) => {
    switch (type) {
      case 'incoming_request':
        return 'border-l-blue-500 bg-blue-50';
      case 'counter_offer':
        return 'border-l-orange-500 bg-orange-50';
      case 'accepted_swap':
        return 'border-l-green-500 bg-green-50';
      default:
        return 'border-l-gray-500 bg-gray-50';
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    
    // Navigate to appropriate page based on notification type
    switch (notification.type) {
      case 'incoming_request':
      case 'counter_offer':
        navigate('/swaps/manage');
        break;
      case 'accepted_swap':
        navigate('/swaps/manage');
        break;
    }
    
    setOpen(false);
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead();
  };

  const handleRefresh = async () => {
    await refreshNotifications();
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-white hover:bg-blue-800 p-2 relative"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        align="end" 
        className="w-80 p-0"
        sideOffset={5}
      >
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">Notifications</h3>
            <div className="flex items-center space-x-2">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAllAsRead}
                  className="text-xs h-6 px-2"
                >
                  Mark all read
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={loading}
                className="h-6 w-6 p-0"
              >
                <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </div>

        <ScrollArea className="h-80">
          {loading ? (
            <div className="p-4 text-center text-sm text-gray-500">
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-500">
              No notifications yet
            </div>
          ) : (
            <div className="p-2">
              {notifications.map((notification, index) => (
                <div key={notification.id}>
                  <div
                    className={`p-3 rounded-lg cursor-pointer transition-colors hover:bg-gray-100 border-l-4 ${getNotificationColor(notification.type)} ${
                      !notification.read ? 'bg-white' : 'bg-gray-50'
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className={`text-sm font-medium ${!notification.read ? 'text-gray-900' : 'text-gray-700'}`}>
                            {notification.title}
                          </p>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        {notification.shiftDate && (
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(notification.shiftDate).toLocaleDateString('en-GB')} • {notification.shiftTime}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(notification.id);
                        }}
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  {index < notifications.length - 1 && <Separator className="my-2" />}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {notifications.length > 0 && (
          <div className="p-3 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                navigate('/swaps/manage');
                setOpen(false);
              }}
              className="w-full text-xs"
            >
              <ExternalLink className="h-3 w-3 mr-2" />
              View all swaps
            </Button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationDropdown;
