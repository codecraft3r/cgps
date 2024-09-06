import { getSession } from '@auth0/nextjs-auth0';

export default async function ProfileServer() {
    const session = await getSession();
    let user = null;
    if (session) {
        user = session.user;
    }
    return (
        user && (
            <div className="max-w-xs shadow p-4 rounded-xl bg-white">
                <h1 className="text-2xl font-bold text-black">Signed in as:</h1>
                <div className="px-4 py-2">
                    <div className="font-bold text-lg text-black">{user.name}</div>
                    <p className="text-gray-700 text-sm">{user.email}</p>
                </div>
                <div className="mt-4">
                    <a
                        href="/api/auth/logout"
                        className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-700"
                    >
                        Logout
                    </a>
                </div>
            </div>
        )
    );
}