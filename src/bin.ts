#!/usr/bin/env ts-node

import { PrismaClient } from "@prisma/client";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import * as dotenv from "dotenv";
import { Client as NotionClient } from "@notionhq/client";
import { updateTaskNotionDatabase } from "./sync/index.js";
import { refreshDataAllProjects } from "./refresh/index.js";

dotenv.config();

const prisma = new PrismaClient();
const notion = new NotionClient({ auth: process.env.notion_key });

const cli = yargs(hideBin(process.argv))
  .scriptName("zmarterboard")
  .command("sync", "Sync data with Notion", {}, async () => {
    const { notion_key, notion_database_id } = process.env;
    if (!notion_key || !notion_database_id) {
      throw new Error("Missing Notion key or database id");
    }
    const tasks = await prisma.task.findMany({
      include: { assigned: true, labels: true, board: true, column: true },
    });
    await updateTaskNotionDatabase(notion_database_id, tasks, notion);
  })
  .command("refresh", "Refresh data", {}, async () => {
    const { zmartboard_token, zmartboard_email, zmartboard_client } = process.env;
    if (!zmartboard_token || !zmartboard_email || !zmartboard_client) {
      throw new Error("Missing zmartboard environment variables");
    }
    await refreshDataAllProjects(prisma);
  })
  .demandCommand()
  .strict();

async function main() {
  prisma.$connect();
  try {
    await cli.parseAsync();
  } finally {
    await prisma.$disconnect();
  }
}

main();
