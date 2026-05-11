export default function WidgetLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-transparent min-h-screen">
      {children}
    </div>
  );
}
