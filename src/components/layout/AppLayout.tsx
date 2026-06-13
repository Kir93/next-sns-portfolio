const AppLayout = ({ children }: { children: React.ReactNode }) => (
  <main id="main" className="mx-auto flex min-h-dvh w-full max-w-[600px] flex-col">
    {children}
  </main>
);

export default AppLayout;
