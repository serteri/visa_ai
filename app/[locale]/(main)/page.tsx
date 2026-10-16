import { HomeContent } from "@/components/home-content";

export default async function Home() {

  return (
    <main className="flex-1 bg-[var(--cf-bg)] pb-16">
      <HomeContent />
    </main>
  );
}
