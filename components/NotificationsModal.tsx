import React from 'react';
import { Icons } from './Icons';
import { Notification } from '../types';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: Notification[];
  onNotificationClick: (notification: Notification) => void;
}

const NotificationIcon: React.FC<{ type: Notification['type'] }> = ({ type }) => {
  const baseIconClass = "w-6 h-6";
  const containerClass = "w-10 h-10 rounded-full flex items-center justify-center";

  switch (type) {
    case 'success':
      return (
        <div className={`${containerClass} bg-green-50`}>
          <Icons.CheckCircle className={`${baseIconClass} text-green-600`} />
        </div>
      );
    case 'info':
      return (
        <div className={`${containerClass} bg-gray-100`}>
          <Icons.User className={`${baseIconClass} text-gray-600`} />
        </div>
      );
    case 'warning':
      return (
        <div className={`${containerClass} bg-orange-50`}>
          <Icons.Clock className={`${baseIconClass} text-orange-600`} />
        </div>
      );
    case 'error':
      return (
        <div className={`${containerClass} bg-red-50`}>
          <Icons.XCircle className={`${baseIconClass} text-red-600`} />
        </div>
      );
    case 'revoked':
       return (
        <div className={`${containerClass} bg-red-50`}>
          <Icons.XCircle className={`${baseIconClass} text-red-600`} />
        </div>
      );
    default:
      return null;
  }
};

const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  notifications,
  onNotificationClick,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-gray-900/30 z-[90] animate-in fade-in duration-300"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl flex flex-col animate-in slide-in-from-right-full duration-500"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-medium text-gray-900">Notifications</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            aria-label="Close notifications"
          >
            <Icons.X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              onClick={() => onNotificationClick(notification)}
              className="p-4 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 hover:shadow-md cursor-pointer transition-all duration-200 flex items-start space-x-4"
            >
              <NotificationIcon type={notification.type} />
              <div className="flex-1">
                <p className="font-semibold text-gray-800">{notification.siteUid}-{notification.participantId}</p>
                <p className="text-sm text-gray-600">{notification.title}</p>
                <p className="text-xs text-gray-400 mt-1">Created on {notification.createdAt}</p>
              </div>
            </div>
          ))}
          {notifications.length === 0 && (
            <div className="text-center py-10 text-gray-500">
                <p>No new notifications.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationsModal;