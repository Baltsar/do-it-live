import { redirect } from "next/navigation";

/** The presenter view now lives at the root. Kept so old links still work. */
export default function PresenterRedirect(): never {
  redirect("/");
}
