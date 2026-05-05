import { phases, TaskStatus } from "./data";

function getStatusColor(status: TaskStatus) {
  switch (status) {
    case "done": return "bg-emerald-500";
    case "in-progress": return "bg-amber-500";
    case "pending": return "bg-zinc-700";
    case "blocked": return "bg-red-500/70";
  }
}

function getStatusLabel(status: TaskStatus) {
  switch (status) {
    case "done": return "Done";
    case "in-progress": return "In Progress";
    case "pending": return "Pending";
    case "blocked": return "Blocked";
  }
}

function ProgressBar({ tasks }: { tasks: { status: TaskStatus }[] }) {
  const total = tasks.length;
  const done = tasks.filter(t => t.status === "done").length;
  const inProgress = tasks.filter(t => t.status === "in-progress").length;
  const pct = Math.round((done / total) * 100);

  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-zinc-400 mb-1">
        <span>{done}/{total} tasks</span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden flex">
        {done > 0 && (
          <div className="bg-emerald-500 h-full transition-all" style={{ width: `${(done / total) * 100}%` }} />
        )}
        {inProgress > 0 && (
          <div className="bg-amber-500 h-full transition-all" style={{ width: `${(inProgress / total) * 100}%` }} />
        )}
      </div>
    </div>
  );
}

export default function Home() {
  const totalTasks = phases.reduce((sum, p) => sum + p.tasks.length, 0);
  const doneTasks = phases.reduce((sum, p) => sum + p.tasks.filter(t => t.status === "done").length, 0);
  const inProgressTasks = phases.reduce((sum, p) => sum + p.tasks.filter(t => t.status === "in-progress").length, 0);
  const blockedTasks = phases.reduce((sum, p) => sum + p.tasks.filter(t => t.status === "blocked").length, 0);
  const overallPct = Math.round((doneTasks / totalTasks) * 100);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="border-b border-zinc-800 sticky top-0 bg-zinc-950/90 backdrop-blur-sm z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">LNM Platform</h1>
            <p className="text-sm text-zinc-500">Multi-Agent SEO Ecosystem</p>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-zinc-400">{doneTasks} done</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-zinc-400">{inProgressTasks} active</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500/70" />
              <span className="text-zinc-400">{blockedTasks} blocked</span>
            </div>
          </div>
        </div>
      </header>

      {/* Overall Progress */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Overall Progress</h2>
            <span className="text-3xl font-bold text-emerald-400">{overallPct}%</span>
          </div>
          <div className="h-3 bg-zinc-800 rounded-full overflow-hidden flex">
            <div className="bg-emerald-500 h-full transition-all" style={{ width: `${(doneTasks / totalTasks) * 100}%` }} />
            <div className="bg-amber-500 h-full transition-all" style={{ width: `${(inProgressTasks / totalTasks) * 100}%` }} />
          </div>
          <div className="mt-3 text-sm text-zinc-500">
            {doneTasks} of {totalTasks} tasks completed
          </div>
        </div>

        {/* Phase Cards */}
        <div className="grid gap-6">
          {phases.map((phase) => (
            <div key={phase.id} className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
              <div className="p-5 border-b border-zinc-800">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-base">{phase.title}</h3>
                    <p className="text-sm text-zinc-500 mt-0.5">{phase.description}</p>
                  </div>
                </div>
                <div className="mt-3">
                  <ProgressBar tasks={phase.tasks} />
                </div>
              </div>
              <div className="divide-y divide-zinc-800/50">
                {phase.tasks.map((task) => (
                  <div key={task.id} className="px-5 py-3 flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${getStatusColor(task.status)}`} />
                    <span className={`text-sm flex-1 ${task.status === "done" ? "text-zinc-500 line-through" : "text-zinc-200"}`}>
                      {task.title}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      task.status === "done" ? "bg-emerald-500/10 text-emerald-400" :
                      task.status === "in-progress" ? "bg-amber-500/10 text-amber-400" :
                      task.status === "blocked" ? "bg-red-500/10 text-red-400" :
                      "bg-zinc-800 text-zinc-500"
                    }`}>
                      {getStatusLabel(task.status)}
                    </span>
                    {task.blockedBy && (
                      <span className="text-xs text-red-400/70 italic">{task.blockedBy}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <footer className="mt-12 pb-8 text-center text-xs text-zinc-600">
          Late Night Millionaires — Michael + Sardar
        </footer>
      </div>
    </div>
  );
}
