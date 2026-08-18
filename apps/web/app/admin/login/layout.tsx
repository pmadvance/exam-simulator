export const metadata = {
  title: "Admin Login - PM Exam Pro",
};

export default function LoginLayout({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  // Login page has its own full-screen layout
  return <>{children}</>;
}
