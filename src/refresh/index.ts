import { Board, PrismaClient, Project } from "@prisma/client";
import axios from "axios";
import * as R from "./responses.js";

const client = new axios.Axios({
  baseURL: process.env.zmartboard_url || "https://api.zmartboard.cl/api/",
  transformResponse: (data) => JSON.parse(data),
  headers: {
    "access-token": process.env.zmartboard_token || "",
    uid: process.env.zmartboard_email || "",
    client: process.env.zmartboard_client || "",
    accept: "application/json",
    "user-agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36",
  },
});

export function refreshTask(task: R.Task, prisma: PrismaClient) {
  const { id, name, description, board_id, column_id, labels, created_at, position, ...t } = task;
  const { starting_date, priority, deadline, assigned, estimated_hours, total_hours, completed } = t;
  const updatable = {
    created_at: new Date(created_at),
    name,
    description,
    position: +position,
    priority,
    starting_date,
    estimated_hours: +(estimated_hours || 0),
    completed,
    total_hours: +(total_hours || 0),
    deadline,
    board: { connect: { id: board_id } },
    column: { connect: { id: column_id } },
    assigned: { connect: assigned.map((member_id) => ({ id: member_id })) },
  };
  return prisma.task.upsert({ where: { id }, create: { ...updatable, id }, update: updatable });
}

export function refreshColumn({ id, name, position }: R.Column, board: Board, prisma: PrismaClient) {
  return prisma.column.upsert({
    where: { id },
    update: { name, position },
    create: { id, position, name, board: { connect: { id: board.id } } },
  });
}

export async function refreshBoard(bd: R.Board, cd: R.Column[], td: R.Task[], prisma: PrismaClient) {
  const { id, description, name, position } = bd;
  const updatable = { name, position, description, project: { connect: { id: bd.project_id } } };
  const board = await prisma.board.upsert({ where: { id }, update: updatable, create: { id, ...updatable } });

  // Can't use Promise.all because of the SQLite timeout
  for (const column of cd) await refreshColumn(column, board, prisma);
  for (const task of td) await refreshTask(task, prisma);
}

export async function refreshMember({ id, name, email }: R.SingleMember, project: Project, prisma: PrismaClient) {
  await prisma.member.upsert({
    where: { id },
    update: { name, email, projects: { connect: { id: project.id } } },
    create: { id, name, email, projects: { connect: { id: project.id } } },
  });
}

const requestBoardStuff = (bd: R.Board) =>
  Promise.all([bd, client.get<R.Column[]>(`/boards/${bd.id}/columns`), client.get<R.Task[]>(`/boards/${bd.id}/tasks`)]);

async function refreshProject({ id, name }: Project, prisma: PrismaClient) {
  console.info(`Querying boards of ${name}...`);
  const boards_data = (await client.get<R.Board[]>(`/projects/${id}/boards`)).data;
  const board_stuff = await Promise.all(boards_data.map(requestBoardStuff));
  console.info(`Done querying boards of ${name}, saving data to the database...`);

  for (const [bd, column_response, tasks_response] of board_stuff) {
    await refreshBoard(bd, column_response.data, tasks_response.data, prisma);
  }
}

export async function refreshProjectByName(name: string, prisma: PrismaClient) {
  const project = await prisma.project.findFirst({ where: { name } });
  if (!project) throw new Error(`Project ${name} not found`);
  await refreshProject(project, prisma);
}

export async function refreshDataAllProjects(prisma: PrismaClient) {
  console.info("Querying projects...");
  const projects_data = (await client.get<R.Project[]>("/projects")).data;
  for (const project_data of projects_data) {
    const { id, name } = project_data;
    const project = await prisma.project.upsert({ where: { id }, update: { name }, create: { id, name } });

    const { members: members_data } = (await client.get<R.Members>(`/projects/${project_data.id}/members`)).data;
    for (const member of members_data) await refreshMember(member, project_data, prisma);

    await refreshProject(project, prisma);
  }
}
