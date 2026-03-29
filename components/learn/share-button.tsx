"use client";

type ShareButtonProps = {
  title: string;
  url: string;
};

export function ShareButton({ title, url }: ShareButtonProps) {
  return (
    <button
      type="button"
      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
      onClick={async () => {
        try {
          if (typeof navigator !== "undefined" && navigator.share) {
            await navigator.share({ title, url });
            return;
          }
        } catch {
          /* user cancelled or share failed */
        }
        try {
          await navigator.clipboard.writeText(url);
          alert("Link copied to clipboard");
        } catch {
          prompt("Copy this link:", url);
        }
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="size-4"
        aria-hidden
      >
        <path d="M13.5 5.5a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0ZM10.05 8.95 16.2 5.6a3 3 0 1 0-4.2-4.2L5.85 4.75a3 3 0 1 0 4.2 4.2Zm-1.4 2.1a3 3 0 1 0 4.2 4.2l6.15-3.35a3 3 0 1 0-4.2-4.2l-6.15 3.35Z" />
      </svg>
      Share
    </button>
  );
}
