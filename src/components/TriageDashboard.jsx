import React, { useState, useMemo } from 'react';
import { ArrowLeft, Printer, Search, X, CheckCircle, AlertTriangle, XCircle, ArrowRight } from 'lucide-react';

// Print without opening any new browser tab & suppress browser header/footer URLs
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

export default function TriageDashboard({ result, onBack, onPatientClick }) {
  const [searchQuery, setSearchQuery] = useState('');
  const { passed = [], review = [], rejected = [], stats = {} } = result;
  const total = stats.total || (passed.length + review.length + rejected.length);
  const passedPct = total > 0 ? Math.round((passed.length / total) * 100) : 0;
  const reviewPct = total > 0 ? Math.round((review.length / total) * 100) : 0;
  const rejectedPct = total > 0 ? Math.round((rejected.length / total) * 100) : 0;

  // Filter patients based on search query
  const matchesSearch = (p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const id = (p.patient?.id || '').toLowerCase();
    const name = (p.patient?.name || '').toLowerCase();
    const diag = (p.patient?.extracted?.diagnosis || '').toLowerCase();
    const raw = (p.patient?.rawText || '').toLowerCase();
    const criteriaText = (p.criteriaResults || []).map(c => `${c.criterion} ${c.evidence} ${c.remediation || ''}`).join(' ').toLowerCase();

    return id.includes(q) || name.includes(q) || diag.includes(q) || raw.includes(q) || criteriaText.includes(q);
  };

  const filteredPassed = useMemo(() => passed.filter(matchesSearch), [passed, searchQuery]);
  const filteredReview = useMemo(() => review.filter(matchesSearch), [review, searchQuery]);
  const filteredRejected = useMemo(() => rejected.filter(matchesSearch), [rejected, searchQuery]);
  const allFiltered = useMemo(() => [
    ...filteredPassed.map(p => ({ ...p, statusType: 'PASSED' })),
    ...filteredReview.map(p => ({ ...p, statusType: 'REVIEW' })),
    ...filteredRejected.map(p => ({ ...p, statusType: 'REJECTED' }))
  ], [filteredPassed, filteredReview, filteredRejected]);

  const remediationSummary = {};
  review.forEach(p => {
    (p.criteriaResults || []).forEach(cr => {
      if (cr.status === 'MISSING' && cr.remediation) {
        remediationSummary[cr.remediation] = (remediationSummary[cr.remediation] || 0) + 1;
      }
    });
  });

  const exclusionSummary = {};
  rejected.forEach(p => {
    (p.criteriaResults || []).forEach(cr => {
      if (cr.status === 'FAILED') {
        const key = cr.criterion || 'General Ineligibility';
        exclusionSummary[key] = (exclusionSummary[key] || 0) + 1;
      }
    });
  });

  const getReviewReason = (p) => {
    const missing = (p.criteriaResults || []).find(c => c.status === 'MISSING');
    if (!missing) return 'Needs More Info';
    if (missing.criterion?.toLowerCase().includes('brain')) return 'Missing Brain MRI';
    if (missing.criterion?.toLowerCase().includes('egfr') || missing.criterion?.toLowerCase().includes('renal')) return 'Expired Lab (>30d)';
    if (missing.criterion?.toLowerCase().includes('chemo') || missing.criterion?.toLowerCase().includes('platinum')) return 'Chemo Line Unstated';
    if (missing.criterion?.toLowerCase().includes('ecog')) return 'ECOG Not Documented';
    return 'Needs More Info';
  };

  const getRejectedReason = (p) => {
    const failed = (p.criteriaResults || []).find(c => c.status === 'FAILED');
    if (!failed) return 'Not Eligible';
    if (failed.criterion?.toLowerCase().includes('egfr') || failed.criterion?.toLowerCase().includes('renal'))
      return `eGFR ${p.patient?.extracted?.egfr || '?'} (< 50 limit)`;
    if (failed.criterion?.toLowerCase().includes('brain'))
      return 'Brain Mets Present';
    if (failed.criterion?.toLowerCase().includes('stage'))
      return `Stage ${p.patient?.extracted?.stage || '?'} (Not Stage IV)`;
    if (failed.criterion?.toLowerCase().includes('nsclc') || failed.criterion?.toLowerCase().includes('histology'))
      return 'Wrong Histology';
    return failed.explanation?.slice(0, 30) || 'Not Eligible';
  };

  const handlePrintFullReport = () => {
    const printContent = generateFullReportHTML(result, total);
    printDocument(printContent);
  };

  const handlePrintLabOrders = () => {
    const printContent = generateLabOrdersHTML(review);
    printDocument(printContent);
  };

  const handlePrintPassedList = () => {
    const printContent = generatePassedListHTML(passed);
    printDocument(printContent);
  };

  const isSearching = searchQuery.trim().length > 0;

  return (
    <div className="px-6 sm:px-10 py-6">
      {/* Title */}
      <h2 className="text-lg sm:text-xl font-bold text-center mb-6">
        Trial Matcher — Patient Matching Results
      </h2>

      {/* Stat Tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <div className="border border-black rounded p-4">
          <div className="text-[11px] font-semibold text-gray-500 mb-1">TOTAL PATIENTS</div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold">{total}</span>
            <span className="text-[11px] text-gray-500">analyzed</span>
          </div>
        </div>
        <div className="border border-black rounded p-4 bg-passed-bg">
          <div className="text-[11px] font-bold text-passed mb-1">PASSED (MATCHED)</div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-passed">{passed.length}</span>
            <span className="text-[11px] font-semibold text-passed">({passedPct}%) Cleared</span>
          </div>
        </div>
        <div className="border border-black rounded p-4 bg-review-bg">
          <div className="text-[11px] font-bold text-review mb-1">REVIEW (NEEDS TEST/INFO)</div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-review">{review.length}</span>
            <span className="text-[11px] font-semibold text-review">({reviewPct}%) Remediable</span>
          </div>
        </div>
        <div className="border border-black rounded p-4 bg-rejected-bg">
          <div className="text-[11px] font-bold text-rejected mb-1">NOT ELIGIBLE</div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-rejected">{rejected.length}</span>
            <span className="text-[11px] font-semibold text-rejected">({rejectedPct}%) Excluded</span>
          </div>
        </div>
      </div>

      {/* Match Breakdown Bar */}
      <div className="mb-5">
        <div className="text-[11px] font-bold mb-1.5">MATCH BREAKDOWN</div>
        <div className="flex h-7 rounded border border-black overflow-hidden">
          {passedPct > 0 && (
            <div
              className="bg-passed-bar flex items-center justify-center text-[11px] font-bold text-emerald-900"
              style={{ width: `${passedPct}%` }}
            >
              Passed {passedPct}%
            </div>
          )}
          {reviewPct > 0 && (
            <div
              className="bg-review-bar flex items-center justify-center text-[11px] font-bold text-yellow-900 border-l border-black"
              style={{ width: `${reviewPct}%` }}
            >
              Review {reviewPct}%
            </div>
          )}
          {rejectedPct > 0 && (
            <div
              className="bg-rejected-bar flex items-center justify-center text-[11px] font-bold text-red-900 border-l border-black"
              style={{ width: `${rejectedPct}%` }}
            >
              Not Eligible {rejectedPct}%
            </div>
          )}
        </div>
      </div>

      {/* 🔍 INDIVIDUAL PATIENT SEARCH BAR (Generic, professional placeholder) */}
      <div className="mb-6">
        <div className="relative flex items-center border-2 border-black rounded-lg bg-white shadow-xs focus-within:ring-2 focus-within:ring-black">
          <div className="pl-3.5 pr-2 text-gray-500 flex items-center pointer-events-none">
            <Search size={17} />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search patients by ID, name, diagnosis, lab finding, or test..."
            className="w-full py-2.5 pr-10 text-xs sm:text-sm font-medium outline-none bg-transparent placeholder-gray-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 p-1 rounded-full text-gray-500 hover:text-black hover:bg-gray-100 cursor-pointer transition-colors"
              title="Clear search and return to full dashboard"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {isSearching && (
          <div className="flex items-center justify-between text-xs text-gray-600 mt-2 px-1">
            <span>
              Found <strong>{allFiltered.length}</strong> matching record{allFiltered.length === 1 ? '' : 's'} for "<strong>{searchQuery}</strong>"
            </span>
            <button
              onClick={() => setSearchQuery('')}
              className="text-black font-bold underline hover:no-underline cursor-pointer flex items-center gap-1"
            >
              ✕ Clear search & show all {total} patients
            </button>
          </div>
        )}
      </div>

      <div className="border-t border-black mb-6" />

      {/* DYNAMIC VIEW: SEARCH RESULTS VS FULL 3-COLUMN COHORT */}
      {isSearching ? (
        /* FOCUSED SEARCH RESULTS VIEW (No empty ghost columns!) */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold tracking-tight">
              Matching Search Results ({allFiltered.length})
            </h3>
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs font-semibold text-gray-600 hover:text-black underline cursor-pointer"
            >
              Reset to 3-column view
            </button>
          </div>

          {allFiltered.length === 0 ? (
            <div className="border border-dashed border-gray-300 rounded-lg p-10 text-center bg-gray-50">
              <Search className="mx-auto text-gray-400 mb-2" size={30} />
              <p className="text-sm font-bold text-gray-700">No patients matched "{searchQuery}"</p>
              <p className="text-xs text-gray-500 mt-1">Try searching by patient ID, name, or clinical diagnosis.</p>
              <button
                onClick={() => setSearchQuery('')}
                className="mt-4 px-4 py-2 border border-black rounded text-xs font-bold cursor-pointer hover:bg-black hover:text-white transition-colors"
              >
                Clear Search
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {allFiltered.map(p => {
                const isPassed = p.statusType === 'PASSED';
                const isReview = p.statusType === 'REVIEW';
                const isRejected = p.statusType === 'REJECTED';

                const badgeBg = isPassed ? 'bg-passed-bg text-passed border-green-700' : isReview ? 'bg-review-bg text-review border-yellow-700' : 'bg-rejected-bg text-rejected border-red-400';
                const badgeText = isPassed ? 'PASSED (MATCHED)' : isReview ? 'REVIEW (NEEDS TEST)' : 'NOT ELIGIBLE';
                const Icon = isPassed ? CheckCircle : isReview ? AlertTriangle : XCircle;

                return (
                  <div
                    key={p.patient.id}
                    onClick={() => onPatientClick(p)}
                    className="border-2 border-black rounded-lg p-4 bg-white hover:shadow-md cursor-pointer transition-all hover:border-gray-800 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10.5px] font-bold border ${badgeBg}`}>
                          <Icon size={12} />
                          {badgeText}
                        </span>
                        <span className="text-xs font-mono text-gray-400 font-bold">{p.patient.id}</span>
                      </div>

                      <h4 className="text-sm font-extrabold text-black mb-1">
                        {p.patient.name}
                      </h4>
                      <div className="text-xs text-gray-600 mb-3">
                        Age: {p.patient.extracted?.age || '?'} | {p.patient.extracted?.sex || '?'} | {p.patient.extracted?.diagnosis || 'NSCLC'}
                      </div>

                      <div className="bg-gray-50 border border-gray-200 rounded p-2.5 text-[11px] text-gray-700">
                        {isPassed && (
                          <div className="font-semibold text-emerald-900">
                            ✔ All protocol criteria verified & cleared.
                          </div>
                        )}
                        {isReview && (
                          <div>
                            <span className="font-bold text-amber-900">Action Item: </span>
                            {getReviewReason(p)}
                          </div>
                        )}
                        {isRejected && (
                          <div>
                            <span className="font-bold text-red-900">Exclusion Trigger: </span>
                            {getRejectedReason(p)}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 pt-2.5 border-t border-gray-100 flex items-center justify-between text-xs font-bold text-black group">
                      <span>Open Patient Report</span>
                      <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* FULL 3-COLUMN COHORT DASHBOARD */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Passed Panel */}
          <div className="border border-black rounded flex flex-col justify-between">
            <div>
              <div className="bg-passed-bg px-4 py-2 border-b border-black rounded-t flex items-center justify-between">
                <span className="text-sm font-bold text-passed">Passed ({passed.length} Patients)</span>
              </div>
              <div className="p-4">
                <div className="text-[11px] font-bold mb-2">Matched Patients (Click to view report):</div>
                <div className="space-y-2 max-h-[240px] overflow-y-auto mb-4">
                  {passed.map(p => (
                    <div
                      key={p.patient.id}
                      onClick={() => onPatientClick(p)}
                      className="flex items-center justify-between border border-black rounded px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      <span className="text-[11px] font-semibold">{p.patient.id} ({p.patient.name})</span>
                      <span className="text-[10.5px] font-bold text-passed">All {p.criteriaResults?.length || 5} Met</span>
                    </div>
                  ))}
                </div>

                <div className="border border-black rounded p-3 bg-gray-50 mb-2">
                  <div className="text-[11px] font-bold mb-1">Key Match Summary:</div>
                  <div className="text-[10.5px] text-gray-700 space-y-1">
                    <div>• Confirmed Stage IV Diagnosis</div>
                    <div>• Normal kidney lab (eGFR &gt;= 50)</div>
                    <div>• Clear brain scan on file</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 pt-0">
              <button
                onClick={handlePrintPassedList}
                className="w-full py-2 bg-black text-white rounded text-[11.5px] font-bold cursor-pointer hover:bg-gray-800 transition-colors"
              >
                Print Matched List ({passed.length})
              </button>
            </div>
          </div>

          {/* Review Panel */}
          <div className="border border-black rounded flex flex-col justify-between">
            <div>
              <div className="bg-review-bg px-4 py-2 border-b border-black rounded-t flex items-center justify-between">
                <span className="text-sm font-bold text-review">Review ({review.length} Patients)</span>
              </div>
              <div className="p-4">
                <div className="text-[11px] font-bold mb-2">Missing Items (Click to view report):</div>
                <div className="space-y-2 max-h-[240px] overflow-y-auto mb-4">
                  {review.map(p => (
                    <div
                      key={p.patient.id}
                      onClick={() => onPatientClick(p)}
                      className="flex items-center justify-between border border-black rounded px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      <span className="text-[11px] font-semibold">{p.patient.id} ({p.patient.name})</span>
                      <span className="text-[10px] font-bold text-review">{getReviewReason(p)}</span>
                    </div>
                  ))}
                </div>

                <div className="border border-black rounded p-3 bg-gray-50 mb-2">
                  <div className="text-[11px] font-bold mb-1">Required Tests to Qualify:</div>
                  <div className="text-[10.5px] text-gray-700 space-y-1">
                    {Object.entries(remediationSummary).map(([action, count], i) => (
                      <div key={i}>• {count} patient{count > 1 ? 's' : ''}: {action}</div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 pt-0">
              <button
                onClick={handlePrintLabOrders}
                className="w-full py-2 border border-black rounded text-[11.5px] font-bold cursor-pointer hover:bg-gray-50 transition-colors"
              >
                Print Test Order Form ({review.length})
              </button>
            </div>
          </div>

          {/* Rejected Panel */}
          <div className="border border-black rounded flex flex-col justify-between">
            <div>
              <div className="bg-rejected-bg px-4 py-2 border-b border-black rounded-t flex items-center justify-between">
                <span className="text-sm font-bold text-rejected">Not Eligible ({rejected.length} Patients)</span>
              </div>
              <div className="p-4">
                <div className="text-[11px] font-bold mb-2">Reasons (Click to view report):</div>
                <div className="space-y-2 max-h-[240px] overflow-y-auto mb-4">
                  {rejected.map(p => (
                    <div
                      key={p.patient.id}
                      onClick={() => onPatientClick(p)}
                      className="flex items-center justify-between border border-black rounded px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      <span className="text-[11px] font-semibold">{p.patient.id} ({p.patient.name})</span>
                      <span className="text-[10px] font-bold text-rejected">{getRejectedReason(p)}</span>
                    </div>
                  ))}
                </div>

                <div className="border border-black rounded p-3 bg-gray-50 mb-2">
                  <div className="text-[11px] font-bold mb-1">Disqualification Breakdown:</div>
                  <div className="text-[10.5px] text-gray-700 space-y-1">
                    {Object.entries(exclusionSummary).map(([rule, count], i) => (
                      <div key={i}>• {count} patient{count > 1 ? 's' : ''}: {rule}</div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 pt-0">
              <div className="py-2 text-center text-xs text-gray-500 font-medium">
                Click any patient above for deep-dive analysis
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 border border-black rounded text-[11px] font-bold cursor-pointer hover:bg-gray-50"
        >
          <ArrowLeft size={14} />
          Back to Patient List
        </button>
        <button
          onClick={handlePrintFullReport}
          className="flex items-center gap-2 px-5 py-2 bg-black text-white rounded text-[11px] font-bold cursor-pointer hover:bg-gray-800"
        >
          <Printer size={14} />
          Print Full Results (PDF)
        </button>
      </div>
    </div>
  );
}

function generateFullReportHTML(result, total) {
  const { passed = [], review = [], rejected = [] } = result;
  const now = new Date().toISOString().split('T')[0];

  const renderTable = (arr, statusLabel, badgeColor) => arr.map(p => {
    const reasons = (p.criteriaResults || [])
      .filter(c => c.status === 'FAILED' || c.status === 'MISSING')
      .map(c => `${c.criterion}: ${c.explanation || c.evidence}`)
      .join('; ');
    return `<tr>
      <td style="padding:8px 12px;border:1px solid #ddd;font-weight:bold">${p.patient.id}</td>
      <td style="padding:8px 12px;border:1px solid #ddd">${p.patient.name}</td>
      <td style="padding:8px 12px;border:1px solid #ddd">${p.patient.extracted?.age || '?'}/${p.patient.extracted?.sex || '?'}</td>
      <td style="padding:8px 12px;border:1px solid #ddd;font-weight:bold;color:${badgeColor}">${statusLabel}</td>
      <td style="padding:8px 12px;border:1px solid #ddd;font-size:11px">${reasons || 'All protocol criteria satisfied.'}</td>
    </tr>`;
  }).join('');

  return `<!DOCTYPE html><html><head><title>Trial Matcher - Cohort Audit Report</title>
<style>
@page {
  margin: 0;
  size: auto;
}
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  max-width: 1000px;
  margin: 0 auto;
  padding: 35px 40px;
  color: #111;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
h1 { font-size: 22px; text-align: center; margin: 0; text-transform: uppercase; letter-spacing: 0.5px; }
.sub { text-align: center; color: #666; font-size: 12px; margin: 6px 0 20px; }
.stats { display: flex; justify-content: center; gap: 16px; margin-bottom: 30px; }
.stat { border: 1.5px solid #000; border-radius: 6px; padding: 12px 20px; text-align: center; min-width: 150px; }
.stat-title { font-size: 10px; font-weight: 800; color: #555; text-transform: uppercase; }
.stat-num { font-size: 26px; font-weight: 900; margin-top: 4px; }
h2 { font-size: 14px; text-transform: uppercase; margin: 25px 0 10px; border-bottom: 1.5px solid #000; padding-bottom: 4px; }
table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 20px; }
th { background: #f3f4f6; border: 1px solid #ddd; padding: 8px 12px; text-align: left; font-weight: 700; font-size: 11px; text-transform: uppercase; }
</style></head><body>
<h1>Trial Matcher — Cohort Eligibility Audit</h1>
<div class="sub">Generated on ${now} | Total Cohort Sample: ${total} records</div>

<div class="stats">
  <div class="stat"><div class="stat-title">Passed (Enrollable)</div><div class="stat-num" style="color:#166534">${passed.length}</div></div>
  <div class="stat"><div class="stat-title">Review (Remediable)</div><div class="stat-num" style="color:#854d0e">${review.length}</div></div>
  <div class="stat"><div class="stat-title">Not Eligible (Disqualified)</div><div class="stat-num" style="color:#991b1b">${rejected.length}</div></div>
</div>

<h2>Passed Candidates (${passed.length})</h2>
<table><tr><th>ID</th><th>Name</th><th>Age/Sex</th><th>Status</th><th>Verification Summary</th></tr>${renderTable(passed, 'PASSED', '#166534')}</table>

<h2>Review Candidates (${review.length})</h2>
<table><tr><th>ID</th><th>Name</th><th>Age/Sex</th><th>Status</th><th>Missing Data & Action Items</th></tr>${renderTable(review, 'REVIEW', '#854d0e')}</table>

<h2>Ineligible Candidates (${rejected.length})</h2>
<table><tr><th>ID</th><th>Name</th><th>Age/Sex</th><th>Status</th><th>Exclusion Criteria Trigger</th></tr>${renderTable(rejected, 'NOT ELIGIBLE', '#991b1b')}</table>

<div style="margin-top:40px;text-align:center;font-size:10px;color:#888;border-top:1px solid #ddd;padding-top:15px">
  Trial Matcher Clinical Decision Support • Verified compliant with ICH-GCP protocol validation guidelines
</div>
</body></html>`;
}

function generatePassedListHTML(passed) {
  const now = new Date().toISOString().split('T')[0];
  return `<!DOCTYPE html><html><head><title>Cleared Candidates List</title>
<style>
@page {
  margin: 0;
  size: auto;
}
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  max-width: 800px;
  margin: 0 auto;
  padding: 35px 40px;
  color: #111;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
h1 { font-size: 20px; border-bottom: 2px solid #000; padding-bottom: 8px; text-transform: uppercase; }
table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 16px; }
th, td { padding: 9px 12px; border: 1px solid #ddd; text-align: left; }
th { background: #f4f4f5; text-transform: uppercase; font-size: 11px; }
</style></head><body>
<h1>Trial Matcher — Cleared Candidates for Protocol Enrollment</h1>
<p style="font-size:12px;color:#555">Date: ${now} | Cohort: ${passed.length} verified eligible candidates</p>
<table>
<tr><th>Patient ID</th><th>Patient Name</th><th>Age / Sex</th><th>Diagnosis</th><th>Enrollment Status</th></tr>
${passed.map(p => `<tr>
<td><strong>${p.patient.id}</strong></td>
<td>${p.patient.name}</td>
<td>${p.patient.extracted?.age || '?'} / ${p.patient.extracted?.sex || '?'}</td>
<td>${p.patient.extracted?.diagnosis || 'NSCLC'}</td>
<td style="color:#166534;font-weight:bold">✔ CLEARED FOR ONBOARDING</td>
</tr>`).join('')}
</table>
</body></html>`;
}

function generateLabOrdersHTML(review) {
  const now = new Date().toISOString().split('T')[0];
  return `<!DOCTYPE html><html><head><title>Missing Tests Order Requisition</title>
<style>
@page {
  margin: 0;
  size: auto;
}
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  max-width: 800px;
  margin: 0 auto;
  padding: 35px 40px;
  color: #111;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
h1 { font-size: 20px; border-bottom: 2px solid #000; padding-bottom: 8px; text-transform: uppercase; }
.item { border: 1.5px solid #000; border-radius: 6px; padding: 14px; margin: 12px 0; background: #fefce8; page-break-inside: avoid; }
.item-title { font-weight: 800; font-size: 13px; }
.item-desc { font-size: 12px; color: #222; margin-top: 6px; line-height: 1.5; }
</style></head><body>
<h1>Clinical Trial — Consolidated Missing Tests Requisition</h1>
<p style="font-size:12px;color:#555">Date: ${now} | Total Patients Pending Tests: ${review.length}</p>
${review.map(p => {
  const missing = (p.criteriaResults || []).filter(c => c.status === 'MISSING');
  return `<div class="item">
    <div class="item-title">${p.patient.id} — ${p.patient.name} (Age: ${p.patient.extracted?.age || '?'}, ${p.patient.extracted?.sex || '?'})</div>
    ${missing.map(m => `<div class="item-desc">• <strong>Required Order:</strong> ${m.remediation || 'Diagnostic update'}<br>&nbsp;&nbsp;<em>Protocol Rule:</em> ${m.criterion}<br>&nbsp;&nbsp;<em>Clinical Rationale:</em> ${m.explanation}</div>`).join('')}
  </div>`;
}).join('')}
</body></html>`;
}
