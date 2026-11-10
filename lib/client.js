const { ObjectId, getCollection } = require('./db');
const Project = require('../models/Project');

let feedbackIndexPromise;

async function ensureClientFeedbackUniqueIndex() {
  if (!feedbackIndexPromise) {
    feedbackIndexPromise = getCollection('clientFeedback').then((collection) =>
      collection.createIndex(
        { projectId: 1, clientId: 1, weekStartDate: 1 },
        { unique: true, name: 'one_client_feedback_per_project_week' }
      )
    );
  }
  return feedbackIndexPromise;
}

async function getAssignedClientProject(projectId, userId) {
  if (!ObjectId.isValid(String(projectId))) {
    return { project: null, status: 400, message: 'Invalid project ID.' };
  }

  const project = await Project.findById(projectId).lean();
  if (!project) return { project: null, status: 404, message: 'Project not found.' };
  if (project.clientId?.toString() !== userId.toString()) {
    return { project: null, status: 403, message: 'You are not assigned as the client for this project.' };
  }
  return { project, status: 200, message: null };
}

module.exports = { ensureClientFeedbackUniqueIndex, getAssignedClientProject };
