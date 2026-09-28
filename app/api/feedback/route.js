const { connect } = require('../../../lib/db');
const ClientFeedback = require('../../../models/ClientFeedback');
const Activity = require('../../../models/Activity');
const Project = require('../../../models/Project');
const { requireUser, jsonResponse } = require('../../../lib/auth');
const { computeHealth } = require('../../../lib/healthScore');
const { z } = require('zod');

const bodySchema = z.object({
  projectId: z.string().min(1),
  satisfactionRating: z.number().min(1).max(5),
  communicationRating: z.number().min(1).max(5),
  comments: z.string().optional(),
  issueFlagged: z.boolean().optional(),
  weekStartDate: z.string().optional(),
});

export async function GET(req) {
  try {
    const { response } = await requireUser(req);
    if (response) return response;
    await connect();
    const list = await ClientFeedback.find().lean();
    return jsonResponse({ feedback: list }, 200);
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ message: 'Server error' }), { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { user, response } = await requireUser(req, ['CLIENT']);
    if (response) return response;

    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) return jsonResponse({ message: 'Invalid input' }, 400);
    const { projectId, satisfactionRating, communicationRating, comments, issueFlagged, weekStartDate } = parsed.data;
    await connect();
    const weekStart = weekStartDate ? new Date(weekStartDate) : new Date();
    try {
      const created = await ClientFeedback.create({
        projectId,
        clientId: user._id,
        weekStartDate: weekStart,
        satisfactionRating,
        communicationRating,
        comments,
        issueFlagged: !!issueFlagged,
      });
      await Activity.create({ projectId, actorId: user._id, type: 'FEEDBACK_SUBMITTED', description: 'Client feedback submitted' });

      const [project, checkins, feedbacks, risks] = await Promise.all([
        Project.findById(projectId).lean(),
        require('../../../models/EmployeeCheckIn').find({ projectId }).lean(),
        ClientFeedback.find({ projectId }).lean(),
        require('../../../models/Risk').find({ projectId }).lean(),
      ]);
      const { score, status } = computeHealth({ project, checkins, feedbacks, risks });
      await Project.findByIdAndUpdate(projectId, { healthScore: score, status });

      return jsonResponse({ feedback: created }, 201);
    } catch (err) {
      if (err.code === 11000) {
        return jsonResponse({ message: 'Duplicate feedback for the week' }, 409);
      }
      throw err;
    }
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ message: 'Server error' }), { status: 500 });
  }
}
