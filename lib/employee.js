const { ObjectId, getCollection } = require('./db');
const Project = require('../models/Project');
const Activity = require('../models/Activity');
const EmployeeCheckIn = require('../models/EmployeeCheckIn');
const ClientFeedback = require('../models/ClientFeedback');
const Risk = require('../models/Risk');
const { computeHealth } = require('./healthScore');

let checkInIndexPromise;

function getIsoWeekStart(value = new Date()) {
  const date = new Date(value);
  date.setUTCHours(0, 0, 0, 0);
  const daysSinceMonday = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - daysSinceMonday);
  return date;
}

async function ensureCheckInUniqueIndex() {
  if (!checkInIndexPromise) {
    checkInIndexPromise = getCollection('employeeCheckIns').then((collection) =>
      collection.createIndex(
        { projectId: 1, employeeId: 1, weekStartDate: 1 },
        { unique: true, name: 'one_employee_checkin_per_project_week' }
      )
    );
  }
  return checkInIndexPromise;
}

async function getAssignedProject(projectId, userId) {
  if (!ObjectId.isValid(String(projectId))) {
    return { project: null, status: 400, message: 'Invalid project ID.' };
  }

  const project = await Project.findById(projectId).lean();
  if (!project) return { project: null, status: 404, message: 'Project not found.' };

  const assigned = (project.employeeIds || []).some((id) => id.toString() === userId.toString());
  if (!assigned) return { project: null, status: 403, message: 'You are not assigned to this project.' };
  return { project, status: 200, message: null };
}

async function recordActivity({ projectId, actorId, type, description }) {
  return Activity.create({
    projectId,
    actorId,
    type,
    description,
    createdAt: new Date(),
  });
}

async function recalculateProjectHealth(projectId, actorId) {
  const [project, checkins, feedbacks, risks] = await Promise.all([
    Project.findById(projectId).lean(),
    EmployeeCheckIn.find({ projectId }).lean(),
    ClientFeedback.find({ projectId }).lean(),
    Risk.find({ projectId }).lean(),
  ]);
  if (!project) return null;

  const previousStatus = project.status;
  const { score, status } = computeHealth({ project, checkins, feedbacks, risks });
  await Project.findByIdAndUpdate(projectId, { healthScore: score, status });

  if (previousStatus !== status) {
    await recordActivity({
      projectId,
      actorId,
      type: 'PROJECT_STATUS_CHANGED',
      description: `Project status changed from ${previousStatus} to ${status}.`,
    });
  }
  return { score, status };
}

module.exports = {
  getIsoWeekStart,
  ensureCheckInUniqueIndex,
  getAssignedProject,
  recordActivity,
  recalculateProjectHealth,
};
