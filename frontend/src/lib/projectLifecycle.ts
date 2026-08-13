export type ProjectStatus = 'pending' | 'in-progress' | 'delayed' | 'completed' | 'cancelled';

export interface LifecycleProject {
  _id: string;
  name: string;
  status: ProjectStatus;
}

export const isProjectOperational = (project?: Pick<LifecycleProject, 'status'>) =>
  Boolean(project && ['in-progress', 'delayed'].includes(project.status));

export const projectLifecycleMessage = (
  project: Pick<LifecycleProject, 'status'>,
  activity = 'add new operational records',
) => {
  if (project.status === 'pending') {
    return `This project is pending. Update it to In Progress before you ${activity}.`;
  }
  if (project.status === 'completed') {
    return `This project is already completed. Historical records remain available, but you cannot ${activity}.`;
  }
  if (project.status === 'cancelled') {
    return `This project was cancelled by the admin. Historical records remain available, but you cannot ${activity}.`;
  }
  return '';
};
