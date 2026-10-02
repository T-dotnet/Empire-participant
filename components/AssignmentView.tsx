import React, { useState, useMemo } from 'react';
import { Icons } from './Icons';
import { EligibilityDomain, DomainState } from '../types';

interface AssignmentViewProps {
  domains: EligibilityDomain[];
  platformDomain?: DomainState;
}

const STATE_DOMAIN_MAPPING: Record<string, string[]> = {
  'Negative': ['antibiotics'],
  'Positive': ['anticoagulation', 'respiratory'],
  'Unknown': ['statins', 'vasopressors']
};

const AssignmentView: React.FC<AssignmentViewProps> = ({ domains, platformDomain }) => {
  const tableRows = useMemo(() => {
    if (!platformDomain) return [];

    const rows: { state: string; domain: EligibilityDomain; isCurrent: boolean }[] = [];

    // Helper to check if domain is an assignment domain
    const isAssignmentDomain = (d: EligibilityDomain) => 
      d.status === 'ELIGIBLE' &&
      (d.consentStatus === 'OBTAINED') &&
      d.randomisationStatus === 'RANDOMISED';

    // 1. Current State
    const currentState = platformDomain.stateDetails || 'Unknown';
    const currentSarsStatus = currentState.split(',')[0].trim();
    
    domains.forEach(d => {
        const currentDomainIds = STATE_DOMAIN_MAPPING[currentSarsStatus] || [];
        if (currentDomainIds.includes(d.id) && isAssignmentDomain(d)) {
             rows.push({ state: currentState, domain: d, isCurrent: true });
        }
    });

    // 2. History States
    const history = platformDomain.history || [];
    const reversedHistory = [...history].reverse();
    reversedHistory.forEach((h) => {
        const state = h.stateDetails || 'Unknown';
        const sarsStatus = state.split(',')[0].trim();
        
        const domainIds = STATE_DOMAIN_MAPPING[sarsStatus] || [];
        domains.forEach(d => {
            if (domainIds.includes(d.id) && isAssignmentDomain(d)) {
                rows.push({ state, domain: d, isCurrent: false });
            }
        });
    });

    return rows;
  }, [platformDomain, domains]);

  const totalAssignments = tableRows.length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Table Section */}
      <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-900 uppercase tracking-wider cursor-pointer group">
                  <div className="flex items-center">
                    Domain
                    <Icons.ArrowUpDown className="w-3 h-3 ml-1 text-gray-400 group-hover:text-gray-600" />
                  </div>
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                  State
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-900 uppercase tracking-wider cursor-pointer group">
                  <div className="flex items-center">
                    Created on
                    <Icons.ArrowUpDown className="w-3 h-3 ml-1 text-gray-400 group-hover:text-gray-600" />
                  </div>
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                  Assignment
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tableRows.length > 0 ? (
                tableRows.map((row, idx) => (
                  <tr key={`${row.domain.id}-${row.state}-${idx}`} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {row.domain.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {row.state}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {row.domain.randomisedDate || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {row.domain.assignedArm || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-brand-600 hover:text-brand-700 cursor-pointer">
                      Details
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500 italic">
                    No assignments available yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Footer / Actions */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between rounded-xl shadow-sm border border-gray-200">
         <div className="text-sm text-gray-500">
           Showing <span className="font-medium">{totalAssignments}</span> assignments
         </div>
         
         <div className="flex items-center space-x-6">
           <div className="flex items-center space-x-6 text-sm text-gray-500">
             <div className="flex items-center">
               <span className="mr-2">Items per page:</span>
               <div className="relative">
                  <select className="appearance-none bg-transparent pr-6 focus:outline-none cursor-pointer">
                    <option>1</option>
                    <option>5</option>
                    <option>10</option>
                  </select>
                  <Icons.ChevronDown className="w-3 h-3 absolute right-0 top-1/2 transform -translate-y-1/2 pointer-events-none" />
               </div>
             </div>
             <div>
               1-{totalAssignments > 0 ? totalAssignments : 1} of {totalAssignments > 0 ? totalAssignments : 1}
             </div>
             <div className="flex items-center space-x-4">
               <button className="hover:text-gray-900"><Icons.ChevronLeft className="w-4 h-4" /></button>
               <button className="hover:text-gray-900"><Icons.ChevronRight className="w-4 h-4" /></button>
             </div>
           </div>
         </div>
      </div>
    </div>
  );
};

export default AssignmentView;
