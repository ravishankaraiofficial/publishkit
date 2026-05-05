import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { LogOut, ShieldAlert } from 'lucide-react';

export function AccessPending() {
  const { logout } = useAuth();

  return (
    <div className="relative min-h-screen bg-[#0D0D0D] text-[#F5F5F5] flex items-center justify-center p-4 overflow-hidden">
      <div className="glow-bg" aria-hidden="true">
        <div className="blob b1" />
        <div className="blob b2" />
        <div className="blob b3" />
      </div>
      <Card className="relative z-10 w-full max-w-md fade-in">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-[#E05A1E]/10 rounded-full flex items-center justify-center mb-4">
            <ShieldAlert className="w-6 h-6 text-[#E05A1E]" />
          </div>
          <CardTitle className="text-2xl">Access Pending</CardTitle>
          <CardDescription>
            Your access is pending. Contact the admin to add your email to the whitelist.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center pt-4">
          <Button variant="outline" onClick={logout} className="w-full">
            <LogOut className="w-4 h-4 mr-2" />
            Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
