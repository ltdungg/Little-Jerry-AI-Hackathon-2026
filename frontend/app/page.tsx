import ChatInterface from "@/components/ChatInterface";

export default function Home() {
  return (
    <main className="container mx-auto p-4">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">NPO AI Platform</h1>
      </header>
      <ChatInterface />
    </main>
  );
}
