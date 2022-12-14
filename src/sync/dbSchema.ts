import { UpdateDatabaseParameters } from "@notionhq/client/build/src/api-endpoints.js";

export type UpdateDatabaseProperties = UpdateDatabaseParameters["properties"];

const estimated_initial_hours_expression =
  'if(empty(prop("starting_date")), prop("task_created_at"), prop("starting_date"))';
const percentage_work_expression =
  'if(empty(prop("estimated_hours")), 0, round((prop("total_hours") / prop("estimated_hours")) * 100))';
const estimated_deadline_expression =
  'if(empty(prop("deadline")), dateAdd(prop("estimated_initial_date"), 7, "days"), prop("deadline"))';

export type UpdatableProperties = {
  id: { rich_text: { text: { content: string } }[] };
  name: { title: { text: { content: string } }[] };
  completed: { checkbox: boolean };
  archived: { checkbox: boolean };
  estimated_hours: { number: number | null };
  total_hours: { number: number | null };
  description: { rich_text: { text: { content: string } }[] };
  task_created_at: { date: { start: string; time_zone: string } };
  priority: { number: number };
  members: { multi_select: { name: string }[] };
  board: { select: { name: string } };
  column: { select: { name: string } };
  position: { number: number };
  starting_date?: { date: { start: string; time_zone: string } };
  deadline?: { date: { start: string; time_zone: string } };
};

export const zmarterboardProperties = {
  id: { rich_text: {} },
  name: { title: {} },
  description: { rich_text: {} },
  position: { number: {} },
  completed: { checkbox: {} },
  archived: { checkbox: {} },
  estimated_hours: { number: {} },
  total_hours: { number: {} },
  task_created_at: { date: {} },
  starting_date: { date: {} },
  deadline: { date: {} },
  priority: { number: {} },
  members: { multi_select: {} },
  board: { select: {} },
  column: { select: {} },
  percentage_work: { formula: { expression: percentage_work_expression } },
  estimated_initial_date: { formula: { expression: estimated_initial_hours_expression } },
  estimated_deadline: { formula: { expression: estimated_deadline_expression } },
} as const;

export type ZmarterboardDBProperties = Record<keyof UpdatableProperties, {}> & { [key: string]: {} };
export type ZmarterboardPageProperties = typeof zmarterboardProperties;
