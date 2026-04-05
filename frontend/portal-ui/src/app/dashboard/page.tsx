// Root /dashboard path — redirect to the overview page.
import { redirect } from 'next/navigation';

export default function DashboardRoot() {
  redirect('/dashboard/overview');
}
