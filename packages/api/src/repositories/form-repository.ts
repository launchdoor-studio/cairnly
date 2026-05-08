import { formSubmissions, forms, type Db } from "@cairnly/db";
import { and, eq } from "drizzle-orm";

export type FormRepository = {
  findBySlug(input: {
    workspaceId: string;
    slug: string;
  }): Promise<(typeof forms.$inferSelect) | undefined>;
  insertSubmission(input: typeof formSubmissions.$inferInsert): Promise<void>;
};

export function createFormRepository(db: Db): FormRepository {
  return {
    async findBySlug({ workspaceId, slug }) {
      const [row] = await db
        .select()
        .from(forms)
        .where(and(eq(forms.workspaceId, workspaceId), eq(forms.slug, slug)))
        .limit(1);

      return row;
    },

    async insertSubmission(input) {
      await db.insert(formSubmissions).values(input);
    },
  };
}
