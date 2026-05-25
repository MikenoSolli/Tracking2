"use server";
import { redirect } from "next/navigation";
import { deleteSession } from "@/app/_lib/sessions";

export default async function handle_logout() {
    await deleteSession();
    redirect("/");
}