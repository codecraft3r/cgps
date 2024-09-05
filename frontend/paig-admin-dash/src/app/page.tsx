import Profile from '../components/Profile';

export default function Home() {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <div className="flex flex-col items-center justify-center">
        <h1 className="text-4xl font-bold mb-4">Welcome to the Admin Dashboard</h1>
        <a
          href="/api/auth/login"
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-700"
        >
          Login
        </a>
        <a
          href="/api/auth/logout"
          className="px-4 py-2 mt-4 bg-red-500 text-white rounded hover:bg-red-700"
        >
          Logout
        </a>
        <Profile />
      </div>
    </div>
  );
}
