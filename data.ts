import { Site, Participant, DomainState, EligibilityStatus, ConsentStatus, RandomisationStatus, Notification } from './types';

export const SITES: Site[] = [
  { id: 'site-01', name: 'Royal Melbourne', uidPrefix: 'SCR-0526' },
  { id: 'site-02', name: 'Alfred Health', uidPrefix: 'SCR-0123' },
  { id: 'site-03', name: "St Vincent's Hospital", uidPrefix: 'SCR-0987' },
];

const DOMAIN_KEYS = ['antibiotics', 'anticoagulation', 'statins', 'vasopressors', 'respiratory'];

/**
 * Helper to create a consistent set of domain states following the SARS-CoV-2 eligibility rules:
 * - Respiratory/Anticoagulation: Eligible only if SARS Status is Positive
 * - Antibiotics: Eligible only if SARS Status is Negative
 * - Statins/Vasopressors: Eligible only if SARS Status is Unknown
 */
const createDomainState = (
  eligibility: EligibilityStatus = 'NOT_ASSESSED',
  consent: ConsentStatus = 'NOT_APPLICABLE',
  randomisation: RandomisationStatus = 'NOT_READY',
  sarsStatus: string = 'Negative'
): Record<string, DomainState> => {
  const domains = DOMAIN_KEYS.reduce((acc, key) => {
    let effectiveEligibility: EligibilityStatus = 'NOT_ELIGIBLE';

    if (eligibility === 'NOT_ASSESSED') {
      effectiveEligibility = 'NOT_ASSESSED';
    } else {
      // Apply strict rules based on sarsStatus
      if (sarsStatus === 'Negative' && (key === 'antibiotics')) {
        effectiveEligibility = eligibility;
      } else if (sarsStatus === 'Positive' && (key === 'anticoagulation' || key === 'respiratory')) {
        effectiveEligibility = eligibility;
      } else if (sarsStatus === 'Unknown' && (key === 'statins' || key === 'vasopressors')) {
        effectiveEligibility = eligibility;
      } else {
        effectiveEligibility = 'NOT_ELIGIBLE';
      }
    }

    // REQUIREMENT: If a domain is NOT_ELIGIBLE, consent and randomisation MUST be Not Applicable/Eligible
    const effectiveConsent = effectiveEligibility === 'NOT_ELIGIBLE' ? 'NOT_APPLICABLE' : consent;
    const effectiveRandomisation = effectiveEligibility === 'NOT_ELIGIBLE' ? 'NOT_READY' : randomisation;

    let stateDetails = undefined;
    let strataDetails = undefined;

    if (effectiveEligibility === 'ELIGIBLE' || effectiveEligibility === 'EXPIRED') {
        switch (key) {
            case 'antibiotics':
                stateDetails = 'Sepsis: Mild';
                strataDetails = 'Lactate: 0-2 (1.5)';
                break;
            case 'anticoagulation':
                stateDetails = 'No Bleeding';
                strataDetails = 'Plt: > 150 (200), APTT: 0-1.5 (1.0)';
                break;
            case 'respiratory':
                stateDetails = 'Hypoxemia';
                strataDetails = 'SpO2: < 92%';
                break;
            case 'statins':
                stateDetails = 'Statins: No';
                strataDetails = 'Cholesterol: Normal';
                break;
            case 'vasopressors':
                stateDetails = 'Shock Present';
                strataDetails = 'Vaso Use: Yes (Yes), MAP: 65-75 (70)';
                break;
        }
    } else if (effectiveEligibility === 'NOT_ELIGIBLE' && eligibility !== 'NOT_ASSESSED') {
        stateDetails = `SARS-CoV-2 ${sarsStatus}`;
    }

    acc[key] = { id: key, eligibility: effectiveEligibility, consent: effectiveConsent, randomisation: effectiveRandomisation, stateDetails, strataDetails, history: [] };
    return acc;
  }, {} as Record<string, DomainState>);

  // Add Platform Domain for persistence of SARS status etc.
  domains['platform'] = {
      id: 'platform',
      eligibility: eligibility === 'NOT_ASSESSED' ? 'NOT_ASSESSED' : 'ELIGIBLE',
      consent: 'NOT_APPLICABLE',
      randomisation: 'NOT_READY',
      stateDetails: sarsStatus,
      strataDetails: eligibility === 'NOT_ASSESSED' ? '' : 'Age: 36-45 (45), Weight: 71-90kg (75)',
      history: []
  };
  return domains;
};

