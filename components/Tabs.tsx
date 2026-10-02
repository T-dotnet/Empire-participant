import React from 'react';
import { Icons } from './Icons';

interface TabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  consentLocked?: boolean;
  randomisationLocked?: boolean;
  assignmentLocked?: boolean;
  hasConsentWarning?: boolean;
}

const Tabs: React.FC<TabsProps> = ({ activeTab, onTabChange, consentLocked = false, randomisationLocked = false, assignmentLocked = false, hasConsentWarning = false }) => {
  const tabs = [
    { id: 'eligibility', label: 'Eligibility', locked: false },
    { id: 'consent', label: 'Consent', locked: consentLocked, warning: hasConsentWarning },
    { id: 'randomisation', label: 'Randomisation', locked: randomisationLocked },
    { id: 'assignment', label: 'Assignment', locked: assignmentLocked },
  ];

  return (
    <div className="border-b border-gray-200 mt-6">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-8">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => !tab.locked && onTabChange(tab.id)}
                disabled={tab.locked}
                className={`
                  py-4 text-sm font-medium border-b-2 transition-colors relative flex items-center
                  ${isActive 
                    ? 'border-brand-600 text-gray-900' 
                    : tab.locked
                      ? 'border-transparent text-gray-300 cursor-not-allowed'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                {tab.label}
                {tab.warning && !tab.locked && (
                   <span className="ml-2 text-amber-500" aria-label="Warning">
                     <Icons.AlertCircle size={14} />
                   </span>
                )}
                {tab.locked && (
                   <span className="ml-2 text-gray-300" aria-label="Locked">
                     <Icons.Lock size={12} strokeWidth={2.5} />
                   </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Tabs;