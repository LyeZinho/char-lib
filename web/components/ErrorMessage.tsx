export default function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="bg-accent-danger/10 border border-accent-danger/30 rounded-lg p-4 text-accent-danger">
      <p className="font-semibold mb-1">Erro</p>
      <p className="text-sm">{message}</p>
    </div>
  );
}
