import { Board, Member, PrismaClient, Project } from "@prisma/client";
import axios from "axios";
import * as R from "./responses.js";

const client = new axios.Axios({
  baseURL: "https://api.zmartboard.cl/api/",
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

export async function refreshColumn({ id, name, position }: R.Column, board: Board, prisma: PrismaClient) {
  return await prisma.column.upsert({
    where: { id },
    update: { name, position },
    create: { id, position, name, board: { connect: { id: board.id } } },
  });
}

export async function refreshBoard(bd: R.Board, project: Project, prisma: PrismaClient) {
  const { id, description, name, position } = bd;
  const updatable = {
    name,
    position,
    description,
    project: { connect: { id: project.id } },
  };
  const board = await prisma.board.upsert({
    where: { id },
    update: updatable,
    create: { id, ...updatable },
  });
  const [{ data: columns_data }, { data: tasks_data }] = await Promise.all([
    client.get<R.Column[]>(`/boards/${id}/columns`),
    client.get<R.Task[]>(`/boards/${id}/tasks`),
  ]);
  const columns: Awaited<ReturnType<typeof refreshColumn>>[] = [];
  for (const column of columns_data) {
    columns.push(await refreshColumn(column, board, prisma));
  }
  const tasks: Awaited<ReturnType<typeof refreshTask>>[] = [];
  for (const task of tasks_data) {
    tasks.push(await refreshTask(task, prisma));
  }
  return { board, columns, tasks };
}

export async function refreshMember({ id, name, email }: R.SingleMember, project: Project, prisma: PrismaClient) {
  return await prisma.member.upsert({
    where: { id },
    update: { name, email, projects: { connect: { id: project.id } } },
    create: { id, name, email, projects: { connect: { id: project.id } } },
  });
}

export async function refreshProject({ id, name }: R.Project, prisma: PrismaClient) {
  const project = await prisma.project.upsert({
    where: { id },
    update: { name },
    create: { id, name },
  });

  const { members: members_data } = (await client.get<R.Members>(`/projects/${id}/members`)).data;
  const members: Member[] = [];
  for (const member of members_data) {
    members.push(await refreshMember(member, project, prisma));
  }
  const board_data = (await client.get<R.Board[]>(`/projects/${id}/boards`)).data;
  const boards: Awaited<ReturnType<typeof refreshBoard>>[] = [];
  for (const board of board_data) {
    boards.push(await refreshBoard(board, project, prisma));
  }
  return { project, members, boards };
}

export async function refreshDataAllProjects(prisma: PrismaClient) {
  const project_data = (await client.get<R.Project[]>("/projects")).data;
  return await Promise.all(project_data.map((project) => refreshProject(project, prisma)));
}
