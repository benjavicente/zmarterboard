import { Client } from "@notionhq/client";
import { GetDatabaseResponse, UpdatePageParameters } from "@notionhq/client/build/src/api-endpoints.js";
import { TaskWithRelations } from "../types.js";
import { UpdateDatabaseProperties, zmarterboardProperties } from "./dbSchema.js";

type Properties = GetDatabaseResponse["properties"];
type UpdatablePageProperties = UpdatePageParameters["properties"];

function notionEmptyProperties(properties: Properties) {
  const withEmptyProperties: UpdateDatabaseProperties = {};
  for (const [key, value] of Object.entries(properties)) {
    if (value.type !== "title" || key !== "id") withEmptyProperties[value.id] = null;
  }
  return withEmptyProperties;
}

export async function resetDatabaseProperties({ id: database_id, properties }: GetDatabaseResponse, notion: Client) {
  const titleId = Object.keys(properties).find((key) => properties[key].type === "title") as string;
  const propertiesToReset = { ...notionEmptyProperties(properties), [titleId]: { name: "name" } };
  await notion.databases.update({ database_id, properties: propertiesToReset });
  await notion.databases.update({ database_id, properties: zmarterboardProperties });
}

const updatableProperties = (task: TaskWithRelations) => {
  const properties: UpdatablePageProperties = {
    name: { title: [{ text: { content: task.name } }] },
    completed: { checkbox: !!task.completed },
    estimated_hours: { number: task.estimated_hours },
    total_hours: { number: task.total_hours },
    description: { rich_text: task.description ? [{ text: { content: task.description } }] : [] },
    created_at: {
      date: {
        // TODO: Date timezone is not correct
        start: task.created_at.toISOString(),
        time_zone: "Chile/Continental",
      },
    },
    priority: { number: task.priority },
    members: {
      multi_select: task.assigned.map((member) => ({
        name: member.name,
      })),
    },
    board: { select: { name: task.board.name } },
    column: { select: { name: task.column.name } },
  };
  if (task.starting_date) {
    properties.starting_date = {
      date: {
        start: task.starting_date.toISOString(),
        time_zone: "Chile/Continental",
      },
    };
  }
  if (task.deadline) {
    properties.ending_date = {
      date: {
        start: task.deadline.toISOString(),
        time_zone: "Chile/Continental",
      },
    };
  }
  return properties;
};

export function createTaskPage(database_id: string, task: TaskWithRelations, notion: Client) {
  return notion.pages.create({
    parent: { database_id },
    properties: {
      id: { rich_text: [{ text: { content: task.id } }] },
      ...updatableProperties(task),
    },
  });
}

export function updateTaskPage(page_id: string, task: TaskWithRelations, notion: Client) {
  return notion.pages.update({
    page_id,
    properties: updatableProperties(task),
  });
}
