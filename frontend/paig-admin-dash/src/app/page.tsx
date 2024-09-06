import { AdminDashboard } from '@/components/admin-dashboard';
import Profile from '../components/Profile';
import { getSession } from '@auth0/nextjs-auth0';
import { redirect } from 'next/navigation';
import { ApiKeyGenerator } from '@/components/api-key-generator';
import { getUsers } from './actions';
import { ApiKeyManager } from '@/components/api-key-manager';


export default async function Home() {
  const session = await getSession();
  const users = await getUsers();
  if (session) {
    return (
      <div className="min-h-screen p-8 pb-20 sm:p-20 font-[family-name:var(--font-geist-sans)] bg-zinc-900 text-white">
        <div className="max-w-7xl mx-auto">
          <Profile />
          <div className="mt-8">
            <AdminDashboard />
          </div>
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
            <ApiKeyGenerator users={users} />
            <ApiKeyManager users={users} />
          </div>
        </div>
      </div>
    );
  } else {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 pb-20 sm:p-20 font-[family-name:var(--font-geist-sans)] bg-gray-100">
        <div className="text-center">
          <a
            href="/api/auth/login"
            className="px-6 py-3 mt-4 bg-blue-500 text-white rounded-lg shadow-lg hover:bg-blue-700 transition duration-300"
          >
            Login
          </a>
        </div>
      </div>
    );
  }
}
