import { Client as NotionClient } from "@notionhq/client";
import { resetDatabasePropertiesIfInvalid, createTaskPage, updateTaskPage } from "./notion.js";

import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints.js";
import type { TaskWithRelations } from "../types.js";

export async function updateTaskNotionDatabase(database_id: string, tasks: TaskWithRelations[], notion: NotionClient) {
  const tasksById: Record<string, TaskWithRelations> = tasks.reduce((acc, task) => ({ ...acc, [task.id]: task }), {});
  const database = await notion.databases.retrieve({ database_id });
  await resetDatabasePropertiesIfInvalid(database, notion);

  let should_query_more = true;
  let start_cursor: string | undefined = undefined;
  let created = 0,
    updated = 0,
    skipped = 0,
    deleted = 0;

  while (should_query_more) {
    const { results, next_cursor, has_more } = await notion.databases.query({ database_id, start_cursor });
    should_query_more = has_more;
    start_cursor = next_cursor;
    // Update the tasks in the notion database
    for (const _page of results) {
      const page = _page as PageObjectResponse;
      const { properties: p, id: page_id } = page;
      const task_id =
        p.id && p.id.type === "rich_text" && p.id.rich_text.length !== 0 ? p.id.rich_text[0].plain_text : null;
      if (!task_id || !tasksById[task_id]) {
        await notion.pages.update({ page_id, archived: true });
        deleted++;
      } else {
        const updatedKeys = await updateTaskPage(page, tasksById[task_id], notion);
        if (updatedKeys.length > 0) {
          updated++;
        } else {
          skipped++;
        }
        delete tasksById[task_id];
      }
    }
    for (const task of Object.values(tasksById)) {
      await createTaskPage(database_id, task, notion);
      created++;
    }
  }
  // Add updated time in DB description
  await notion.databases.update({
    database_id,
    description: [
      { text: { content: "Last updated: " } },
      { text: { content: new Date().toDateString() }, annotations: { bold: true } },
    ],
  });
  console.info("Updated Notion Database");
  console.info(`  Updated ${updated}`);
  console.info(`  Created ${created}`);
  console.info(`  Skipped ${skipped}`);
  console.info(`  Deleted ${deleted}`);
}
