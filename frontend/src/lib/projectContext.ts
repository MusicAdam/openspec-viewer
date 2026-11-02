export function withProject(path: string): string {
  const url = new URL(path, window.location.origin);
  const project = new URLSearchParams(window.location.search).get('project');
  if (project) url.searchParams.set('project', project);
  return `${url.pathname}${url.search}${url.hash}`;
}

export function suggestionStorageKey(changeName: string): string {
  const project = new URLSearchParams(window.location.search).get('project');
  return project
    ? `openspec-suggestions-project:${project}:${changeName}`
    : `openspec-suggestions-${changeName}`;
}
