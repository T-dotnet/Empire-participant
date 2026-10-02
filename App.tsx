import React, { useState } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import ParticipantList from './components/ParticipantList';
import ParticipantDetail from './components/ParticipantDetail';
import DataCollectionList from './components/DataCollectionList';
import NotificationsModal from './components/NotificationsModal';
import { FormModal } from './components/FormModal';
import { Participant, Site, Notification } from './types';
import { AddParticipantFormData } from './components/AddParticipantModal';
import { SITES, generateMockParticipants, mockNotifications } from './data';

const BASE_DOMAINS = ['antibiotics', 'anticoagulation', 'statins', 'vasopressors'];

const App: React.FC = () => {
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [mainTab, setMainTab] = useState<'participants' | 'data-collection'>('participants');
  
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [allParticipants, setAllParticipants] = useState<Participant[]>(() => generateMockParticipants(SITES));
  const [currentSiteId, setCurrentSiteId] = useState<string>(SITES[0].id);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  
  // State for opening form modal from Data Collection list
  const [selectedForm, setSelectedForm] = useState<{
    id: string, 
    templateId?: string, 
    formName: string, 
    status: string,
    participantId?: string // Added participantId
  } | null>(null);

  // Lifted state for visible domains (columns/sections)
  const [visibleDomains, setVisibleDomains] = useState<string[]>(BASE_DOMAINS);

  const handleSelectParticipant = (participant: Participant) => {
    setSelectedParticipant(participant);
    setView('detail');
  };

  const handleBack = () => {
    setSelectedParticipant(null);
    setView('list');
  };

  const handleUpdateParticipant = React.useCallback((updated: Participant) => {
    setAllParticipants(prev => prev.map(p => p.id === updated.id && p.siteId === updated.siteId ? updated : p));
    setSelectedParticipant(updated);
  }, []);

  const handleSiteChange = (siteId: string) => {
    setCurrentSiteId(siteId);
    handleBack(); // Go back to list view when site changes
  };
  
  const currentSite = SITES.find(s => s.id === currentSiteId) || SITES[0];
  const participantsForCurrentSite = allParticipants.filter(p => p.siteId === currentSiteId);

  const handleAddParticipant = (data: AddParticipantFormData) => {
    // Generate a random 5-character alphanumeric ID
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let id = '';
    for (let i = 0; i < 5; i++) {
        id += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const newParticipant: Participant = {
      id: id,
      uid: currentSite.uidPrefix,
      siteId: currentSiteId,
      lastUpdated: `${data.date.split('-').reverse().join('.')} ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`,
      status: 'New',
      domains: {
        platform: { id: 'platform', eligibility: 'NOT_ASSESSED', consent: 'NOT_APPLICABLE', randomisation: 'NOT_READY', stateDetails: '', history: [] },
        antibiotics: { id: 'antibiotics', eligibility: 'NOT_ASSESSED', consent: 'NOT_APPLICABLE', randomisation: 'NOT_READY' },
        anticoagulation: { id: 'anticoagulation', eligibility: 'NOT_ASSESSED', consent: 'NOT_APPLICABLE', randomisation: 'NOT_READY' },
        statins: { id: 'statins', eligibility: 'NOT_ASSESSED', consent: 'NOT_APPLICABLE', randomisation: 'NOT_READY' },
        vasopressors: { id: 'vasopressors', eligibility: 'NOT_ASSESSED', consent: 'NOT_APPLICABLE', randomisation: 'NOT_READY', },
      },
      activeAlerts: []
    };

    setAllParticipants([newParticipant, ...allParticipants]);
    
    setSelectedParticipant(newParticipant);
    setView('detail');
  };

  const handleToggleNotifications = () => {
    setIsNotificationsOpen(prev => !prev);
  };

  const handleNotificationClick = (notification: Notification) => {
    const targetParticipant = allParticipants.find(p => p.uid === notification.siteUid && p.id === notification.participantId);
    
    if (targetParticipant) {
      if(currentSiteId !== targetParticipant.siteId) {
          setCurrentSiteId(targetParticipant.siteId);
      }
      handleSelectParticipant(targetParticipant);
    }
    setIsNotificationsOpen(false);
  };

  const handleToggleVisibleDomain = (domainId: string) => {
    setVisibleDomains(prev => 
      prev.includes(domainId) 
        ? prev.filter(d => d !== domainId) 
        : [...prev, domainId]
    );
  };

  const handleToggleNewDomain = () => {
    // No-op or remove if not used
  };

  const handleFormClick = (form: any) => {
      setSelectedForm(form);
  };

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 flex flex-col relative">
      <Header 
        sites={SITES}
        currentSite={currentSite}
        onSiteChange={handleSiteChange}
        onToggleNotifications={handleToggleNotifications}
        notificationCount={notifications.length}
      />
      
      <main className="flex-grow">
        {view === 'list' && (
           <div className="border-b border-gray-200 bg-white sticky top-16 z-40">
              <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex space-x-8">
                   <button
                     onClick={() => setMainTab('participants')}
                     className={`py-4 text-sm font-medium border-b-2 transition-colors relative flex items-center ${
                       mainTab === 'participants' ? 'border-brand-600 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                     }`}
                   >
                     Enrolment
                   </button>
                   <button
                     onClick={() => setMainTab('data-collection')}
                     className={`py-4 text-sm font-medium border-b-2 transition-colors relative flex items-center ${
                       mainTab === 'data-collection' ? 'border-brand-600 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                     }`}
                   >
                     Process data
                   </button>
                </div>
              </div>
           </div>
        )}

        {view === 'list' ? (
          mainTab === 'participants' ? (
            <ParticipantList 
              participants={participantsForCurrentSite}
              onSelectParticipant={handleSelectParticipant}
              onAddParticipant={handleAddParticipant}
              sites={SITES}
              currentSite={currentSite}
              onSiteChange={handleSiteChange}
              onToggleNewDomain={() => {}}
              visibleDomains={visibleDomains}
              onToggleVisibleDomain={handleToggleVisibleDomain}
            />
          ) : (
            <DataCollectionList 
              participants={participantsForCurrentSite}
              currentSite={currentSite}
              sites={SITES}
              onSiteChange={handleSiteChange}
              onFormClick={handleFormClick}
            />
          )
        ) : (
          <ParticipantDetail 
            participant={selectedParticipant}
            onBack={handleBack}
            onUpdate={handleUpdateParticipant}
            visibleDomains={visibleDomains}
          />
        )}
      </main>

      <Footer />

      <NotificationsModal
        isOpen={isNotificationsOpen}
        onClose={handleToggleNotifications}
        notifications={notifications}
        onNotificationClick={handleNotificationClick}
      />

      <FormModal 
        isOpen={!!selectedForm} 
        onClose={() => setSelectedForm(null)}
        formId={selectedForm?.templateId || selectedForm?.id || ''}
        formName={selectedForm?.formName || ''}
        status={selectedForm?.status || ''}
        participantId={selectedForm?.participantId}
      />
    </div>
  );
};

export default App;