// US-28: Loading Skeleton untuk Beranda
export default function LoadingBeranda() {
  return (
    <div className="animate-pulse py-10 sm:py-14">
      {/* Skeleton Header Toko */}
      <div className="h-10 w-2/3 max-w-md rounded-lg bg-permukaan sm:h-12" />
      <div className="mt-3 h-5 w-1/2 max-w-sm rounded bg-permukaan" />
      <div className="mt-4 h-4 w-1/3 max-w-xs rounded bg-permukaan" />

      {/* Skeleton Filter & Search */}
      <div className="mt-12 flex flex-col gap-3 sm:flex-row">
        <div className="h-10 flex-1 rounded-lg bg-permukaan" />
        <div className="h-10 w-36 rounded-lg bg-permukaan" />
        <div className="h-10 w-24 rounded-lg bg-permukaan" />
      </div>

      {/* Skeleton Grid Kartu Produk */}
      <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex flex-col overflow-hidden rounded-2xl border border-garis bg-latar">
            <div className="aspect-square w-full bg-permukaan" />
            <div className="flex flex-col gap-2 p-3">
              <div className="h-3 w-16 rounded bg-permukaan" />
              <div className="h-4 w-3/4 rounded bg-permukaan" />
              <div className="mt-2 h-5 w-20 rounded bg-permukaan" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

