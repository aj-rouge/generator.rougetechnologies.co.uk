import { requireSession } from "../../../utils/auth";
import ResetForm from "./ResetForm";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage() {
  await requireSession("/account/reset-password");
  return (
    <div className="flex min-h-full items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-800">
        <h1 className="text-2xl font-bold text-center mb-6">
          Set a new password
        </h1>
        <ResetForm />
      </div>
    </div>
  );
}
