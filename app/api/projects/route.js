const { connect } = require('../../../lib/db');
const Project = require('../../../models/Project');
const Activity = require('../../../models/Activity');
const { requireUser, jsonResponse } = require('../../../lib/auth');
const { z } = require('zod');

export async function GET(req) {
  try {
    const { response } = await requireUser(req);
    if (response) return response;
    await connect();
    const projects = await Project.find().lean();
    return jsonResponse({ projects }, 200);
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ message: 'Server error' }), { status: 500 });
  }
}

const projectSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  clientId: z.string().optional(),
  employeeIds: z.array(z.string()).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export async function POST(req) {
  try {
    const { user, response } = await requireUser(req, ['ADMIN']);
    if (response) return response;

    const json = await req.json();
    const parsed = projectSchema.safeParse(json);
    if (!parsed.success) return jsonResponse({ message: 'Invalid input' }, 400);
    await connect();
    const proj = await Project.create(parsed.data);
    await Activity.create({ projectId: proj._id, actorId: user._id, type: 'PROJECT_CREATED', description: 'Project created' });
    return jsonResponse({ project: proj }, 201);
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ message: 'Server error' }), { status: 500 });
  }
}
