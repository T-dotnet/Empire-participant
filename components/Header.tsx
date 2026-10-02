import React, { useState, useRef, useEffect } from 'react';
import { Icons } from './Icons';
import { Site } from '../types';

interface HeaderProps {
  sites: Site[];
  currentSite: Site;
  onSiteChange: (siteId: string) => void;
  onToggleNotifications: () => void;
  notificationCount: number;
}

const Header: React.FC<HeaderProps> = ({ sites, currentSite, onSiteChange, onToggleNotifications, notificationCount }) => {
  const [isSiteDropdownOpen, setIsSiteDropdownOpen] = useState(false);
  const siteDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (siteDropdownRef.current && !siteDropdownRef.current.contains(event.target as Node)) {
        setIsSiteDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <header className="border-b border-gray-200 bg-white sticky top-0 z-50">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-8">
          {/* Logo */}
          <div className="flex items-center cursor-pointer">
            <div className="w-8 h-8 rounded-full border-2 border-brand-600 flex items-center justify-center text-brand-600 font-bold text-lg mr-2">
              <span className="relative top-[1px]">In</span>
            </div>
          </div>

          {/* Project Selector */}
          <div className="hidden md:flex items-center px-4 py-1.5 bg-gray-50 border border-gray-200 rounded-full text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors">
            <span>INCEPT</span>
            <Icons.ChevronDown className="w-4 h-4 ml-2 text-gray-500" />
          </div>

          {/* Navigation */}
          <nav className="hidden lg:flex items-center space-x-6 text-sm text-gray-600 font-medium">
            <a href="#" className="text-gray-900">Enrolment</a>
            <a href="#" className="hover:text-gray-900">Report & export</a>
            <div className="flex items-center cursor-pointer hover:text-gray-900 group">
              <span>Resources</span>
              <Icons.ChevronDown className="w-4 h-4 ml-1 text-gray-400 group-hover:text-gray-600" />
            </div>
          </nav>
        </div>

        <div className="flex items-center space-x-4 text-sm font-medium text-gray-600">
          <button className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-md text-gray-900 transition-colors">Manage consent</button>
          <button className="px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-md transition-colors">New document</button>
          <a href="#" className="hidden md:block hover:text-gray-900">Support</a>
          
          <div className="flex items-center space-x-3">
            <button className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors text-gray-600">
              <Icons.User className="w-5 h-5" />
            </button>
            <button
              onClick={onToggleNotifications}
              className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors text-gray-600 relative"
              aria-label={`View notifications (${notificationCount} unread)`}
            >
              <Icons.Bell className="w-5 h-5" />
              {notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-white text-[10px] font-bold border-2 border-white">
                  {notificationCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;