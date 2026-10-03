import Link from "next/link";
import { Search, X } from "lucide-react";
import { FilterDialog } from "./FilterDialog";
import { Reveal } from "@/components/ui/Reveal";
import { getDirectory } from "@/lib/data";
import { EventCard } from "@/components/cards/EventCard";
import { CommunityCard } from "@/components/cards/CommunityCard";
import { PlaceCard } from "@/components/cards/PlaceCard";
import { EmptyState } from "./FilterLinks";
import { filterDirectory, filterUrl, readFilters, type DirectoryType, type SearchParams } from "./filter";
import { DemoNotice } from "./ListingImage";

interface DirectoryViewProps {
  params: SearchParams;
  path: string;
  title: string;
  description: string;
  eyebrow: string;
  type?: DirectoryType;
}

export async function DirectoryView({ params, path, title, description, eyebrow, type }: DirectoryViewProps) {
  const directory = await getDirectory();
  const filters = readFilters(params, type);
  const results = filterDirectory(directory, filters);
  const active = Object.entries(filters).filter(([key, value]) => value && !(key === "type" && type));
  const advancedCount = active.filter(([key]) => !["q", "type"].includes(key)).length;
  const hasDemo = [...results.events, ...results.communities, ...results.places].some((item) => item.demo);
  const sectors = Array.from(new Set([...directory.events.map((item) => item.sector), ...directory.places.map((item) => item.sector)])).sort();
  const inputClass = "h-11 w-full min-w-0 rounded-lg border border-border-strong bg-background px-3 text-sm text-white";

  return (
    <div className="pb-16">
      <header className="hero-enter border-b border-border-subtle px-4 py-7 sm:px-6 sm:py-12 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:mt-3 sm:text-5xl">{title}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-text-secondary sm:text-base">{description}</p>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
        <form action={path} method="get" role="search" className="flex items-start gap-2">
          <label htmlFor="directory-query" className="sr-only">Search the directory</label>
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-3 hidden h-5 w-5 text-text-secondary sm:block" aria-hidden="true" />
              <input key={filters.q} id="directory-query" name="q" type="search" defaultValue={filters.q} placeholder="Sport, sector, group, or venue" className={`${inputClass} sm:pl-10`} maxLength={160} />
            </div>
            <button className="button-primary px-3 sm:px-4" type="submit"><Search className="h-4 w-4 sm:hidden" aria-hidden="true" /><span className="sr-only sm:not-sr-only">Search</span></button>
          </div>
          <input type="hidden" name="type" value={type ?? filters.type} />
          <FilterDialog key={JSON.stringify(filters)} activeCount={advancedCount}>
            <div className="grid gap-4 overflow-y-auto overscroll-contain p-4 sm:grid-cols-2 sm:p-6">
              <label className="filter-label" htmlFor="filter-activity">Activity
                <select key={filters.activity} id="filter-activity" name="activity" defaultValue={filters.activity} className={inputClass}>
                  <option value="">All activities</option>
                  {directory.activities.map((item) => <option key={item.id} value={item.slug}>{item.name}</option>)}
                  {["sports", "wellness"].filter((value) => !directory.activities.some((item) => item.slug === value)).map((value) => <option key={value} value={value}>{value === "sports" ? "All sports" : "Wellness"}</option>)}
                </select>
              </label>
              <label className="filter-label" htmlFor="filter-sector">Sector / neighbourhood
                <input key={filters.sector} id="filter-sector" name="sector" defaultValue={filters.sector} list="directory-sectors" placeholder="All Noida" className={inputClass} maxLength={100} />
                <datalist id="directory-sectors">{sectors.map((sector) => <option key={sector} value={sector} />)}</datalist>
              </label>
              {type !== "communities" && <label className="filter-label" htmlFor="filter-price">Cost
                <select key={filters.price} id="filter-price" name="price" defaultValue={filters.price} className={inputClass}><option value="">Any cost</option><option value="free">Free</option><option value="paid">Paid</option></select>
              </label>}
              {(!type || type === "events") && <>
                <label className="filter-label" htmlFor="filter-date">Date · events only
                  <select key={filters.date} id="filter-date" name="date" defaultValue={filters.date} className={inputClass}><option value="">Any upcoming date</option><option value="today">Today</option><option value="tomorrow">Tomorrow</option><option value="weekend">This weekend</option><option value="week">Next 7 days</option></select>
                </label>
                <label className="filter-label" htmlFor="filter-time">Time · IST
                  <select key={filters.time} id="filter-time" name="time" defaultValue={filters.time} className={inputClass}><option value="">Any time</option><option value="morning">Morning · 5–8:30 AM</option><option value="day">Daytime · 8:30 AM–5 PM</option><option value="evening">Evening · 5–9:30 PM</option></select>
                </label>
              </>}
              {type === "places" && <label className="filter-label" htmlFor="filter-category">Place type
                <select key={filters.category} id="filter-category" name="category" defaultValue={filters.category} className={inputClass}><option value="">All places</option>{Array.from(new Set(directory.places.map((place) => place.category))).sort().map((category) => <option key={category} value={category}>{category}</option>)}</select>
              </label>}
            </div>
            <div className="filter-dialog-actions border-t border-border-subtle p-4 sm:p-6">
              <p className="mb-3 text-xs leading-relaxed text-text-secondary">Date and time filter events only. Choose a sector for nearby options.</p>
              <div className="flex items-center gap-3"><Link href={path} className="button-secondary">Reset</Link><button type="submit" className="button-primary flex-1">Apply filters</button></div>
            </div>
          </FilterDialog>
        </form>

        {!type && <nav className="listing-tabs no-scrollbar mt-5 flex gap-1 overflow-x-auto rounded-xl border border-border-subtle bg-surface p-1" aria-label="Listing types">{[{ value: "", label: "Everything" }, { value: "events", label: "Events" }, { value: "communities", label: "Communities" }, { value: "places", label: "Places" }].map((item) => <Link key={item.value} href={filterUrl(path, filters, { type: item.value })} className={`motion-press inline-flex min-h-11 flex-1 shrink-0 items-center justify-center whitespace-nowrap rounded-lg px-3 text-xs font-semibold transition-colors ${filters.type === item.value ? "bg-surface-hover text-white" : "text-text-secondary hover:text-white"}`} aria-current={filters.type === item.value ? "page" : undefined}>{item.label}</Link>)}</nav>}

        <nav className="no-scrollbar mt-3 flex gap-2 overflow-x-auto px-1 pb-2 pt-1" aria-label="Quick activity filters">
          <Link href={filterUrl(path, filters, { activity: "" })} className={`filter-chip ${!filters.activity ? "filter-chip-active" : ""}`} aria-current={!filters.activity ? "page" : undefined}>All activities</Link>
          {directory.activities.slice(0, 8).map((item) => <Link key={item.id} href={filterUrl(path, filters, { activity: item.slug })} className={`filter-chip ${filters.activity === item.slug ? "filter-chip-active" : ""}`} aria-current={filters.activity === item.slug ? "page" : undefined}><span aria-hidden="true">{item.emoji}</span>{item.name}</Link>)}
          <Link href="/activities" className="filter-chip text-velocity">All {directory.activities.length} activities →</Link>
        </nav>

        {active.length > 0 && <div className="mt-4 flex flex-wrap items-center gap-2" aria-label="Applied filters">
          {active.map(([key, value]) => <Link key={key} href={filterUrl(path, filters, { [key]: "" })} className="inline-flex min-h-11 max-w-full items-center gap-2 rounded-md border border-border-strong px-3 text-xs text-text-secondary" aria-label={`Remove ${key}: ${value}`}><span className="truncate">{key}: {value}</span><X className="h-3 w-3 shrink-0" aria-hidden="true" /></Link>)}
          <Link href={path} className="inline-flex min-h-11 items-center px-2 text-xs font-semibold text-velocity">Clear all</Link>
        </div>}

        <div className="mb-5 mt-5 flex flex-wrap items-end justify-between gap-2 border-b border-border-subtle pb-4">
          <h2 className="text-lg font-bold sm:text-xl">{results.total} {results.total === 1 ? "match" : "matches"}{filters.q ? ` for “${filters.q}”` : " in the directory"}</h2>
          {results.events.length > 0 && <span className="text-xs text-text-secondary">Soonest first · IST</span>}
        </div>
        {hasDemo && <DemoNotice className="mb-6" />}
        {results.total === 0 ? <EmptyState title="No matches for this set of filters" description="Try all sectors, a broader activity, or clear the date. Your filters may be narrower than the current directory." href={path} label="Reset filters" /> : <Reveal key={JSON.stringify(filters)} className="space-y-10 sm:space-y-12">
          {results.events.length > 0 && <section aria-labelledby="results-events"><h2 id="results-events" className="mb-5 text-2xl font-bold">Upcoming events <span className="text-sm font-normal text-text-secondary">({results.events.length})</span></h2><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{results.events.map((event) => <EventCard key={event.id} event={event} />)}</div></section>}
          {results.communities.length > 0 && <section aria-labelledby="results-communities"><h2 id="results-communities" className="mb-5 text-2xl font-bold">Communities <span className="text-sm font-normal text-text-secondary">({results.communities.length})</span></h2><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{results.communities.map((community) => <CommunityCard key={community.id} community={community} />)}</div></section>}
          {results.places.length > 0 && <section aria-labelledby="results-places"><h2 id="results-places" className="mb-5 text-2xl font-bold">Places to move <span className="text-sm font-normal text-text-secondary">({results.places.length})</span></h2><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{results.places.map((place) => <PlaceCard key={place.id} place={place} />)}</div></section>}
        </Reveal>}
      </div>
    </div>
  );
}
