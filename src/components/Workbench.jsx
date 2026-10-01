import React, { useState, useRef } from 'react';
import { Paperclip, Link, Loader2, CheckCircle2, Activity, Trash2, Sparkles, FileSpreadsheet, FileText } from 'lucide-react';
import JSZip from 'jszip';

export default function Workbench({ patients, setPatients, trials, setTrials, onCheck, loading, onLoadDemoData }) {
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [editingTrial, setEditingTrial] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [uploadingPatients, setUploadingPatients] = useState(false);
  const [uploadingCriteria, setUploadingCriteria] = useState(false);
  const patientFileRef = useRef(null);
  const criteriaFileRef = useRef(null);

  const analysisSteps = [
    "Ingesting & parsing de-identified clinical records...",
    "Extracting renal eGFR, histology, scan status & therapy lines...",
    "Auditing strict protocol safety cutoff constraints...",
    "Identifying missing clinical evidence & CPT procedure orders...",
    "Finalizing compliance audit & eligibility matrix..."
  ];

  const handleCheckWithAnalysis = () => {
    setAnalyzing(true);
    setAnalysisStep(0);

    const interval = setInterval(() => {
      setAnalysisStep(prev => {
        if (prev < analysisSteps.length - 1) {
          return prev + 1;
        } else {
          clearInterval(interval);
          setTimeout(() => {
            setAnalyzing(false);
            onCheck();
          }, 450);
          return prev;
        }
      });
    }, 450);
  };

  const handlePatientUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingPatients(true);
    try {
      const fileName = file.name.toLowerCase();

      // 1. Handle ZIP archives
      if (fileName.endsWith('.zip')) {
        const zip = await JSZip.loadAsync(file);
        const textPromises = [];
        zip.forEach((relativePath, zipEntry) => {
          if (!zipEntry.dir && (relativePath.endsWith('.txt') || relativePath.endsWith('.csv') || relativePath.endsWith('.json'))) {
            textPromises.push(zipEntry.async('string'));
          }
        });
        const texts = await Promise.all(textPromises);
        const combinedText = texts.join('\n\n--- NEXT PATIENT RECORD ---\n\n');
        await sendPatientTextToBackend(combinedText, file.name);
      }
      // 2. Handle JSON files
      else if (fileName.endsWith('.json')) {
        const text = await file.text();
        try {
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed)) {
            setPatients(prev => [...prev, ...parsed]);
          } else if (parsed.patients && Array.isArray(parsed.patients)) {
            setPatients(prev => [...prev, ...parsed.patients]);
          } else {
            await sendPatientTextToBackend(text, file.name);
          }
        } catch {
          await sendPatientTextToBackend(text, file.name);
        }
      }
      // 3. Handle TXT, CSV, and raw clinical notes
      else {
        const text = await file.text();
        await sendPatientTextToBackend(text, file.name);
      }
    } catch (err) {
      console.error('Failed to process patient file:', err);
    } finally {
      setUploadingPatients(false);
    }
    e.target.value = '';
  };

  const sendPatientTextToBackend = async (rawText, fileName) => {
    const res = await fetch('/api/extract-patients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rawText, fileName }),
    });
    const data = await res.json();
    if (data.patients && data.patients.length > 0) {
      setPatients(prev => [...prev, ...data.patients]);
    }
  };

  const handleCriteriaUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingCriteria(true);
    try {
      const text = await file.text();
      const res = await fetch('/api/extract-criteria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText: text, fileName: file.name }),
      });
      const data = await res.json();
      if (data.trial) {
        setTrials(prev => [data.trial, ...prev]);
      }
    } catch (err) {
      console.error('Failed to extract criteria:', err);
    } finally {
      setUploadingCriteria(false);
    }
    e.target.value = '';
  };

  const removePatient = (id, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setPatients(prev => prev.filter(p => p.id !== id));
    setSelectedPatient(prev => (prev?.id === id ? null : prev));
  };

  const removeTrial = (id, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setTrials(prev => prev.filter(t => t.id !== id));
  };

  const handlePatientSelect = (patient) => {
    setSelectedPatient(prev => (prev?.id === patient.id ? null : patient));
  };

  return (
    <div className="px-6 sm:px-10 py-6 relative">
      {/* Analysis Loading Modal */}
      {analyzing && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border-2 border-black rounded-lg shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center gap-2.5 mb-4 border-b border-gray-200 pb-3">
              <Activity className="animate-spin text-black" size={20} />
              <h3 className="text-base font-bold tracking-tight">Clinical Decision Engine</h3>
            </div>

            <p className="text-xs text-gray-500 mb-4">
              Evaluating {patients.length} patient records against {trials[0]?.id || 'trial protocol'} rules:
            </p>

            <div className="space-y-2.5 mb-5">
              {analysisSteps.map((step, idx) => {
                const isDone = idx < analysisStep;
                const isCurrent = idx === analysisStep;
                return (
                  <div
                    key={idx}
                    className={`flex items-center gap-2.5 text-xs transition-all ${
                      isDone
                        ? 'text-emerald-800 font-semibold'
                        : isCurrent
                        ? 'text-black font-bold'
                        : 'text-gray-400'
                    }`}
                  >
                    {isDone ? (
                      <CheckCircle2 size={15} className="text-emerald-700 flex-shrink-0" />
                    ) : isCurrent ? (
                      <Loader2 size={15} className="animate-spin text-black flex-shrink-0" />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full border border-gray-300 flex-shrink-0" />
                    )}
                    <span className="truncate">{step}</span>
                  </div>
                );
              })}
            </div>

            <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-black h-1.5 transition-all duration-300"
                style={{ width: `${((analysisStep + 1) / analysisSteps.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-0">
        <div className="hidden lg:block absolute left-1/2 top-[62px] bottom-0 w-px bg-black" />

        {/* LEFT: Patients */}
        <div className="w-full lg:w-1/2 lg:pr-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold">Patients ({patients.length})</h2>
            {patients.length > 0 && (
              <button
                onClick={() => setPatients([])}
                className="text-xs text-gray-500 hover:text-red-700 font-semibold cursor-pointer"
              >
                Clear all
              </button>
            )}
          </div>

          {/* Upload area */}
          <div
            onClick={() => patientFileRef.current?.click()}
            className="flex items-center justify-between border border-black rounded px-4 py-2.5 mb-4 cursor-pointer hover:bg-gray-50 transition-colors"
          >
            <span className="text-sm text-gray-600 flex items-center gap-2">
              {uploadingPatients ? (
                <>
                  <Loader2 size={15} className="animate-spin text-black" />
                  Extracting patient records...
                </>
              ) : (
                'Upload (txt, csv, zip, json)'
              )}
            </span>
            <Paperclip size={16} className="text-gray-500" />
            <input
              ref={patientFileRef}
              type="file"
              accept=".txt,.csv,.zip,.json"
              className="hidden"
              onChange={handlePatientUpload}
            />
          </div>

          {/* Patient list or Empty State */}
          {patients.length === 0 ? (
            <div className="border border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50/50">
              <FileSpreadsheet className="mx-auto text-gray-400 mb-2" size={28} />
              <p className="text-sm font-semibold text-gray-700 mb-1">No patient records loaded</p>
              <p className="text-xs text-gray-500 max-w-xs mx-auto mb-4">
                Upload raw clinical notes, CSV charts, or a ZIP archive above to extract patient profiles.
              </p>
              {onLoadDemoData && (
                <button
                  onClick={onLoadDemoData}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-black rounded text-xs font-bold cursor-pointer hover:bg-black hover:text-white transition-colors"
                >
                  <Sparkles size={12} /> Or Load 49-Patient Demo Cohort
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
              {patients.map(p => (
                <div key={p.id}>
                  <div
                    onClick={() => handlePatientSelect(p)}
                    className={`flex items-center justify-between border rounded px-4 py-2 cursor-pointer transition-colors ${
                      selectedPatient?.id === p.id
                        ? 'border-black border-[1.5px] bg-gray-50 font-bold'
                        : 'border-black hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-sm font-semibold">{p.id} ({p.name})</span>
                    <button
                      onClick={(e) => removePatient(p.id, e)}
                      title="Remove patient"
                      className="w-7 h-6 flex items-center justify-center border border-black rounded text-sm font-bold hover:bg-red-50 hover:text-red-700 cursor-pointer transition-colors"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Inline Pop-Up Card */}
                  {selectedPatient?.id === p.id && (
                    <div className="mt-1 ml-4 border border-black rounded-[4px] bg-white shadow-sm">
                      <div className="flex items-center justify-between px-4 py-2 border-b border-black">
                        <span className="text-sm font-bold">{p.id} ({p.name})</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedPatient(null); }}
                          className="w-6 h-6 flex items-center justify-center border border-black rounded text-xs font-bold hover:bg-gray-100 cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="p-3">
                        <div className="border border-black rounded p-3 font-mono text-[11px] leading-relaxed bg-white min-h-[160px] max-h-[260px] overflow-y-auto whitespace-pre-wrap">
                          <div>Patient ID: {p.id}</div>
                          <div>Age: {p.extracted?.age || 'Not Documented'} | Sex: {p.extracted?.sex || 'Not Documented'}</div>
                          <div>Diagnosis: {p.extracted?.diagnosis || 'Not Documented'}</div>
                          <div>eGFR: {p.extracted?.egfr !== null ? `${p.extracted?.egfr} mL/min` : 'Not on file'}</div>
                          <div>Histology: {p.extracted?.histology || 'Not Documented'}</div>
                          <div>Brain MRI: {p.extracted?.brainMRI || 'Not on file'}</div>
                          <div>Prior Chemo: {p.extracted?.priorChemo || 'Not documented'}</div>
                          <div>ECOG: {p.extracted?.ecog !== null && p.extracted?.ecog !== undefined ? p.extracted?.ecog : 'Not documented'}</div>
                        </div>
                        <div className="flex items-center gap-2 mt-3">
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedPatient(null); }}
                            className="px-4 py-1.5 border border-black rounded text-sm cursor-pointer hover:bg-gray-50"
                          >
                            Close
                          </button>
                          <button
                            onClick={(e) => removePatient(p.id, e)}
                            className="px-4 py-1.5 border border-red-500 rounded text-sm cursor-pointer hover:bg-red-50 text-red-600 font-semibold flex items-center gap-1"
                          >
                            <Trash2 size={13} /> Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: Criteria */}
        <div className="w-full lg:w-1/2 lg:pl-8 mt-8 lg:mt-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold">Criteria ({trials.length})</h2>
            {trials.length > 0 && (
              <button
                onClick={() => setTrials([])}
                className="text-xs text-gray-500 hover:text-red-700 font-semibold cursor-pointer"
              >
                Clear all
              </button>
            )}
          </div>

          {/* Upload area */}
          <div
            onClick={() => criteriaFileRef.current?.click()}
            className="flex items-center justify-between border border-black rounded px-4 py-2.5 mb-4 cursor-pointer hover:bg-gray-50 transition-colors"
          >
            <span className="text-sm text-gray-600 flex items-center gap-2">
              {uploadingCriteria ? (
                <>
                  <Loader2 size={15} className="animate-spin text-black" />
                  Extracting protocol criteria...
                </>
              ) : (
                'Upload (PDF, TXT, etc.)'
              )}
            </span>
            <Link size={16} className="text-gray-500" />
            <input
              ref={criteriaFileRef}
              type="file"
              accept=".pdf,.txt,.json,.csv"
              className="hidden"
              onChange={handleCriteriaUpload}
            />
          </div>

          {/* Criteria cards or Empty State */}
          {trials.length === 0 ? (
            <div className="border border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50/50">
              <FileText className="mx-auto text-gray-400 mb-2" size={28} />
              <p className="text-sm font-semibold text-gray-700 mb-1">No trial protocol loaded</p>
              <p className="text-xs text-gray-500 max-w-xs mx-auto mb-4">
                Upload a trial protocol document or criteria file above to extract eligibility rules.
              </p>
              {onLoadDemoData && (
                <button
                  onClick={onLoadDemoData}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-black rounded text-xs font-bold cursor-pointer hover:bg-black hover:text-white transition-colors"
                >
                  <Sparkles size={12} /> Or Load Phase III Protocol
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {trials.map(trial => (
                <div key={trial.id} className="border border-black rounded">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-black">
                    <span className="text-sm font-bold">{trial.id}</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditingTrial(editingTrial === trial.id ? null : trial.id); }}
                        title="Edit criteria"
                        className="w-7 h-6 flex items-center justify-center border border-black rounded text-xs hover:bg-gray-100 cursor-pointer"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={(e) => removeTrial(trial.id, e)}
                        className="w-7 h-6 flex items-center justify-center border border-black rounded text-sm font-bold hover:bg-gray-100 cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                  <div className="px-4 py-3">
                    {trial.title && (
                      <p className="text-xs text-gray-500 mb-2">{trial.title}</p>
                    )}
                    <ul className="space-y-2">
                      {trial.criteria.map((c, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <span className="mt-1.5 w-1.5 h-1.5 bg-black rounded-full flex-shrink-0" />
                          {editingTrial === trial.id ? (
                            <input
                              defaultValue={c.description}
                              className="flex-1 border-b border-gray-300 outline-none text-sm py-0.5"
                              onBlur={(e) => {
                                const newCriteria = [...trial.criteria];
                                newCriteria[i] = { ...newCriteria[i], description: e.target.value };
                                setTrials(prev => prev.map(t => t.id === trial.id ? { ...t, criteria: newCriteria } : t));
                              }}
                            />
                          ) : (
                            <span>{c.description}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Check Button */}
          <div className="mt-8">
            <button
              onClick={handleCheckWithAnalysis}
              disabled={analyzing || loading || patients.length === 0 || trials.length === 0}
              className={`w-full py-3.5 border-2 border-black rounded-full text-base font-bold cursor-pointer transition-all ${
                analyzing || loading
                  ? 'bg-gray-100 text-gray-400 cursor-wait'
                  : 'bg-white text-black hover:bg-black hover:text-white'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              {analyzing ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 size={18} className="animate-spin" />
                  Analyzing Cohort Eligibility...
                </span>
              ) : (
                'Check'
              )}
            </button>
            {patients.length === 0 && trials.length === 0 && (
              <p className="text-center text-xs text-gray-400 mt-2">
                Upload files on both sides or click "Load Sample Cohort" above to run Check
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
