import { redirect, RedirectType } from "next/navigation";

export default function WelcomePage() {
  redirect("https://depoii.com", RedirectType.replace);
}
