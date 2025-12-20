// OpenSpec Data Types

export interface Project {
  name: string;
  description: string;
  path: string;
  content: string;
}

export interface Spec {
  name: string;
  path: string;
  specContent: string;
  designContent: string | null;
}

export interface Task {
  text: string;
  completed: boolean;
  line: number;
  subtasks: Task[];
}

export interface TaskProgress {
  done: number;
  total: number;
  percentage: number;
}

export interface Change {
  name: string;
  path: string;
  isArchived: boolean;
  archivedDate: string | null;
  proposal: string | null;
  tasks: Task[];
  tasksRaw: string | null;
  taskProgress: TaskProgress;
  design: string | null;
  specDeltas: SpecDelta[];
}

export interface SpecDelta {
  capability: string;
  content: string;
  operations: DeltaOperation[];
}

export interface DeltaOperation {
  type: 'added' | 'modified' | 'removed' | 'renamed';
  name: string;
  content: string;
  startLine: number;
  endLine: number;
}

export interface Stats {
  totalSpecs: number;
  activeChanges: number;
  archivedChanges: number;
  overallTaskProgress: TaskProgress;
}

export interface SearchResult {
  type: 'spec' | 'change' | 'project';
  name: string;
  path: string;
  excerpt: string;
  matchLine: number;
}

// API Response Types

export interface ProjectResponse {
  project: Project;
}

export interface SpecsResponse {
  specs: Spec[];
}

export interface SpecResponse {
  spec: Spec;
}

export interface ChangesResponse {
  active: Change[];
  archived: Change[];
}

export interface ChangeResponse {
  change: Change;
}

export interface StatsResponse {
  stats: Stats;
}

export interface SearchResponse {
  results: SearchResult[];
}

// WebSocket Event Types

export interface WSMessage {
  type: 'data:refresh' | 'file:changed' | 'error';
  entity?: 'project' | 'specs' | 'changes' | 'all';
  entityId?: string;
  data?: unknown;
  message?: string;
}

// Parser result types

export interface ParseResult<T> {
  data: T | null;
  errors: string[];
  warnings: string[];
}
