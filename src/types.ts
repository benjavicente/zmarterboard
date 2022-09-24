import { Board, Column, Label, Member, Task } from "@prisma/client";

export type TaskWithRelations = Task & {
  assigned: Member[];
  board: Board;
  column: Column;
  labels: Label[];
};
