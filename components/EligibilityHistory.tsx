import React, { useState } from 'react';
import { EligibilityHistoryItem } from '../types';
import { Icons } from './Icons';

interface EligibilityHistoryProps {
  history: EligibilityHistoryItem[];
  episode?: any;
  onAddNote?: (episode: any, initialTab?: 'view' | 'process' | 'outcome') => void;
}

const EligibilityHistory: React.FC<EligibilityHistoryProps> = ({ history, episode, onAddNote }) => {
  const sortedHistory = history ? [...history].reverse() : [];
  const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>({});

  const toggleItem = (index: number) => {
    setExpandedItems(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  if (sortedHistory.length === 0) {
    return (
      <div className="space-y-4 mt-8 animate-in fade-in slide-in-from-top-2 duration-500">
        <div className="flex items-center justify-between px-1">
           <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em]">
              Eligibility History
           </h3>
        </div>
        <div className="bg-gray-50 rounded-lg border border-gray-100 p-6 flex flex-col items-center justify-center text-center">
            <Icons.Clock className="w-8 h-8 text-gray-300 mb-2" />
            <span className="text-xs text-gray-500 font-medium">No history recorded</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-8 animate-in fade-in slide-in-from-top-2 duration-500">
      <div className="flex items-center justify-between px-1">
         <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em]">
            Eligibility History ({sortedHistory.length})
         </h3>
      </div>
      
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden divide-y divide-gray-100">
         {sortedHistory.map((item, index) => {
             const isExpanded = expandedItems[index];
             
             return (
             <div key={index} className="group">
                 <button 
                    onClick={() => toggleItem(index)}
                    className="w-full bg-white px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-all focus:outline-none"
                 >
                     <div className="flex items-center gap-3">
                        <Icons.ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                        <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                            Assessment: {item.timestamp}
                        </span>
                     </div>
                     <span className="text-[10px] font-medium text-gray-400">
                        {item.associatedDomains?.length || 0} domains
                     </span>
                 </button>
                 
                 {isExpanded && (
                    <div className="bg-gray-50/50 px-4 py-2 border-t border-gray-100">
                        {item.associatedDomains && item.associatedDomains.length > 0 ? (
                            item.associatedDomains.map((d, i) => (
                                <div key={i} className="flex justify-between items-center px-2 py-2.5">
                                    <span className="text-xs font-medium text-gray-700">
                                        {d.name}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                        d.status === 'ELIGIBLE' ? 'bg-green-100 text-green-700' :
                                        d.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                                        d.status === 'NOT_ELIGIBLE' ? 'bg-red-100 text-red-700' :
                                        d.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                                        d.status === 'NOT_COMPLETED' ? 'bg-yellow-100 text-yellow-700' :
                                        d.status === 'EXPIRED' ? 'bg-orange-100 text-orange-700' :
                                        'bg-gray-100 text-gray-600'
                                    }`}>
                                        {d.status === 'ELIGIBLE' ? 'Eligible' : 
                                         d.status === 'COMPLETED' ? 'Completed' :
                                         d.status === 'NOT_ELIGIBLE' ? 'Not Eligible' : 
                                         d.status === 'IN_PROGRESS' ? 'In Progress' : 
                                         d.status === 'NOT_COMPLETED' ? 'Not Completed' :
                                         d.status === 'EXPIRED' ? 'Expired' :
                                         'Not Assessed'}
                                    </span>
                                </div>
                            ))
                        ) : (
                            <div className="px-2 py-3 text-xs text-gray-400 italic">No domains associated</div>
                        )}
                    </div>
                 )}
                 
                 <div className="flex justify-end px-6 py-2 bg-gray-50/50 border-t border-gray-100">
                    {/* "See Details" button hidden per user request */}
                 </div>
             </div>
             );
         })}
      </div>
    </div>
  );
};

export default EligibilityHistory;
