"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { HealthBar, Skeleton, Spinner } from "../../components/UiEffects";

const statusStyles = {
  ON_TRACK: "bg-emerald-100 text-emerald-700",
  AT_RISK: "bg-amber-100 text-amber-700",
  CRITICAL: "bg-rose-100 text-rose-700",
  COMPLETED: "bg-sky-100 text-sky-700",
};

const severityStyles = {
  HIGH: "bg-rose-100 text-rose-700",
  MEDIUM: "bg-amber-100 text-amber-700",
  LOW: "bg-emerald-100 text-emerald-700",
};

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function toDateInputValue(value) {
  try {
    if (!value) return "";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [dashboard, setDashboard] = useState(null);
  const [users, setUsers] = useState({ clients: [], employees: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [savingProject, setSavingProject] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [projectForm, setProjectForm] = useState({
    name: "",
    description: "",
    clientId: "",
    employeeIds: [],
    startDate: "",
    endDate: "",
    status: "ON_TRACK",
  });

  useEffect(() => {
    let cancelled = false;

    const loadDashboard = async () => {
      setRefreshing(true);
      setError("");
      try {
        const [dashboardResponse, usersResponse] = await Promise.all([
          fetch("/api/admin/dashboard", { cache: "no-store" }),
          fetch("/api/admin/users", { cache: "no-store" }),
        ]);

        if (dashboardResponse.status === 401 || usersResponse.status === 401) {
          router.replace("/login");
          return;
        }

        const dashboardData = await dashboardResponse.json();
        const usersData = await usersResponse.json();

        if (!dashboardResponse.ok) {
          throw new Error(dashboardData.message || "Unable to load the admin dashboard.");
        }

        if (!usersResponse.ok) {
          throw new Error(usersData.message || "Unable to load the admin user roster.");
        }

        if (!cancelled) {
          setDashboard(dashboardData);
          setUsers({
            clients: usersData.clients || [],
            employees: usersData.employees || [],
          });
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError.message || "Unable to load the admin dashboard.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };

    loadDashboard();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const stats = dashboard?.stats || {};
  const projects = useMemo(() => dashboard?.projects || [], [dashboard]);
  const recentActivities = dashboard?.recentActivities || [];
  const recentRisks = dashboard?.recentRisks || [];
  const recentCheckins = dashboard?.recentCheckins || [];
  const recentFeedback = dashboard?.recentFeedback || [];
  const user = dashboard?.user;

  const healthSummary = useMemo(() => {
    if (!projects.length) return { average: 0, healthy: 0 };
    const average = Math.round(projects.reduce((sum, project) => sum + (project.healthScore ?? 0), 0) / projects.length);
    const healthy = projects.filter((project) => (project.healthScore ?? 0) >= 80).length;
    return { average, healthy };
  }, [projects]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  };

  const resetProjectForm = () => {
    setProjectForm({
      name: "",
      description: "",
      clientId: "",
      employeeIds: [],
      startDate: "",
      endDate: "",
      status: "ON_TRACK",
    });
    setEditingProjectId(null);
    setFormError("");
  };

  const handleProjectInput = (field, value) => {
    setProjectForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleEmployeeToggle = (employeeId) => {
    setProjectForm((current) => {
      const nextIds = current.employeeIds.includes(employeeId)
        ? current.employeeIds.filter((id) => id !== employeeId)
        : [...current.employeeIds, employeeId];
      return { ...current, employeeIds: nextIds };
    });
  };

  const handleProjectSubmit = async (event) => {
    event.preventDefault();
    setFormError("");
    setSavingProject(true);

    try {
      const payload = {
        ...projectForm,
        employeeIds: projectForm.employeeIds.filter(Boolean),
      };

      const response = await fetch("/api/admin/projects", {
        method: editingProjectId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          id: editingProjectId || undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Unable to save the project.");
      }

      resetProjectForm();
      const refreshed = await fetch("/api/admin/dashboard", { cache: "no-store" });
      const nextDashboard = await refreshed.json();
      if (refreshed.ok) {
        setDashboard(nextDashboard);
      }
    } catch (saveError) {
      setFormError(saveError.message || "Unable to save the project.");
    } finally {
      setSavingProject(false);
    }
  };

  const startEditingProject = (project) => {
    setEditingProjectId(project._id);
    setProjectForm({
      name: project.name || "",
      description: project.description || "",
      clientId: project.client?._id || project.clientId || "",
      employeeIds: project.employees?.map((employee) => employee._id || employee.id) || project.employeeIds || [],
      startDate: toDateInputValue(project.startDate),
      endDate: toDateInputValue(project.endDate),
      status: project.status || "ON_TRACK",
    });
    setFormError("");
  };

  if (loading) {
    return (
      <main aria-label="Loading admin dashboard" className="min-h-screen bg-slate-100 p-6 text-slate-700 md:p-10">
        <div className="mx-auto max-w-7xl space-y-6">
          <Skeleton className="h-28 rounded-2xl" />
          <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]"><Skeleton className="h-96 rounded-2xl" /><Skeleton className="h-96 rounded-2xl" /></div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{[1, 2, 3, 4, 5].map((item) => <Skeleton key={item} className="h-28 rounded-2xl" />)}</div>
        </div>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-900 md:p-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-600">Project Pulse · Admin</p>
            <h1 className="mt-2 text-3xl font-bold">Portfolio overview</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
              {user.name}
            </div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              {refreshing ? "Refreshing..." : "Refresh data"}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
            >
              Log out
            </button>
          </div>
        </header>

        {error && (
          <div role="alert" className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {error}
          </div>
        )}

        <section className="mb-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="text-xl font-semibold">Project management</h2>
              {editingProjectId ? (
                <button type="button" onClick={resetProjectForm} className="text-sm font-medium text-slate-600 hover:text-slate-900">
                  Cancel edit
                </button>
              ) : null}
            </div>

            <form onSubmit={handleProjectSubmit} className={`space-y-4 ${editingProjectId ? "modal-panel" : ""}`}>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-sm text-slate-600">
                  <span className="mb-1.5 block font-medium text-slate-700">Project name</span>
                  <input
                    value={projectForm.name}
                    onChange={(event) => handleProjectInput("name", event.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 outline-none transition focus:border-slate-500 focus:bg-white"
                    placeholder="Quarterly rollout"
                    required
                  />
                </label>

                <label className="block text-sm text-slate-600">
                  <span className="mb-1.5 block font-medium text-slate-700">Status</span>
                  <select
                    value={projectForm.status}
                    onChange={(event) => handleProjectInput("status", event.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 outline-none transition focus:border-slate-500 focus:bg-white"
                  >
                    <option value="ON_TRACK">On track</option>
                    <option value="AT_RISK">At risk</option>
                    <option value="CRITICAL">Critical</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </label>
              </div>

              <label className="block text-sm text-slate-600">
                <span className="mb-1.5 block font-medium text-slate-700">Description</span>
                <textarea
                  value={projectForm.description}
                  onChange={(event) => handleProjectInput("description", event.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 outline-none transition focus:border-slate-500 focus:bg-white"
                  placeholder="Client goals, milestones, and scope."
                />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-sm text-slate-600">
                  <span className="mb-1.5 block font-medium text-slate-700">Assigned client</span>
                  <select
                    value={projectForm.clientId}
                    onChange={(event) => handleProjectInput("clientId", event.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 outline-none transition focus:border-slate-500 focus:bg-white"
                  >
                    <option value="">Select client</option>
                    {users.clients.map((client) => (
                      <option key={client._id} value={client._id}>{client.name}</option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm text-slate-600">
                  <span className="mb-1.5 block font-medium text-slate-700">Start date</span>
                  <input
                    type="date"
                    value={projectForm.startDate}
                    onChange={(event) => handleProjectInput("startDate", event.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 outline-none transition focus:border-slate-500 focus:bg-white"
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-sm text-slate-600">
                  <span className="mb-1.5 block font-medium text-slate-700">End date</span>
                  <input
                    type="date"
                    value={projectForm.endDate}
                    onChange={(event) => handleProjectInput("endDate", event.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 outline-none transition focus:border-slate-500 focus:bg-white"
                  />
                </label>

                <div className="text-sm text-slate-600">
                  <span className="mb-1.5 block font-medium text-slate-700">Assigned employees</span>
                  <div className="max-h-32 overflow-y-auto rounded-xl border border-slate-300 bg-slate-50 p-2">
                    {users.employees.length === 0 ? (
                      <p className="text-xs text-slate-500">No employees available.</p>
                    ) : (
                      users.employees.map((employee) => (
                        <label key={employee._id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-100">
                          <input
                            type="checkbox"
                            checked={projectForm.employeeIds.includes(employee._id)}
                            onChange={() => handleEmployeeToggle(employee._id)}
                          />
                          <span>{employee.name}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {formError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{formError}</div>
              )}

              <button
                type="submit"
                disabled={savingProject}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingProject && <Spinner label="Saving project" />}
                {savingProject ? "Saving..." : editingProjectId ? "Update project" : "Create project"}
              </button>
            </form>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-xl font-semibold">Admin access</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <div className="rounded-xl bg-emerald-50 p-3 text-emerald-800">
                Full access to the system
              </div>
              <div className="rounded-xl bg-slate-100 p-3 text-slate-700">
                Creates and manages projects
              </div>
              <div className="rounded-xl bg-sky-50 p-3 text-sky-800">
                Assigns clients and employees
              </div>
            </div>
          </div>
        </section>

        <section data-reveal-stagger className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard label="Total projects" value={stats.totalProjects ?? 0} detail={`${stats.completedProjects ?? 0} completed`} />
          <MetricCard label="On track" value={stats.onTrackProjects ?? 0} detail={`${healthSummary.healthy ?? 0} healthy`} accent="emerald" />
          <MetricCard label="At risk" value={stats.atRiskProjects ?? 0} detail={`${stats.criticalProjects ?? 0} critical`} accent="amber" />
          <MetricCard label="Open risks" value={stats.openRisks ?? 0} detail={`${stats.highSeverityRisks ?? 0} high severity`} accent="rose" />
          <MetricCard label="Avg health" value={`${healthSummary.average ?? 0}%`} detail={`${stats.missingCheckins ?? 0} missing check-ins`} accent="sky" />
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.7fr_1fr]">
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold">Project health overview</h2>
              <Link href="/dashboard" className="text-sm font-medium text-slate-600 hover:text-slate-900">
                View delivery dashboard
              </Link>
            </div>

            <div data-reveal-stagger className="space-y-4">
              {projects.length === 0 ? (
                <p className="text-sm text-slate-500">No projects are available yet.</p>
              ) : (
                projects.map((project, index) => (
                  <article data-reveal style={{ "--reveal-delay": `${index * 55}ms` }} key={project._id} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-800">{project.name}</h3>
                        <p className="mt-1 text-sm text-slate-500">{project.description || "No description provided."}</p>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                          {project.client ? <span className="rounded-full bg-slate-100 px-2 py-1">Client: {project.client.name}</span> : null}
                          {project.employees?.length ? <span className="rounded-full bg-slate-100 px-2 py-1">Team: {project.employees.length} members</span> : null}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => startEditingProject(project)} className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
                          Edit
                        </button>
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[project.computedStatus] || "bg-slate-100 text-slate-700"}`}>
                          {project.computedStatus || project.status || "ON_TRACK"}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-4">
                      <MiniStat label="Health" value={`${project.healthScore ?? 0}%`} />
                      <MiniStat label="Open risks" value={project.openRiskCount ?? 0} />
                      <MiniStat label="Flagged issues" value={project.flaggedIssueCount ?? 0} />
                      <MiniStat label="Last check-in" value={project.lastCheckin ? formatDate(project.lastCheckin.createdAt || project.lastCheckin.weekStartDate) : "No data"} />
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>

          <aside className="space-y-6">
            <Panel title="High-risk projects">
              {projects.filter((project) => project.computedStatus !== "ON_TRACK" || (project.openRiskCount ?? 0) > 0).length === 0 ? (
                <p className="text-sm text-slate-500">No active risks across the portfolio.</p>
              ) : (
                <div className="space-y-3">
                  {projects
                    .filter((project) => project.computedStatus !== "ON_TRACK" || (project.openRiskCount ?? 0) > 0)
                    .slice(0, 5)
                    .map((project) => (
                      <div key={project._id} className="rounded-xl bg-slate-50 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium text-slate-800">{project.name}</p>
                          <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${statusStyles[project.computedStatus] || "bg-slate-100 text-slate-700"}`}>
                            {project.computedStatus || project.status}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">{project.openRiskCount ?? 0} open risks · {project.highRiskCount ?? 0} high severity</p>
                      </div>
                    ))}
                </div>
              )}
            </Panel>

            <Panel title="Missing check-ins">
              {projects.filter((project) => project.missingCheckin).length === 0 ? (
                <p className="text-sm text-slate-500">All teams are current.</p>
              ) : (
                <div className="space-y-2">
                  {projects.filter((project) => project.missingCheckin).slice(0, 5).map((project) => (
                    <div key={project._id} className="flex items-center justify-between rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
                      <span>{project.name}</span>
                      <span className="font-semibold">Needs update</span>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </aside>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-3">
          <Panel title="Recent risks">
            {recentRisks.length === 0 ? (
              <p className="text-sm text-slate-500">No risks have been raised.</p>
            ) : (
              <div className="space-y-3">
                {recentRisks.slice(0, 5).map((risk) => (
                  <div key={risk._id} className="rounded-xl border border-slate-200 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-slate-800">{risk.title}</p>
                      <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${severityStyles[risk.severity] || "bg-slate-100 text-slate-700"}`}>
                        {risk.severity}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{risk.projectId?.name || "Project"}</p>
                    <p className="mt-2 text-xs text-slate-400">{formatDate(risk.createdAt)}</p>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Latest check-ins">
            {recentCheckins.length === 0 ? (
              <p className="text-sm text-slate-500">No check-ins submitted yet.</p>
            ) : (
              <div className="space-y-3">
                {recentCheckins.slice(0, 5).map((checkin) => (
                  <div key={checkin._id} className="rounded-xl border border-slate-200 p-3">
                    <p className="font-medium text-slate-800">{checkin.projectId?.name || "Project"}</p>
                    <p className="mt-1 text-xs text-slate-500">{checkin.progressSummary || "Progress update submitted"}</p>
                    <p className="mt-2 text-xs text-slate-400">{checkin.completionPercentage ?? 0}% complete · confidence {checkin.confidenceLevel ?? "—"}/5</p>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Recent activity">
            {recentActivities.length === 0 ? (
              <p className="text-sm text-slate-500">No recent activity.</p>
            ) : (
              <div className="space-y-3">
                {recentActivities.slice(0, 5).map((activity) => (
                  <div key={activity._id} className="rounded-xl border border-slate-200 p-3">
                    <p className="text-sm font-medium text-slate-800">{activity.type}</p>
                    <p className="mt-1 text-xs text-slate-500">{activity.description}</p>
                    <p className="mt-2 text-[11px] text-slate-400">{formatDate(activity.createdAt)} · {formatTime(activity.createdAt)}</p>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <Panel title="Client feedback">
            {recentFeedback.length === 0 ? (
              <p className="text-sm text-slate-500">No client feedback has been received.</p>
            ) : (
              <div className="space-y-3">
                {recentFeedback.slice(0, 5).map((feedback) => (
                  <div key={feedback._id} className={`rounded-xl border p-3 ${feedback.issueFlagged ? "border-rose-200 bg-rose-50" : "border-slate-200 bg-slate-50"}`}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-slate-800">{feedback.projectId?.name || "Project"}</p>
                      {feedback.issueFlagged ? <span className="rounded-full bg-rose-100 px-2 py-1 text-[10px] font-semibold text-rose-700">Issue flagged</span> : null}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{feedback.comments || "Feedback submitted."}</p>
                    <p className="mt-2 text-xs text-slate-400">Satisfaction {feedback.satisfactionRating ?? "—"}/5</p>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Portfolio snapshot">
            <div className="space-y-4">
              <div>
                <p className="text-sm text-slate-500">Average health score</p>
                <p className="mt-1 text-3xl font-bold text-slate-800">{healthSummary.average ?? 0}%</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Projects in good health</p>
                <p className="mt-1 text-3xl font-bold text-emerald-600">{healthSummary.healthy ?? 0}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">High-severity open risks</p>
                <p className="mt-1 text-3xl font-bold text-rose-600">{stats.highSeverityRisks ?? 0}</p>
              </div>
            </div>
          </Panel>
        </section>
      </div>
    </main>
  );
}

function MetricCard({ label, value, detail, accent = "slate" }) {
  const accentStyles = {
    slate: "bg-slate-100 text-slate-700",
    emerald: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    rose: "bg-rose-100 text-rose-700",
    sky: "bg-sky-100 text-sky-700",
  };

  return (
    <div data-reveal className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <p className="text-sm text-slate-500">{label}</p>
      <div className={`mt-4 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${accentStyles[accent] || accentStyles.slate}`}>
        {value}
      </div>
      <p className="mt-2 text-xs text-slate-500">{detail}</p>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-[11px] uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-base font-semibold text-slate-800">{value}</p>
      {label === "Health" && <div className="mt-2"><HealthBar value={Number.parseInt(value, 10)} /></div>}
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <h2 className="mb-4 text-xl font-semibold">{title}</h2>
      {children}
    </div>
  );
}
