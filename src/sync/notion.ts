import _ from "lodash";
import { Client } from "@notionhq/client";
import { UpdatableProperties, zmarterboardProperties } from "./dbSchema.js";

import type { GetDatabaseResponse, PageObjectResponse } from "@notionhq/client/build/src/api-endpoints.js";
import type { TaskWithRelations } from "../types.js";

export async function resetDatabasePropertiesIfInvalid(db: GetDatabaseResponse, notion: Client) {
  const { id: database_id, properties } = db;
  const remainingProperties = { ...zmarterboardProperties };
  const toUpdateObj = {};

  // Update the current properties in the Notion Database
  for (const [name, property] of Object.entries(properties)) {
    const zmarterboardProperty = remainingProperties[name];
    if (zmarterboardProperty) {
      if (!zmarterboardProperty[property.type]) {
        // Incorrect property schema, should change
        toUpdateObj[property.id] = zmarterboardProperty;
      }
      delete remainingProperties[name];
    } else {
      // Should be deleted
      toUpdateObj[property.id] = null;
    }
  }
  // Create missing properties
  for (const [name, property] of Object.entries(remainingProperties)) {
    if (property["title"]) continue;
    toUpdateObj[name] = property;
  }

  if (Object.keys(toUpdateObj).length === 0) return;
  console.info("Updating database properties");
  await notion.databases.update({ database_id, properties: toUpdateObj });
}

const dateProperty = (date: Date) => ({ date: { start: date.toISOString(), time_zone: "Chile/Continental" } });

const generatePageProperties = (task: TaskWithRelations): UpdatableProperties => ({
  name: { title: [{ text: { content: task.name } }] },
  id: { rich_text: [{ text: { content: task.id } }] },
  position: { number: task.position },
  completed: { checkbox: task.completed },
  archived: { checkbox: task.archived },
  estimated_hours: { number: task.estimated_hours },
  total_hours: { number: task.total_hours },
  description: { rich_text: task.description ? [{ text: { content: task.description } }] : [] },
  task_created_at: dateProperty(task.created_at),
  priority: { number: task.priority },
  members: { multi_select: task.assigned.map((member) => ({ name: member.name })) },
  board: { select: { name: task.board.name } },
  column: { select: { name: task.column.name } },
  starting_date: task.starting_date ? dateProperty(task.starting_date) : undefined,
  deadline: task.deadline ? dateProperty(task.deadline) : undefined,
});

export async function createTaskPage(database_id: string, task: TaskWithRelations, notion: Client) {
  // @ts-ignore
  await notion.pages.create({ parent: { database_id }, properties: generatePageProperties(task) });
  return;
}

const maxDelta = 1000 * 60 * 60 * 24; // 1 day
function isSubsetConsideringDate(obj_set: {}, obj_that_might_be_subset: {}, type: string) {
  if (type === "date") {
    if (obj_set[type] === null && _.isObject(obj_that_might_be_subset[type])) return false;

    // Difference of only 12 hours is considered the same date
    const delta = new Date(obj_set[type].start).getTime() - new Date(obj_that_might_be_subset[type].start).getTime();
    return Math.abs(delta) < maxDelta;
  }

  const obj_value = obj_set[type];
  const obj_subset_value = obj_that_might_be_subset[type];

  // Simple comparison if is not an object or list
  if (!_.isObject(obj_value) && !_.isArray(obj_value)) return obj_value === obj_subset_value;

  // If is an object or list, check if is a subset
  return _.isMatch(obj_set[type], obj_that_might_be_subset[type]);
}

export async function updateTaskPage(page: PageObjectResponse, task: TaskWithRelations, notion: Client) {
  const currentProperties = generatePageProperties(task);
  for (const [name, notionProperty] of Object.entries(page.properties)) {
    if (currentProperties[name] === undefined) {
      delete currentProperties[name];
      continue;
    }
    if (isSubsetConsideringDate(notionProperty, currentProperties[name], notionProperty.type)) {
      delete currentProperties[name];
    }
  }
  const keysToUpdate = Object.keys(currentProperties);
  // @ts-ignore
  if (keysToUpdate.length > 0) await notion.pages.update({ page_id: page.id, properties: currentProperties });
  return keysToUpdate;
}
