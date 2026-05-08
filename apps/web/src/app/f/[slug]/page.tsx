import { PublicLeadFormPage } from "@/components/forms/PublicLeadFormPage";

import { submitLeadFormAction } from "./actions";

export default async function PublicFormPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return <PublicLeadFormPage slug={slug} submitLeadFormAction={submitLeadFormAction} />;
}
