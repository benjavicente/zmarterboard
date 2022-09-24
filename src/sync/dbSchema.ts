import { UpdateDatabaseParameters } from "@notionhq/client/build/src/api-endpoints.js";
import { object, string } from "yup";

export type UpdateDatabaseProperties = UpdateDatabaseParameters["properties"];

export const zmarterboardProperties: UpdateDatabaseProperties = {
  id: { rich_text: {} },
  description: { rich_text: {} },
  completed: { checkbox: {} },
  estimated_hours: { number: {} },
  total_hours: { number: {} },
  created_at: { date: {} },
  members: { multi_select: { options: [] } },
  board: { select: { options: [] } },
  column: { select: { options: [] } },
  priority: { number: {} },
  starting_date: { date: {} },
  ending_date: { date: {} },
  estimated_initial_date: {
    formula: { expression: 'if(empty(prop("created_at")), prop("starting_date"), prop("created_at"))' },
  },
  percentage_worked: {
    formula: {
      expression: 'if(empty(prop("estimated_hours")), 0, round((prop("total_hours") / prop("estimated_hours")) * 100))',
    },
  },
};

const propertySchema = (type: string) =>
  object({
    id: string().required(),
    type: string().required().equals([type]),
    name: string().required(),
  });

export const propertiesSchema = object(
  Object.entries(zmarterboardProperties).reduce((acc, [key, value]) => {
    if (!value) return acc;
    // Get the type from the only key of the value object
    const type = Object.keys(value)[0];
    acc[key] = propertySchema(type);
    return acc;
  }, {})
);
