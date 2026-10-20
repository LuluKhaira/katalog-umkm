// US-28: Loading Skeleton untuk Halaman Detail Produk
export default function LoadingDetailProduk() {
  return (
    <div className="animate-pulse py-8 md:py-12">
      <div className="grid gap-8 md:grid-cols-2">
        <div className="aspect-square w-full rounded-2xl bg-permukaan" />
        <div className="flex flex-col gap-4">
          <div className="h-4 w-28 rounded bg-permukaan" />
          <div className="h-4 w-20 rounded bg-permukaan" />
          <div className="h-8 w-3/4 rounded-lg bg-permukaan" />
          <div className="h-8 w-32 rounded bg-permukaan" />
          <div className="flex flex-col gap-2 pt-2">
            <div className="h-4 w-full rounded bg-permukaan" />
            <div className="h-4 w-5/6 rounded bg-permukaan" />
            <div className="h-4 w-2/3 rounded bg-permukaan" />
          </div>
          <div className="mt-4 h-12 w-48 rounded-lg bg-permukaan" />
        </div>
      </div>
    </div>
  );
}

