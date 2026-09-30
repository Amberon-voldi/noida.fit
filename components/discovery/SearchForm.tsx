import { Search } from "lucide-react";

interface SearchFormProps {
  action?: string;
  defaultValue?: string;
  id?: string;
  label?: string;
  placeholder?: string;
  className?: string;
}

export function SearchForm({
  action = "/search",
  defaultValue,
  id = "directory-search",
  label = "Search the NOIDA.FIT directory",
  placeholder = "Try “running near Sector 21A”",
  className = "",
}: SearchFormProps) {
  return (
    <form
      action={action}
      method="get"
      role="search"
      className={`w-full ${className}`}
    >
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <div className="flex items-center gap-1 rounded-xl border border-border-strong bg-surface p-1.5 transition-colors focus-within:border-velocity">
        <Search
          className="ml-2 hidden h-5 w-5 shrink-0 text-text-secondary sm:block"
          aria-hidden="true"
        />
        <input
          id={id}
          name="q"
          type="search"
          defaultValue={defaultValue}
          placeholder={placeholder}
          autoComplete="off"
          maxLength={160}
          className="min-w-0 flex-1 rounded-lg bg-transparent px-2 py-2.5 text-sm text-white placeholder:text-text-secondary"
        />
        <button
          type="submit"
          className="button-primary"
        >
          Search
        </button>
      </div>
    </form>
  );
}
