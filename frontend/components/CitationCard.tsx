export default function CitationCard({ citation }: any) {
  return (
    <div className="border p-2 rounded mt-2 bg-gray-100">
      <h4 className="font-semibold">{citation.title}</h4>
      <p className="text-sm">{citation.excerpt}</p>
      <a href={citation.url} target="_blank" className="text-blue-500 text-sm">Xem nguồn</a>
    </div>
  );
}
