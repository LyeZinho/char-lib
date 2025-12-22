export default function LoadingSpinner() {
  return (
    <div className="flex justify-center items-center p-12">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-dark-border rounded-full"></div>
        <div className="w-16 h-16 border-4 border-accent-primary border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
      </div>
    </div>
  );
}
