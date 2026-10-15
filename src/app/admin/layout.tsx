import { redirect } from "next/navigation";

export const metadata = {
  title: "Mogobe Admin",
  robots: { index: false, follow: false },
};

export default function AdminLayout() {
  // The inherited source admin must stay inaccessible until Mogobe's own admin is implemented.
  redirect("/");
}
