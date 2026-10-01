import React from 'react';
import { ArrowLeft, Printer, X, CheckCircle, AlertTriangle, XCircle, FileText, ClipboardList } from 'lucide-react';

// Print directly without opening a blank new tab & suppress browser header/footer URLs
function printDocument(html) {
  let iframe = document.getElementById('silent-print-frame');
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'silent-print-frame';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);
  }
  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(html);
  doc.close();
  setTimeout(() => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
  }, 300);
}

export default function PatientDossier({ patient, trial, onBack, onBackToWorkbench }) {
  const p = patient.patient || patient;
  const criteriaResults = patient.criteriaResults || [];
  const overallStatus = patient.status || 'REVIEW';

  const statusConfig = {
    PASSED: { label: 'PASSED — FULLY ELIGIBLE', bg: 'bg-passed-bg', border: 'border-green-700', text: 'text-passed', icon: CheckCircle },
    REVIEW: { label: 'REVIEW — REMEDIABLE GAPS', bg: 'bg-review-bg', border: 'border-review-border', text: 'text-review', icon: AlertTriangle },
    REJECTED: { label: 'NOT ELIGIBLE — DISQUALIFIED', bg: 'bg-rejected-bg', border: 'border-red-400', text: 'text-rejected', icon: XCircle },
  };
  const sc = statusConfig[overallStatus] || statusConfig.REVIEW;
  const StatusIcon = sc.icon;

  const missingCriteria = criteriaResults.filter(c => c.status === 'MISSING');
  const metCriteria = criteriaResults.filter(c => c.status === 'MET');
  const failedCriteria = criteriaResults.filter(c => c.status === 'FAILED');

  const handleGenerateRequisition = () => {
    const content = generateRequisitionHTML(p, trial, missingCriteria);
    printDocument(content);
  };

  const handlePrintReport = () => {
    const content = generateReportHTML(p, trial, criteriaResults, overallStatus, missingCriteria);
    printDocument(content);
  };

  return (
    <div className="px-6 sm:px-10 py-6">
      {/* Title */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight">
            Comprehensive Clinical Trial Eligibility Report
          </h2>
          <p className="text-xs text-gray-500">
            Automated Evidence-Backed Inclusion & Exclusion Audit • Protocol: {trial?.id || 'Active Trial'}
          </p>
        </div>
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3.5 py-1.5 border border-black rounded text-xs font-bold cursor-pointer hover:bg-gray-50"
        >
          <X size={14} /> Close Report
        </button>
      </div>

      {/* Active Context Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 border border-black rounded p-3.5 mb-6 bg-gray-50">
        <div className="flex items-center gap-3">
          <span className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold ${sc.bg} ${sc.text} border ${sc.border}`}>
            <StatusIcon size={14} />
            {sc.label}
          </span>
          <span className="text-sm font-extrabold">
            {p.id} — {p.name}
          </span>
          <span className="text-xs text-gray-600 font-medium">
            (Age: {p.extracted?.age || '?'}, {p.extracted?.sex || '?'})
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono text-gray-600">
          <span>Met: <strong>{metCriteria.length}</strong></span>
          <span>Missing: <strong>{missingCriteria.length}</strong></span>
          <span>Failed: <strong>{failedCriteria.length}</strong></span>
        </div>
      </div>

      {/* Two-Column Comprehensive Layout */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* LEFT: Clinical Data & Extracted Attributes */}
        <div className="w-full lg:w-1/2 space-y-4">
          <div className="border border-black rounded">
            <div className="px-4 py-2.5 border-b border-black bg-white flex items-center justify-between">
              <span className="text-xs font-bold flex items-center gap-1.5">
                <FileText size={14} /> Clinical Source Record & Biomarkers
              </span>
              <span className="text-[11px] font-mono text-gray-500">MRN: {p.id}</span>
            </div>

            {/* Structured Findings Matrix */}
            <div className="p-4 grid grid-cols-2 gap-2.5 bg-gray-50 border-b border-gray-200 text-[11px]">
              <div className="bg-white border border-gray-300 rounded p-2">
                <span className="text-gray-500 block text-[10px] font-bold">PRIMARY DIAGNOSIS</span>
                <span className="font-semibold">{p.extracted?.diagnosis || 'Stage IV NSCLC'}</span>
              </div>
              <div className="bg-white border border-gray-300 rounded p-2">
                <span className="text-gray-500 block text-[10px] font-bold">HISTOLOGY / SUBTYPE</span>
                <span className="font-semibold">{p.extracted?.histology || 'Adenocarcinoma'}</span>
              </div>
              <div className="bg-white border border-gray-300 rounded p-2">
                <span className="text-gray-500 block text-[10px] font-bold">RENAL FUNCTION (eGFR)</span>
                <span className={`font-semibold ${p.extracted?.egfr < 50 ? 'text-red-700 font-bold' : 'text-emerald-800'}`}>
                  {p.extracted?.egfr !== null ? `${p.extracted?.egfr} mL/min/1.73m²` : 'Not on file'}
                </span>
              </div>
              <div className="bg-white border border-gray-300 rounded p-2">
                <span className="text-gray-500 block text-[10px] font-bold">CRANIAL / BRAIN SCAN</span>
                <span className={`font-semibold ${p.extracted?.brainMRI?.toLowerCase().includes('pending') ? 'text-amber-800' : p.extracted?.brainMRI?.toLowerCase().includes('positive') ? 'text-red-700' : 'text-emerald-800'}`}>
                  {p.extracted?.brainMRI || 'Not documented'}
                </span>
              </div>
              <div className="col-span-2 bg-white border border-gray-300 rounded p-2">
                <span className="text-gray-500 block text-[10px] font-bold">PRIOR ONCOLOGY THERAPY</span>
                <span className="font-semibold">{p.extracted?.priorChemo || 'No prior lines recorded'}</span>
              </div>
            </div>

            {/* Raw Clinical Note Text */}
            <div className="p-4">
              <span className="text-[10.5px] font-bold text-gray-500 block mb-1 uppercase tracking-wider">
                Full De-identified Clinical Note
              </span>
              <div className="font-mono text-[11px] leading-relaxed bg-white border border-gray-200 rounded p-3 min-h-[220px] max-h-[340px] overflow-y-auto whitespace-pre-wrap">
                {p.rawText || formatExtractedData(p)}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Protocol Rules Verification & Decision Engine */}
        <div className="w-full lg:w-1/2 space-y-4">
          <div className="border border-black rounded">
            <div className="px-4 py-2.5 border-b border-black bg-white flex items-center justify-between">
              <span className="text-xs font-bold flex items-center gap-1.5">
                <ClipboardList size={14} /> Protocol Rule-by-Rule Audit Matrix
              </span>
              <span className="text-[11px] font-bold">
                {trial?.id || 'Protocol Check'}
              </span>
            </div>

            <div className="p-4 space-y-3">
              {criteriaResults.map((cr, i) => (
                <div
                  key={i}
                  className={`rounded p-3.5 border ${
                    cr.status === 'MET'
                      ? 'bg-passed-bg border-passed-border'
                      : cr.status === 'MISSING'
                      ? 'bg-review-bg border-review-border'
                      : 'bg-rejected-bg border-rejected-border'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className={`text-xs font-bold ${
                      cr.status === 'MET' ? 'text-passed' : cr.status === 'MISSING' ? 'text-review' : 'text-rejected'
                    }`}>
                      {cr.status === 'MET' ? '✔' : cr.status === 'MISSING' ? '⚠️' : '✘'} Rule {i + 1}: {cr.criterion}
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                      cr.status === 'MET' ? 'bg-emerald-100 text-emerald-800' : cr.status === 'MISSING' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {cr.status}
                    </span>
                  </div>

                  <div className="text-[11px] text-gray-800 space-y-1">
                    <div><strong>Evidence:</strong> <span className="font-mono text-[10.5px]">{cr.evidence}</span></div>
                    {cr.explanation && (
                      <div className="text-gray-600 text-[10.5px] leading-normal">
                        <strong>Analysis:</strong> {cr.explanation}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Action Plan / Remediation Box */}
              {missingCriteria.length > 0 && (
                <div className="border-2 border-amber-600 rounded p-3.5 bg-amber-50 mt-4">
                  <div className="text-xs font-bold text-amber-900 mb-1.5 flex items-center gap-1.5">
                    <AlertTriangle size={14} /> Required Action Plan to Qualify:
                  </div>
                  <div className="text-[11px] text-amber-950 space-y-1.5">
                    {missingCriteria.map((mc, i) => (
                      <div key={i} className="flex items-start gap-1.5">
                        <span className="font-bold">{i + 1}.</span>
                        <div>
                          <strong>{mc.remediation || 'Missing test or document'}</strong>
                          <div className="text-[10.5px] text-amber-900">Required to fulfill: {mc.criterion}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2.5 pt-3">
                {missingCriteria.length > 0 && (
                  <button
                    onClick={handleGenerateRequisition}
                    className="flex-1 py-2.5 bg-black text-white rounded text-xs font-bold cursor-pointer hover:bg-gray-800 transition-colors text-center"
                  >
                    Print Test Order ({missingCriteria[0]?.remediation?.match(/CPT \d+/)?.[0] || 'Requisition'})
                  </button>
                )}
                <button
                  onClick={handlePrintReport}
                  className="flex-1 py-2.5 border border-black rounded text-xs font-bold cursor-pointer hover:bg-gray-50 transition-colors text-center"
                >
                  Print Full Patient Report (PDF)
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 border border-black rounded text-xs font-bold cursor-pointer hover:bg-gray-50"
        >
          <ArrowLeft size={14} />
          Back to Matching Results
        </button>
      </div>
    </div>
  );
}

function formatExtractedData(p) {
  const e = p.extracted || {};
  return `[DEMOGRAPHICS & ADMISSION]
Patient: ${p.name} | ID: ${p.id}
Age: ${e.age || '?'} | Sex: ${e.sex || '?'}

[PATHOLOGY & DIAGNOSIS]
${e.diagnosis || 'Not documented'}
Histology: ${e.histology || 'Not documented'}
Stage: ${e.stage || '?'}

[BASELINE LABS${e.labDate ? ' - SAMPLED ' + e.labDate : ''}]
eGFR: ${e.egfr !== null ? e.egfr + ' mL/min/1.73m²' : 'Not on file'}
ALT: ${e.alt || '?'} U/L | AST: ${e.ast || '?'} U/L

[IMAGING & SCAN STATUS]
Brain MRI: ${e.brainMRI || 'Not on file'}

[PRIOR ONCOLOGY TREATMENT]
${e.priorChemo || 'Not documented'}

[ECOG PERFORMANCE STATUS]
${e.ecog !== undefined && e.ecog !== null ? 'ECOG ' + e.ecog : 'Not documented'}`;
}

function generateRequisitionHTML(p, trial, missingCriteria) {
  const now = new Date().toISOString().split('T')[0];
  return `<!DOCTYPE html><html><head><title>Clinical Requisition - ${p.id}</title>
<style>
@page {
  margin: 0;
  size: auto;
}
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  max-width: 750px;
  margin: 0 auto;
  padding: 35px 40px;
  color: #111;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
h1 { font-size: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; margin: 0 0 15px; text-transform: uppercase; }
.meta { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 13px; margin-bottom: 25px; border: 1px solid #ddd; padding: 12px; border-radius: 6px; }
.order { border: 1.5px solid #000; padding: 14px; margin: 10px 0; border-radius: 6px; background: #fefce8; }
.order-title { font-weight: 800; font-size: 13px; }
.order-sub { font-size: 11px; color: #555; margin-top: 4px; }
.sig { margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 30px; font-size: 12px; border-top: 1px solid #000; padding-top: 15px; }
</style></head><body>
<h1>Clinical Trial Missing Test Requisition</h1>
<div class="meta">
  <div><strong>Patient Name:</strong> ${p.name}</div>
  <div><strong>Patient ID:</strong> ${p.id}</div>
  <div><strong>Age / Sex:</strong> ${p.extracted?.age || '?'}, ${p.extracted?.sex || '?'}</div>
  <div><strong>Protocol ID:</strong> ${trial?.id || 'Active Trial Protocol'}</div>
  <div><strong>Requisition Date:</strong> ${now}</div>
  <div><strong>Urgency:</strong> Protocol Enrollment Window (&lt; 28 Days)</div>
</div>

<h3 style="font-size:13px; text-transform:uppercase; margin-bottom:10px;">Prescribed Diagnostic & Laboratory Orders:</h3>
${missingCriteria.map((mc, i) => `
<div class="order">
  <div class="order-title">${i + 1}. ${mc.remediation || 'Prescribed Diagnostic Test'}</div>
  <div class="order-sub"><strong>Protocol Requirement:</strong> ${mc.criterion}</div>
  <div class="order-sub"><strong>Clinical Indication:</strong> Patient currently lacks verified non-expired documentation.</div>
</div>
`).join('')}

<div class="sig">
  <div>
    <strong>Principal Investigator / Attending:</strong><br/><br/>
    Signature: __________________________<br/>
    Date: ${now}
  </div>
  <div>
    <strong>Trial Coordination Department:</strong><br/><br/>
    Authorized Specialist: _______________<br/>
    Center: Oncology Clinical Trials Office
  </div>
</div>
</body></html>`;
}

function generateReportHTML(p, trial, criteriaResults, status, missingCriteria) {
  const now = new Date().toISOString().split('T')[0];
  const statusColors = { PASSED: '#166534', REVIEW: '#854d0e', REJECTED: '#991b1b' };
  const statusBg = { PASSED: '#f0fdf4', REVIEW: '#fefce8', REJECTED: '#fef2f2' };
  const statusLabels = {
    PASSED: 'CLEARED FOR PROTOCOL ENROLLMENT',
    REVIEW: 'REVIEW REQUIRED — ACTIONABLE GAPS IDENTIFIED',
    REJECTED: 'DISQUALIFIED — PROTOCOL EXCLUSION TRIGGERED'
  };

  const criteriaHTML = criteriaResults.map((cr, i) => {
    const colors = {
      MET: { bg: '#f0fdf4', border: '#86efac', text: '#166534', badge: '#dcfce7' },
      MISSING: { bg: '#fefce8', border: '#ca8a04', text: '#854d0e', badge: '#fef9c3' },
      FAILED: { bg: '#fef2f2', border: '#fca5a5', text: '#991b1b', badge: '#fee2e2' }
    };
    const c = colors[cr.status] || colors.MISSING;
    const icon = cr.status === 'MET' ? '✔' : cr.status === 'MISSING' ? '⚠️' : '✘';
    return `<div style="background:${c.bg};border:1px solid ${c.border};border-radius:6px;padding:12px;margin:8px 0;page-break-inside:avoid;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
        <div style="font-weight:800;color:${c.text};font-size:12.5px;">${icon} RULE ${i + 1}: ${cr.criterion}</div>
        <span style="font-size:10px;font-weight:bold;background:${c.badge};color:${c.text};padding:2px 8px;border-radius:4px;text-transform:uppercase;">${cr.status}</span>
      </div>
      <div style="font-size:11.5px;color:#222;line-height:1.5;">
        <div><strong>Objective Evidence:</strong> <span style="font-family:monospace;">${cr.evidence}</span></div>
        <div style="margin-top:2px;color:#444;"><strong>Investigator Finding:</strong> ${cr.explanation || 'Evaluated against protocol constraints.'}</div>
      </div>
    </div>`;
  }).join('');

  return `<!DOCTYPE html><html><head><title>Comprehensive Patient Analysis - ${p.id}</title>
<style>
@page {
  margin: 0;
  size: auto;
}
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  max-width: 900px;
  margin: 0 auto;
  padding: 35px 40px;
  color: #111;
  line-height: 1.5;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
.header { border-bottom: 3px solid #000; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
h1 { font-size: 22px; margin: 0; text-transform: uppercase; letter-spacing: 0.5px; }
h2 { font-size: 13px; margin: 4px 0 0; color: #666; text-transform: uppercase; }
.status-banner { text-align: center; font-weight: 800; font-size: 15px; padding: 14px; border-radius: 6px; margin-bottom: 25px; border: 2px solid; letter-spacing: 0.5px; }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 25px; }
.box { border: 1px solid #d1d5db; border-radius: 6px; padding: 12px; background: #fafafa; }
.box-title { font-size: 10.5px; font-weight: 800; text-transform: uppercase; color: #4b5563; margin-bottom: 8px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
.row { display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 12px; }
.label { font-weight: 600; color: #4b5563; }
.val { font-family: monospace; font-size: 11.5px; font-weight: 600; }
.section-title { font-size: 14px; font-weight: 800; border-bottom: 2px solid #000; margin: 25px 0 12px; padding-bottom: 4px; text-transform: uppercase; }
.footer { margin-top: 40px; font-size: 10px; color: #6b7280; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 15px; }
</style></head><body>

<div class="header">
  <div>
    <h1>TRIAL MATCHER</h1>
    <h2>Clinical Eligibility Decision Support Dossier</h2>
  </div>
  <div style="text-align: right; font-size: 11px;">
    <strong>Date:</strong> ${now}<br/>
    <strong>Protocol ID:</strong> ${trial?.id || 'Protocol'}<br/>
    <strong>Validation Standard:</strong> ICH-GCP E6(R2)
  </div>
</div>

<div class="status-banner" style="background:${statusBg[status]};color:${statusColors[status]};border-color:${statusColors[status]}">
  ${statusLabels[status]}
</div>

<div class="grid">
  <div class="box">
    <div class="box-title">Patient Demographics</div>
    <div class="row"><span class="label">Patient ID:</span> <span class="val">${p.id}</span></div>
    <div class="row"><span class="label">Full Name:</span> <span class="val">${p.name}</span></div>
    <div class="row"><span class="label">Age / Sex:</span> <span class="val">${p.extracted?.age || '?'}, ${p.extracted?.sex || '?'}</span></div>
  </div>
  <div class="box">
    <div class="box-title">Clinical Pathology</div>
    <div class="row"><span class="label">Diagnosis:</span> <span class="val">${p.extracted?.diagnosis || 'NSCLC'}</span></div>
    <div class="row"><span class="label">Histology:</span> <span class="val">${p.extracted?.histology || 'Adenocarcinoma'}</span></div>
    <div class="row"><span class="label">Disease Stage:</span> <span class="val">Stage ${p.extracted?.stage || 'IV'}</span></div>
  </div>
  <div class="box">
    <div class="box-title">Renal & Organ Function</div>
    <div class="row"><span class="label">eGFR (mL/min):</span> <span class="val">${p.extracted?.egfr !== null ? p.extracted?.egfr : 'Pending'}</span></div>
    <div class="row"><span class="label">Lab Draw Date:</span> <span class="val">${p.extracted?.labDate || 'Recent'}</span></div>
    <div class="row"><span class="label">ECOG Performance:</span> <span class="val">${p.extracted?.ecog ?? '1'}</span></div>
  </div>
  <div class="box">
    <div class="box-title">CNS Status & Prior Regimens</div>
    <div class="row"><span class="label">Brain Scan:</span> <span class="val">${p.extracted?.brainMRI || 'Not documented'}</span></div>
    <div class="row"><span class="label">Prior Therapy:</span> <span class="val">${p.extracted?.priorChemo || 'None reported'}</span></div>
  </div>
</div>

<div class="section-title">Protocol Eligibility Verification Matrix</div>
${criteriaHTML}

${missingCriteria.length > 0 ? `
<div class="section-title" style="color: #854d0e; border-bottom-color: #854d0e;">Remediation & Action Items</div>
<div style="background: #fefce8; border: 1.5px solid #ca8a04; border-radius: 6px; padding: 14px;">
  <p style="margin: 0 0 8px; font-size: 12px; font-weight: bold; color: #854d0e;">To achieve trial onboarding clearance, coordinate the following orders:</p>
  <ul style="font-size: 11.5px; margin: 0; padding-left: 20px; line-height: 1.6;">
    ${missingCriteria.map(mc => `<li><strong>${mc.remediation || 'Diagnostic update required'}</strong> — <em>Protocol Rule: ${mc.criterion}</em></li>`).join('')}
  </ul>
</div>
` : ''}

<div class="footer">
  Confidential Clinical Trial Document • Evaluated by Trial Matcher CDS Engine • Automated decision support for protocol <strong>${trial?.id || 'Active Protocol'}</strong>.
</div>
</body></html>`;
}
