import React, { useState, useCallback, useEffect } from 'react';
import Workbench from './components/Workbench.jsx';
import TriageDashboard from './components/TriageDashboard.jsx';
import PatientDossier from './components/PatientDossier.jsx';
import ApiKeyModal from './components/ApiKeyModal.jsx';
import { Activity, Sparkles } from 'lucide-react';

export default function App() {
  const [view, setView] = useState('workbench'); // 'workbench' | 'triage' | 'dossier'
  const [patients, setPatients] = useState([]);
  const [trials, setTrials] = useState([]);
  const [triageResult, setTriageResult] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [apiKeySet, setApiKeySet] = useState(false);
  const [showApiModal, setShowApiModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Check API status on mount without automatically loading sample data
  useEffect(() => {
    fetch('/api/status')
      .then(r => r.json())
      .then(data => setApiKeySet(data.apiKeySet))
      .catch(() => {});
  }, []);

  // Quick helper to load pre-built demo data if needed
  const loadDemoData = useCallback(async () => {
    try {
      const res = await fetch('/api/sample-data');
      const data = await res.json();
      setPatients(data.patients || []);
      setTrials(data.trials || []);
    } catch (e) {
      console.error('Failed to load demo data:', e);
    }
  }, []);

  const handleCheck = useCallback(async () => {
    if (patients.length === 0 || trials.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch('/api/triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patients, trials }),
      });
      const data = await res.json();
      setTriageResult(data);
      setView('triage');
    } catch (e) {
      console.error('Triage failed:', e);
    } finally {
      setLoading(false);
    }
  }, [patients, trials]);

  const handlePatientClick = useCallback((patient) => {
    setSelectedPatient(patient);
    setView('dossier');
  }, []);

  const handleBackToWorkbench = useCallback(() => {
    setView('workbench');
    setTriageResult(null);
  }, []);

  const handleBackToDashboard = useCallback(() => {
    setView('triage');
    setSelectedPatient(null);
  }, []);

  const handleApiKeySaved = useCallback(() => {
    setApiKeySet(true);
    setShowApiModal(false);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-black px-6 sm:px-10 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity size={20} strokeWidth={2.2} />
          <h1 className="text-lg sm:text-xl font-bold tracking-tight">Trial Matcher</h1>
        </div>
        <div className="flex items-center gap-3">
          {patients.length === 0 && trials.length === 0 && (
            <button
              onClick={loadDemoData}
              className="flex items-center gap-1.5 px-3 py-1 border border-black rounded text-xs font-semibold cursor-pointer hover:bg-gray-100 transition-colors"
            >
              <Sparkles size={13} /> Load Sample Cohort
            </button>
          )}
          <div className="text-xs font-semibold text-gray-500 font-mono hidden sm:inline">
            Clinical Decision Support v2.2
          </div>
        </div>
      </header>

      {/* Views */}
      {view === 'workbench' && (
        <Workbench
          patients={patients}
          setPatients={setPatients}
          trials={trials}
          setTrials={setTrials}
          onCheck={handleCheck}
          loading={loading}
          onLoadDemoData={loadDemoData}
        />
      )}

      {view === 'triage' && triageResult && (
        <TriageDashboard
          result={triageResult}
          onBack={handleBackToWorkbench}
          onPatientClick={handlePatientClick}
        />
      )}

      {view === 'dossier' && selectedPatient && (
        <PatientDossier
          patient={selectedPatient}
          trial={trials[0]}
          onBack={handleBackToDashboard}
          onBackToWorkbench={handleBackToWorkbench}
        />
      )}

      {/* API Key Modal */}
      {showApiModal && (
        <ApiKeyModal
          onClose={() => setShowApiModal(false)}
          onSaved={handleApiKeySaved}
          isSet={apiKeySet}
        />
      )}
    </div>
  );
}
