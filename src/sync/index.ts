import { Client as NotionClient } from "@notionhq/client";
import { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints.js";
import { TaskWithRelations } from "../types.js";
import { propertiesSchema } from "./dbSchema.js";
import { resetDatabaseProperties, createTaskPage, updateTaskPage } from "./notion.js";

export async function updateTaskNotionDatabase(database_id: string, tasks: TaskWithRelations[], notion: NotionClient) {
  const tasksById: Record<string, TaskWithRelations> = tasks.reduce((acc, task) => ({ ...acc, [task.id]: task }), {});
  const database = await notion.databases.retrieve({ database_id });

  try {
    await propertiesSchema.validate(database.properties);
  } catch (error) {
    console.info("Resetting database properties");
    await resetDatabaseProperties(database, notion);
  }

  let should_query_more = true;
  let start_cursor: string | undefined = undefined;

  while (should_query_more) {
    const { results, next_cursor, has_more } = await notion.databases.query({ database_id, start_cursor });
    should_query_more = has_more;
    start_cursor = next_cursor;
    // Update the tasks in the notion database
    for (const page of results) {
      const { properties: p, id: page_id } = page as PageObjectResponse;
      const task_id =
        p.id && p.id.type === "rich_text" && p.id.rich_text.length !== 0 ? p.id.rich_text[0].plain_text : null;
      if (!task_id || !tasksById[task_id]) {
        await notion.pages.update({ page_id, archived: true });
        console.info(`Archived page ${page_id}`);
      } else {
        await updateTaskPage(page_id, tasksById[task_id], notion);
        delete tasksById[task_id];
        console.info(`Updated page ${page_id}`);
      }
    }
    for (const task of Object.values(tasksById)) {
      await createTaskPage(database_id, task, notion);
      console.info(`Created page for task ${task.id}`);
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
}
