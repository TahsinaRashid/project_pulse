function clamp(v, a = 0, b = 100) {
  return Math.max(a, Math.min(b, v));
}

function avg(arr) {
  if (!arr || arr.length === 0) return null;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function timelinePerformance(project, checkins = []) {
  if (!project || !project.startDate || !project.endDate) return 100;
  const start = new Date(project.startDate).getTime();
  const end = new Date(project.endDate).getTime();
  if (isNaN(start) || isNaN(end) || end <= start) {
    // zero-duration or invalid: treat timeline as neutral
    return 100;
  }
  const now = Date.now();
  const expected = clamp(((now - start) / (end - start)) * 100, 0, 100);
  const completionValues = checkins.map((c) => Number(c.completionPercentage || 0));
  const actual = completionValues.length ? avg(completionValues) : 0;
  // performance = actual / expected * 100, but handle expected==0
  if (expected === 0) {
    return actual >= 5 ? 100 : 0;
  }
  const perf = (actual / expected) * 100;
  return clamp(perf);
}

function clientIssuesScore(issueCount) {
  if (!issueCount) return 100;
  if (issueCount === 1) return 70;
  if (issueCount === 2) return 40;
  return 0;
}

function openRisksScore(risks = []) {
  // apply penalties per open risk severity
  let penalty = 0;
  risks.forEach((r) => {
    if (r.status !== 'OPEN') return;
    if (r.severity === 'HIGH') penalty += 30;
    else if (r.severity === 'MEDIUM') penalty += 15;
    else penalty += 5;
  });
  const score = clamp(100 - penalty, 0, 100);
  return score;
}

function computeHealth({ project = {}, feedbacks = [], checkins = [], risks = [] } = {}) {
  // Client Satisfaction 25%
  const satisfactionVals = feedbacks.map((f) => Number(f.satisfactionRating || 0)).filter(Boolean);
  const clientSatisfaction = satisfactionVals.length ? (avg(satisfactionVals) / 5) * 100 : 100;

  // Employee Confidence 20%
  const confidenceVals = checkins.map((c) => Number(c.confidenceLevel || 0)).filter(Boolean);
  const employeeConfidence = confidenceVals.length ? (avg(confidenceVals) / 5) * 100 : 100;

  // Timeline Performance 30%
  const timelinePerf = timelinePerformance(project, checkins);

  // Client Issues 10%
  const issueCount = feedbacks.filter((f) => f.issueFlagged).length;
  const clientIssues = clientIssuesScore(issueCount);

  // Open Risks 15%
  const openRisks = openRisksScore(risks);

  const score =
    (clientSatisfaction * 0.25 +
      employeeConfidence * 0.2 +
      timelinePerf * 0.3 +
      clientIssues * 0.1 +
      openRisks * 0.15) | 0;

  const finalScore = clamp(Math.round(score));

  let status = 'CRITICAL';
  if (finalScore >= 80) status = 'ON_TRACK';
  else if (finalScore >= 60) status = 'AT_RISK';

  if (project.status === 'COMPLETED') status = 'COMPLETED';

  return { score: finalScore, status };
}

module.exports = { computeHealth };
