export default function Input({
  label,
  name,
  type = "text",
  textarea = false,
  error = null,
  className = "",
  ...props
}) {
  const kelas = `w-full rounded-lg border ${
    error ? "border-bahaya focus:border-bahaya" : "border-garis focus:border-utama"
  } bg-latar px-3 py-2.5 text-base text-teks placeholder:text-teks-lembut focus:outline-none ${className}`;

  return (
    <div className="flex flex-col gap-1.5 text-sm font-semibold">
      {label && (
        <label htmlFor={name} className="cursor-pointer">
          {label}
        </label>
      )}
      {textarea ? (
        <textarea id={name} name={name} rows={4} className={kelas} {...props} />
      ) : (
        <input id={name} name={name} type={type} className={kelas} {...props} />
      )}
      {error && <p className="text-xs font-normal text-bahaya mt-0.5">{error}</p>}
    </div>
  );
}
