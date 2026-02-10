import { Navbar } from './Navbar';
import { useRouter } from 'next/router';

interface Props {
    children: React.ReactNode;
}

export const Layout = ({ children }: Props) => {
    const router = useRouter();
    // Hide navbar on player/watch pages
    const hideNavbar = router.pathname === '/' || router.pathname.startsWith('/watch') || router.pathname.startsWith('/player');

    return (
        <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-blue-500/30">
            {!hideNavbar && <Navbar />}
            <main className="relative min-h-screen">
                {children}
            </main>
        </div>
    );
};
