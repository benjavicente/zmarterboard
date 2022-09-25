#!/usr/bin/env ts-node

import { PrismaClient } from "@prisma/client";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import * as dotenv from "dotenv";
import { Client as NotionClient } from "@notionhq/client";
import { updateTaskNotionDatabase } from "./sync/index.js";
import { refreshDataAllProjects, refreshProjectByName } from "./refresh/index.js";

dotenv.config();

const prisma = new PrismaClient();
const notion = new NotionClient({ auth: process.env.notion_key });

type Args = {
  project?: string;
};

async function sync({ project }: Args) {
  const { notion_key, notion_database_id } = process.env;
  if (!notion_key || !notion_database_id) {
    throw new Error("Missing Notion key or database id");
  }
  const tasks = await prisma.task.findMany({
    where: { board: { project: { name: project } } },
    include: { assigned: true, labels: true, board: true, column: true },
  });
  await updateTaskNotionDatabase(notion_database_id, tasks, notion);
}

function refresh({ project }: Args) {
  if (project) {
    return refreshProjectByName(project, prisma);
  } else {
    return refreshDataAllProjects(prisma);
  }
}

const all = async ({ project }: Args) => {
  await refresh({ project });
  await sync({ project });
};

const cli = yargs(hideBin(process.argv))
  .scriptName("zmarterboard")
  .option("project", { alias: "p", type: "string", description: "Project name to use" })
  .command("sync", "Sync data with Notion", (ctx) => ctx.argv, sync)
  .command("refresh", "Refresh data (use project name for a speedup)", (ctx) => ctx.argv, refresh)
  .command("all", "Refresh data and sync with Notion", (ctx) => ctx.argv, all)
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
