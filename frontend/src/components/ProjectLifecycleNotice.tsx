import { Clock3, LockKeyhole } from 'lucide-react';
import {
  isProjectOperational,
  projectLifecycleMessage,
  type LifecycleProject,
} from '../lib/projectLifecycle';

const ProjectLifecycleNotice = ({ project, activity }: {
  project?: LifecycleProject;
  activity?: string;
}) => {
  if (!project || isProjectOperational(project)) return null;
  const pending = project.status === 'pending';
  const Icon = pending ? Clock3 : LockKeyhole;

  return (
    <div className={`flex items-start gap-3 rounded-2xl border px-4 py-4 ${
      pending
        ? 'border-amber-200 bg-amber-50 text-amber-800'
        : 'border-slate-300 bg-slate-100 text-slate-700'
    }`} role="status">
      <Icon className="mt-0.5 h-5 w-5 shrink-0" />
      <div>
        <p className="font-bold">{pending ? 'Project is not active yet' : 'Project is read-only'}</p>
        <p className="mt-1 text-sm leading-5">{projectLifecycleMessage(project, activity)}</p>
      </div>
    </div>
  );
};

export default ProjectLifecycleNotice;
