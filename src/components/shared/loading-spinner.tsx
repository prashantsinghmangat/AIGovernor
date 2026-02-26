export function LoadingSpinner({ size = 'default' }: { size?: 'sm' | 'default' | 'lg' }) {
  const sizes = { sm: 'h-4 w-4', default: 'h-8 w-8', lg: 'h-12 w-12' };

  return (
    <div className="flex items-center justify-center">
      <div
        className={`${sizes[size]} animate-spin rounded-full border-2 border-gray-600 border-t-blue-500`}
      />
    </div>
  );
}
