"use server";

import { redirect } from "next/navigation";
import { createIzakayaFromForm } from "../lib/server/izakayaSearch/createSearch";

export async function searchIzakaya(formData: FormData) {
  const search = await createIzakayaFromForm(formData);
  redirect(`/results/${search.id}`);
}
