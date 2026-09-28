const { connect } = require('../lib/db');
const { hashPassword } = require('../lib/auth');
const User = require('../models/User');
const Project = require('../models/Project');
const CheckIn = require('../models/EmployeeCheckIn');
const Feedback = require('../models/ClientFeedback');
const Risk = require('../models/Risk');
const Activity = require('../models/Activity');

async function seed() {
  await connect();

  await Promise.all([
    User.deleteMany({}),
    Project.deleteMany({}),
    CheckIn.deleteMany({}),
    Feedback.deleteMany({}),
    Risk.deleteMany({}),
    Activity.deleteMany({}),
  ]);

  const admin = await User.create({
    name: 'Admin User',
    email: 'admin@example.com',
    passwordHash: await hashPassword('password123'),
    role: 'ADMIN',
  });

  const employee1 = await User.create({
    name: 'Employee One',
    email: 'employee1@example.com',
    passwordHash: await hashPassword('password123'),
    role: 'EMPLOYEE',
  });

  const employee2 = await User.create({
    name: 'Employee Two',
    email: 'employee2@example.com',
    passwordHash: await hashPassword('password123'),
    role: 'EMPLOYEE',
  });

  const client1 = await User.create({
    name: 'Client One',
    email: 'client1@example.com',
    passwordHash: await hashPassword('password123'),
    role: 'CLIENT',
  });

  const client2 = await User.create({
    name: 'Client Two',
    email: 'client2@example.com',
    passwordHash: await hashPassword('password123'),
    role: 'CLIENT',
  });

  // Create projects
  const now = new Date();
  const p1 = await Project.create({
    name: 'Project Alpha',
    description: 'Important integration',
    clientId: client1._id,
    employeeIds: [employee1._id],
    startDate: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 14),
    endDate: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 30),
    status: 'ON_TRACK',
  });

  const p2 = await Project.create({
    name: 'Project Beta',
    description: 'Redesign',
    clientId: client2._id,
    employeeIds: [employee1._id, employee2._id],
    startDate: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 40),
    endDate: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 2),
    status: 'AT_RISK',
  });

  const p3 = await Project.create({
    name: 'Project Gamma',
    description: 'Maintenance',
    clientId: client1._id,
    employeeIds: [employee2._id],
    startDate: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 70),
    endDate: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 1),
    status: 'CRITICAL',
  });

  // Checkins for project alpha
  await CheckIn.create({
    projectId: p1._id,
    employeeId: employee1._id,
    weekStartDate: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 7),
    progressSummary: 'Completed initial integration',
    blockers: '',
    confidenceLevel: 4,
    completionPercentage: 30,
  });

  // Feedbacks
  await Feedback.create({
    projectId: p1._id,
    clientId: client1._id,
    weekStartDate: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 7),
    satisfactionRating: 5,
    communicationRating: 5,
    comments: 'Great progress',
    issueFlagged: false,
  });

  // Risks
  await Risk.create({
    projectId: p2._id,
    createdBy: employee2._id,
    title: 'API instability',
    severity: 'HIGH',
    mitigationPlan: 'Add retries and fallback',
    status: 'OPEN',
  });

  // Activities
  await Activity.create({ projectId: p1._id, actorId: employee1._id, type: 'PROJECT_CREATED', description: 'Created project' });

  console.log('Seeding complete');
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
