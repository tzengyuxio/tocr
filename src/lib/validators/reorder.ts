import { z } from "zod";

export const reorderSchema = z.object({
  magazineId: z.string().min(1),
  issueIds: z.array(z.string().min(1)),
});
