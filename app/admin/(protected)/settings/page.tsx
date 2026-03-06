import { getAdminUiSettings } from "@/lib/uiSettings";
import { ToastSettingsForm } from "@/components/admin/ToastSettingsForm";

export default async function AdminSettingsPage() {
  const { theme } = await getAdminUiSettings();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-zinc-900">
            Settings
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Configure global UI options such as toast notifications.
          </p>
        </div>
      </div>

      <ToastSettingsForm initialTheme={theme} />
    </div>
  );
}