export const generateMockParticipants = (sites: Site[]): Participant[] => {
  const participants: Participant[] = [];
  sites.forEach(site => {
    const expiredDomain = createDomainState('EXPIRED', 'NOT_APPLICABLE', 'NOT_READY', 'Negative');
    Object.keys(expiredDomain).forEach(key => {
        if (key !== 'platform' && expiredDomain[key].eligibility !== 'NOT_ELIGIBLE') {
            expiredDomain[key].eligibility = 'EXPIRED';
            expiredDomain[key].consent = 'PENDING_CONSENT';
        }
    });
    
    participants.push({
      id: 'EXP1R',
      uid: site.uidPrefix,
      siteId: site.id,
      lastUpdated: '24.03.2026 09:00',
      status: 'Expired',
      domains: expiredDomain,
      activeAlerts: [{
        level: 'critical',
        title: 'Eligibility Expired',
        description: 'The 72-hour window for randomisation has elapsed.'
      }],
      consentRecords: [
        {
          id: 'cr-exp',
          version: 'DOC-9999',
          recipient: 'Participant',
          isAnalogue: false,
          domainIds: ['antibiotics'],
          status: 'PENDING_CONSENT',
          date: '23.03.2026 10:00',
          situation: 'Standard',
          isActive: true
        }
      ],
      eligibilityRecords: [
        {
          id: 'elg-exp-1',
          timestamp: '20.03.2026 09:00',
          status: 'ELIGIBLE',
          stateDetails: 'Negative',
          domainIds: ['antibiotics'],
          domainStatuses: { antibiotics: 'ELIGIBLE' },
          formValues: { age: '45', weight: '75', consent_capacity: 'Yes', pregnant: 'No', sars_cov_2: 'Negative', suspected_infection: 'Yes', antibiotics_24h: 'No', allergy: 'No', sepsis_severity: 'Mild', lactate: '1.5' },
          isActive: false
        },
        {
          id: 'elg-exp-2',
          timestamp: '24.03.2026 09:00',
          status: 'EXPIRED',
          stateDetails: 'Negative',
          domainIds: ['antibiotics'],
          domainStatuses: { antibiotics: 'EXPIRED' },
          formValues: { age: '45', weight: '75', consent_capacity: 'Yes', pregnant: 'No', sars_cov_2: 'Negative', suspected_infection: 'Yes', antibiotics_24h: 'No', allergy: 'No', sepsis_severity: 'Mild', lactate: '1.5' },
          isActive: true
        }
      ],
      notes: [
        {
          id: 'note-1',
          timestamp: '2026-03-28T09:18',
          author: 'Dr. Emily Wong',
          content: `[Process note]
Doc: Participant Standard
Doc ID: DOC-9999
Time: 28/03/2026, 09:18:00

Date and time presented: 2026-03-28T09:18
Site Staff Present: Dr. Emily Wong
Other Attendees: Parent or Guardian`
        }
      ]
    });

    // 2. ELIGIBILITY CLOSE TO EXPIRY
    const closeToExpireDomain = createDomainState('ELIGIBLE', 'NOT_APPLICABLE', 'NOT_READY', 'Positive');
    closeToExpireDomain.anticoagulation.consent = 'PENDING_CONSENT';
    
    participants.push({
      id: 'CLS2E',
      uid: site.uidPrefix,
      siteId: site.id,
      lastUpdated: '26.09.2025 08:00',
      status: 'Assessment completed',
      eligibilityCloseToExpire: true,
      consentRecipient: 'Participant',
      domains: closeToExpireDomain,
      activeAlerts: [{
        level: 'warning',
        title: 'Eligibility Close to Expiry',
        description: 'Less than 12 hours remaining for randomisation.'
      }],
      eligibilityRecords: [
        {
          id: 'elg-cls-1',
          timestamp: '26.09.2025 08:00',
          status: 'ELIGIBLE',
          stateDetails: 'Positive',
          domainIds: ['anticoagulation', 'respiratory'],
          domainStatuses: { anticoagulation: 'ELIGIBLE', respiratory: 'ELIGIBLE' },
          formValues: { age: '50', weight: '80', consent_capacity: 'Yes', pregnant: 'No', sars_cov_2: 'Positive', active_bleeding: 'No', platelet_count: '200', aptt_ratio: '1.0', hypoxemia: 'Yes', spo2_level: '88' },
          isActive: true
        }
      ]
    });

    // 3. NEW - Truly unassessed
    participants.push({
      id: '1CKEM',
      uid: site.uidPrefix,
      siteId: site.id,
      lastUpdated: '25.09.2025',
      status: 'New',
      domains: {
        platform: { id: 'platform', eligibility: 'NOT_ASSESSED', consent: 'NOT_APPLICABLE', randomisation: 'NOT_READY', stateDetails: '', strataDetails: '', history: [] },
        antibiotics: { id: 'antibiotics', eligibility: 'NOT_ASSESSED', consent: 'NOT_APPLICABLE', randomisation: 'NOT_READY', history: [] },
        anticoagulation: { id: 'anticoagulation', eligibility: 'NOT_ASSESSED', consent: 'NOT_APPLICABLE', randomisation: 'NOT_READY', history: [] },
        statins: { id: 'statins', eligibility: 'NOT_ASSESSED', consent: 'NOT_APPLICABLE', randomisation: 'NOT_READY', history: [] },
        vasopressors: { id: 'vasopressors', eligibility: 'NOT_ASSESSED', consent: 'NOT_APPLICABLE', randomisation: 'NOT_READY', history: [] },
      },
      activeAlerts: []
    });

    // 2. IN PROGRESS - SARS Negative
    participants.push({
      id: 'X9A2B',
      uid: site.uidPrefix,
      siteId: site.id,
      lastUpdated: '24.09.2025',
      status: 'In progress',
      domains: {
        platform: { id: 'platform', eligibility: 'ELIGIBLE', consent: 'NOT_APPLICABLE', randomisation: 'NOT_READY', stateDetails: 'Negative', strataDetails: 'Age: 26-35 (32), Weight: 51-70kg (65)', history: [] },
        antibiotics: { id: 'antibiotics', eligibility: 'IN_PROGRESS', consent: 'NOT_APPLICABLE', randomisation: 'NOT_READY', stateDetails: 'Sepsis: Moderate', strataDetails: 'Lactate: 0-2 (1.8)', history: [] },
        anticoagulation: { id: 'anticoagulation', eligibility: 'NOT_ELIGIBLE', consent: 'NOT_APPLICABLE', randomisation: 'NOT_READY', stateDetails: 'SARS-CoV-2 Negative', history: [] },
        statins: { id: 'statins', eligibility: 'NOT_ELIGIBLE', consent: 'NOT_APPLICABLE', randomisation: 'NOT_READY', stateDetails: 'SARS-CoV-2 Negative', history: [] },
        vasopressors: { id: 'vasopressors', eligibility: 'NOT_ELIGIBLE', consent: 'NOT_APPLICABLE', randomisation: 'NOT_READY', stateDetails: 'SARS-CoV-2 Negative', history: [] },
      },
      activeAlerts: [],
      eligibilityRecords: [
        {
          id: 'elg-inp-1',
          timestamp: '24.09.2025 10:00',
          status: 'IN_PROGRESS',
          stateDetails: 'Negative',
          domainIds: ['antibiotics'],
          domainStatuses: { antibiotics: 'IN_PROGRESS' },
          formValues: { age: '32', weight: '65', consent_capacity: 'Yes', pregnant: 'No', sars_cov_2: 'Negative', suspected_infection: 'Yes', antibiotics_24h: 'No', allergy: 'No', sepsis_severity: 'Moderate', lactate: '1.8' },
          isActive: true
        }
      ]
    });

    // 3. ASSESSMENT COMPLETED - SARS Negative (Eligible for Antibiotics)
    participants.push({
      id: '7F4PL',
      uid: site.uidPrefix,
      siteId: site.id,
      lastUpdated: '23.09.2025',
      status: 'Assessment completed',
      domains: createDomainState('ELIGIBLE', 'NOT_APPLICABLE', 'NOT_READY', 'Negative'),
      activeAlerts: [],
      eligibilityRecords: [
        {
          id: 'elg-cmp-1',
          timestamp: '23.09.2025 09:00',
          status: 'ELIGIBLE',
          stateDetails: 'Negative',
          domainIds: ['antibiotics'],
          domainStatuses: { antibiotics: 'ELIGIBLE' },
          formValues: { age: '45', weight: '75', consent_capacity: 'Yes', pregnant: 'No', sars_cov_2: 'Negative', suspected_infection: 'Yes', antibiotics_24h: 'No', allergy: 'No', sepsis_severity: 'Mild', lactate: '1.5' },
          isActive: true
        }
      ]
    });

    // 4. SINGLE DOMAIN (SARS Positive -> Anticoagulation) - Consent & Randomisation
    const singleDomain = createDomainState('ELIGIBLE', 'NOT_APPLICABLE', 'NOT_READY', 'Positive');
    singleDomain.anticoagulation.consent = 'OBTAINED';
    singleDomain.anticoagulation.randomisation = 'RANDOMISED';
    singleDomain.anticoagulation.assignedArm = 'Treatment B';
    singleDomain.anticoagulation.consentVersion = 'DOC-1122';
    singleDomain.anticoagulation.randomisedDate = '22.09.2025 14:30';
    
    participants.push({
      id: 'S1NGL',
      uid: site.uidPrefix,
      randomisedId: '02021',
      siteId: site.id,
      lastUpdated: '22.09.2025',
      status: 'Randomised',
      domains: singleDomain,
      activeAlerts: [],
      eligibilityRecords: [
        {
          id: 'elg-sngl-1',
          timestamp: '22.09.2025 09:00',
          status: 'ELIGIBLE',
          stateDetails: 'Positive',
          domainIds: ['anticoagulation', 'respiratory'],
          domainStatuses: { anticoagulation: 'ELIGIBLE', respiratory: 'ELIGIBLE' },
          formValues: { age: '50', weight: '80', consent_capacity: 'Yes', pregnant: 'No', sars_cov_2: 'Positive', active_bleeding: 'No', platelet_count: '200', aptt_ratio: '1.0', hypoxemia: 'Yes', spo2_level: '88' },
          isActive: true
        }
      ],
      consentRecords: [
        {
          id: 'cr-1',
          version: 'DOC-1122',
          recipient: 'Participant',
          isAnalogue: false,
          domainIds: ['anticoagulation'],
          status: 'OBTAINED',
          date: '22.09.2025 10:00',
          note: 'Participant signed after discussion',
          situation: 'Standard',
          isActive: true
        }
      ]
    });

    // 5. MULTI STATE & MULTI DOMAIN (SARS Unknown -> Statins, Vasopressors)
    const multiDomain = createDomainState('ELIGIBLE', 'NOT_APPLICABLE', 'NOT_READY', 'Unknown');
    
    // Statins: Consented & Eligible
    multiDomain.statins.consent = 'OBTAINED';
    multiDomain.statins.randomisation = 'READY';
    multiDomain.statins.consentVersion = 'DOC-3344';
    
    // Vasopressors: Pending Consent
    multiDomain.vasopressors.consent = 'PENDING_CONSENT';
    multiDomain.vasopressors.randomisation = 'NOT_READY';
    multiDomain.vasopressors.consentVersion = 'DOC-5566';

    // Add history to platform to show "Multi state"
    multiDomain.platform.history = [
      {
        timestamp: '20.09.2025 10:00',
        status: 'ELIGIBLE',
        stateDetails: 'Negative',
        strataDetails: 'Age: 36-45 (45), Weight: 71-90kg (75)'
      },
      {
        timestamp: '21.09.2025 09:00',
        status: 'ELIGIBLE',
        stateDetails: 'Unknown',
        strataDetails: 'Age: 36-45 (45), Weight: 71-90kg (75)'
      }
    ];

    participants.push({
      id: 'M0LT1',
      uid: site.uidPrefix,
      siteId: site.id,
      lastUpdated: '21.09.2025',
      status: 'Eligible to randomise',
      domains: multiDomain,
      activeAlerts: [],
      eligibilityRecords: [
        {
          id: 'elg-multi-1',
          timestamp: '20.09.2025 10:00',
          status: 'ELIGIBLE',
          stateDetails: 'Negative',
          domainIds: ['antibiotics'],
          domainStatuses: { antibiotics: 'ELIGIBLE' },
          formValues: { age: '45', weight: '75', consent_capacity: 'Yes', pregnant: 'No', sars_cov_2: 'Negative', suspected_infection: 'Yes', antibiotics_24h: 'No', allergy: 'No', sepsis_severity: 'Mild', lactate: '1.5' },
          isActive: false
        },
        {
          id: 'elg-multi-2',
          timestamp: '20.09.2025 11:00',
          status: 'ELIGIBLE',
          stateDetails: 'Negative',
          domainIds: ['antibiotics'],
          domainStatuses: { antibiotics: 'ELIGIBLE' },
          formValues: { age: '45', weight: '75', consent_capacity: 'Yes', pregnant: 'No', sars_cov_2: 'Negative', suspected_infection: 'Yes', antibiotics_24h: 'No', allergy: 'No', sepsis_severity: 'Mild', lactate: '1.5' },
          isActive: false
        },
        {
          id: 'elg-multi-3',
          timestamp: '21.09.2025 09:00',
          status: 'ELIGIBLE',
          stateDetails: 'Unknown',
          domainIds: ['statins', 'vasopressors'],
          domainStatuses: { statins: 'ELIGIBLE', vasopressors: 'ELIGIBLE' },
          formValues: { age: '45', weight: '75', consent_capacity: 'Yes', pregnant: 'No', sars_cov_2: 'Unknown', liver_disease: 'No', taking_statins: 'No', cholesterol_level: 'Normal', shock_present: 'Yes', vasopressor_use: 'Yes', map_target: '70' },
          isActive: true
        }
      ],
      consentRecords: [
        {
          id: 'cr-1b',
          version: 'DOC-1122',
          recipient: 'Participant',
          isAnalogue: false,
          domainIds: ['statins'],
          status: 'WITHDRAWN',
          date: '20.09.2025 14:00',
          situation: 'Standard',
          isActive: false
        },
        {
          id: 'cr-2',
          version: 'DOC-3344',
          recipient: 'Participant',
          isAnalogue: false,
          domainIds: ['statins'],
          status: 'OBTAINED',
          date: '21.09.2025 09:30',
          situation: 'Standard',
          isActive: true
        },
        {
          id: 'cr-3',
          version: 'DOC-5566',
          recipient: 'Participant',
          isAnalogue: false,
          domainIds: ['vasopressors'],
          status: 'PENDING_CONSENT',
          date: '21.09.2025 10:00',
          situation: 'Standard',
          isActive: true
        }
      ]
    });

    // 6. WITHDRAWN CONSENT
    const withdrawnDomain = createDomainState('ELIGIBLE', 'NOT_APPLICABLE', 'NOT_READY', 'Positive');
    withdrawnDomain.anticoagulation.consent = 'WITHDRAWN';
    withdrawnDomain.anticoagulation.randomisation = 'WITHDRAWN';
    withdrawnDomain.anticoagulation.assignedArm = 'Treatment A';
    withdrawnDomain.anticoagulation.consentVersion = 'DOC-1122';
    withdrawnDomain.anticoagulation.randomisedDate = '15.09.2025 10:00';
    
    participants.push({
      id: 'W1THD',
      uid: site.uidPrefix,
      randomisedId: '01011',
      siteId: site.id,
      lastUpdated: '20.09.2025',
      status: 'Withdrawn',
      domains: withdrawnDomain,
      activeAlerts: [],
      eligibilityRecords: [
        {
          id: 'elg-w1thd-1',
          timestamp: '15.09.2025 09:00',
          status: 'ELIGIBLE',
          stateDetails: 'Positive',
          domainIds: ['anticoagulation', 'respiratory'],
          domainStatuses: { anticoagulation: 'ELIGIBLE', respiratory: 'ELIGIBLE' },
          formValues: { age: '50', weight: '80', consent_capacity: 'Yes', pregnant: 'No', sars_cov_2: 'Positive', active_bleeding: 'No', platelet_count: '200', aptt_ratio: '1.0', hypoxemia: 'Yes', spo2_level: '88' },
          isActive: true
        }
      ],
      consentRecords: [
        {
          id: 'cr-4',
          version: 'DOC-1122',
          recipient: 'Participant',
          isAnalogue: false,
          domainIds: ['anticoagulation'],
          status: 'WITHDRAWN',
          date: '20.09.2025 14:00',
          situation: 'Standard',
          isActive: true
        }
      ]
    });

    const declinedDomain = createDomainState('ELIGIBLE', 'NOT_APPLICABLE', 'NOT_READY', 'Positive');
    
    participants.push({
      id: 'D3CLN',
      uid: site.uidPrefix,
      siteId: site.id,
      lastUpdated: '19.09.2025',
      status: 'Consent declined',
      domains: declinedDomain,
      activeAlerts: [],
      eligibilityRecords: [
        {
          id: 'elg-d3cln-1',
          timestamp: '19.09.2025 09:00',
          status: 'ELIGIBLE',
          stateDetails: 'Positive',
          domainIds: ['anticoagulation', 'respiratory'],
          domainStatuses: { anticoagulation: 'ELIGIBLE', respiratory: 'ELIGIBLE' },
          formValues: { age: '50', weight: '80', consent_capacity: 'Yes', pregnant: 'No', sars_cov_2: 'Positive', active_bleeding: 'No', platelet_count: '200', aptt_ratio: '1.0', hypoxemia: 'Yes', spo2_level: '88' },
          isActive: true
        }
      ],
      consentRecords: [
        {
          id: 'cr-5',
          version: 'DOC-1122',
          recipient: 'Participant',
          isAnalogue: false,
          domainIds: ['anticoagulation'],
          status: 'DECLINED',
          date: '19.09.2025 11:00',
          note: 'Participant declined due to concerns',
          situation: 'Standard',
          isActive: true
        }
      ]
    });

    // 8. SIGNATURE REQUESTED (Electronic Flow)
    const sigReqDomain = createDomainState('ELIGIBLE', 'NOT_APPLICABLE', 'NOT_READY', 'Unknown');
    sigReqDomain.statins.consent = 'SIG_REQUESTED';
    sigReqDomain.statins.consentVersion = 'DOC-3344';
    
    participants.push({
      id: 'S1GRQ',
      uid: site.uidPrefix,
      siteId: site.id,
      lastUpdated: '18.09.2025',
      status: 'Awaiting consent',
      domains: sigReqDomain,
      activeAlerts: [],
      eligibilityRecords: [
        {
          id: 'elg-s1grq-1',
          timestamp: '18.09.2025 08:00',
          status: 'ELIGIBLE',
          stateDetails: 'Unknown',
          domainIds: ['statins', 'vasopressors'],
          domainStatuses: { statins: 'ELIGIBLE', vasopressors: 'ELIGIBLE' },
          formValues: { age: '45', weight: '75', consent_capacity: 'Yes', pregnant: 'No', sars_cov_2: 'Unknown', liver_disease: 'No', taking_statins: 'No', cholesterol_level: 'Normal', shock_present: 'Yes', vasopressor_use: 'Yes', map_target: '70' },
          isActive: true
        }
      ],
      consentRecords: [
        {
          id: 'cr-6',
          version: 'DOC-3344',
          recipient: 'Participant',
          isAnalogue: false,
          domainIds: ['statins'],
          status: 'SIG_REQUESTED',
          date: '18.09.2025 09:00',
          situation: 'Standard',
          isActive: true
        }
      ]
    });

    // 9. SIGNATURE PENDING (Electronic Flow)
    const sigPendDomain = createDomainState('ELIGIBLE', 'NOT_APPLICABLE', 'NOT_READY', 'Positive');
    sigPendDomain.anticoagulation.consent = 'SIG_PENDING';
    sigPendDomain.anticoagulation.consentVersion = 'DOC-1122';
    
    participants.push({
      id: 'S1GPD',
      uid: site.uidPrefix,
      siteId: site.id,
      lastUpdated: '17.09.2025',
      status: 'Presented',
      domains: sigPendDomain,
      activeAlerts: [],
      eligibilityRecords: [
        {
          id: 'elg-s1gpd-1',
          timestamp: '17.09.2025 14:00',
          status: 'ELIGIBLE',
          stateDetails: 'Positive',
          domainIds: ['anticoagulation', 'respiratory'],
          domainStatuses: { anticoagulation: 'ELIGIBLE', respiratory: 'ELIGIBLE' },
          formValues: { age: '50', weight: '80', consent_capacity: 'Yes', pregnant: 'No', sars_cov_2: 'Positive', active_bleeding: 'No', platelet_count: '200', aptt_ratio: '1.0', hypoxemia: 'Yes', spo2_level: '88' },
          isActive: true
        }
      ],
      consentRecords: [
        {
          id: 'cr-7',
          version: 'DOC-1122',
          recipient: 'Participant',
          isAnalogue: false,
          domainIds: ['anticoagulation'],
          status: 'SIG_PENDING',
          date: '17.09.2025 15:30',
          processNote: 'Document shown to participant',
          situation: 'Standard',
          isActive: true
        }
      ]
    });

    // 10. (Removed to top)

    // 11. CONSENT VERIFIED (Paper Flow)
    const paperDomain = createDomainState('ELIGIBLE', 'NOT_APPLICABLE', 'NOT_READY', 'Unknown');
    paperDomain.vasopressors.consent = 'OBTAINED';
    paperDomain.vasopressors.randomisation = 'READY';
    paperDomain.vasopressors.consentVersion = 'DOC-5566';
    
    participants.push({
      id: 'P4P3R',
      uid: site.uidPrefix,
      siteId: site.id,
      lastUpdated: '16.09.2025',
      status: 'Eligible to randomise',
      domains: paperDomain,
      activeAlerts: [],
      eligibilityRecords: [
        {
          id: 'elg-p4p3r-1',
          timestamp: '16.09.2025 09:00',
          status: 'ELIGIBLE',
          stateDetails: 'Unknown',
          domainIds: ['statins', 'vasopressors'],
          domainStatuses: { statins: 'ELIGIBLE', vasopressors: 'ELIGIBLE' },
          formValues: { age: '45', weight: '75', consent_capacity: 'Yes', pregnant: 'No', sars_cov_2: 'Unknown', liver_disease: 'No', taking_statins: 'No', cholesterol_level: 'Normal', shock_present: 'Yes', vasopressor_use: 'Yes', map_target: '70' },
          isActive: true
        }
      ],
      consentRecords: [
        {
          id: 'cr-8',
          version: 'DOC-5566',
          recipient: 'Participant',
          isAnalogue: true,
          domainIds: ['vasopressors'],
          status: 'OBTAINED',
          date: '16.09.2025 10:15',
          situation: 'Standard',
          isActive: true,
          analogueSignatureStatus: {
            participant: true,
            participantDateTime: '2025-09-16T10:00',
            investigator: true,
            investigatorDateTime: '2025-09-16T10:10',
            extra: false,
            extraDateTime: ''
          }
        }
      ]
    });

    // 12. MIXED RANDOMISATION (One Randomised, One Pending Reveal)
    const mixedRandDomain = createDomainState('ELIGIBLE', 'NOT_APPLICABLE', 'NOT_READY', 'Negative');
    
    // Antibiotics: Randomised
    mixedRandDomain.antibiotics.consent = 'OBTAINED';
    mixedRandDomain.antibiotics.randomisation = 'RANDOMISED';
    mixedRandDomain.antibiotics.assignedArm = 'Standard Care';
    mixedRandDomain.antibiotics.consentVersion = 'DOC-1122';
    mixedRandDomain.antibiotics.randomisedDate = '14.09.2025 11:00';
    
    participants.push({
      id: 'M1X3D',
      uid: site.uidPrefix,
      randomisedId: '03031',
      siteId: site.id,
      lastUpdated: '14.09.2025',
      status: 'Randomised',
      domains: mixedRandDomain,
      activeAlerts: [],
      eligibilityRecords: [
        {
          id: 'elg-m1x3d-1',
          timestamp: '14.09.2025 08:00',
          status: 'ELIGIBLE',
          stateDetails: 'Negative',
          domainIds: ['antibiotics'],
          domainStatuses: { antibiotics: 'ELIGIBLE' },
          formValues: { age: '45', weight: '75', consent_capacity: 'Yes', pregnant: 'No', sars_cov_2: 'Negative', suspected_infection: 'Yes', antibiotics_24h: 'No', allergy: 'No', sepsis_severity: 'Mild', lactate: '1.5' },
          isActive: true
        }
      ],
      consentRecords: [
        {
          id: 'cr-9',
          version: 'DOC-1122',
          recipient: 'Participant',
          isAnalogue: false,
          domainIds: ['antibiotics'],
          status: 'OBTAINED',
          date: '14.09.2025 09:30',
          situation: 'Standard',
          isActive: true
        }
      ]
    });
  });

  return participants.sort((a,b) => {
    const dateA = a.lastUpdated.split('.').reverse().join('');
    const dateB = b.lastUpdated.split('.').reverse().join('');
    return dateB.localeCompare(dateA);
  });
};

export const mockNotifications: Notification[] = [
  { id: 'notif-1', siteUid: 'SCR-0526', participantId: 'M29QW', type: 'success', title: 'Domain revealed', createdAt: '12.09.2025' },
  { id: 'notif-3', siteUid: 'SCR-0987', participantId: '9JD3R', type: 'warning', title: 'Eligibility window approaching expiry', createdAt: '12.09.2025' },
  { id: 'notif-4', siteUid: 'SCR-0526', participantId: 'W6R2Y', type: 'error', title: 'Eligibility window expired', createdAt: '12.09.2025' },
];