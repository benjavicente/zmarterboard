export type Project = {
  id: string;
  name: string;
  members: string[];
};

export type Board = {
  id: string;
  name: string;
  description: string;
  labels: string[];
  position: number;
  project_id: string;
};

export type Column = {
  id: string;
  board_id: string;
  name: string;
  position: number;
};

export type Task = {
  id: string;
  column_id: string;
  board_id: string;
  assigned: string[];
  labels: string[];
  name: string;
  total_hours: number;
  estimated_hours: number;
  position: number;
  created_at: string;
  deadline?: string;
  starting_date?: string;
  priority: number;
  description?: string;
  completed?: boolean;
};

export type SingleMember = {
  id: string;
  name: string;
  email: string;
};

export type Members = {
  members: SingleMember[];
};
