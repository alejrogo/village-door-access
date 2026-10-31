import { useCallback, useEffect, useState } from "react";
import type { ChangeEvent } from "react";

import { locationPickerMode } from "@/lib/access.rules";
import type { LocationRow } from "@/lib/access.types";
import { cn } from "@/lib/utils";

function usePickerViewport(): "mobile" | "desktop" {
  const [viewport, setViewport] = useState<"mobile" | "desktop">("mobile");
  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const update = () => {
      setViewport(media.matches ? "desktop" : "mobile");
    };
    update();
    media.addEventListener("change", update);
    return () => {
      media.removeEventListener("change", update);
    };
  }, []);
  return viewport;
}

export function LocationPicker({
  locations,
  value,
  onChange,
  label = "Ubicación",
}: {
  locations: LocationRow[];
  value: string;
  onChange: (id: string) => void;
  label?: string;
}) {
  const viewport = usePickerViewport();
  const count = locations.length;
  const handleSelectChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      onChange(event.target.value);
    },
    [onChange]
  );

  if (count === 0) {
    return null;
  }

  if (locationPickerMode(count, viewport) === "select") {
    return (
      <label className="block">
        <span className="sr-only">{label}</span>
        <select
          className="h-12 w-full min-w-0 rounded-lg bg-surface px-3.5 text-base text-fg shadow-line outline-none focus-visible:shadow-focus"
          onChange={handleSelectChange}
          value={value}
        >
          {value ? null : (
            <option disabled value="">
              Elige una ubicación
            </option>
          )}
          {locations.map((location) => (
            <option key={location.id} value={location.id}>
              {location.archived
                ? `${location.name} (archivada)`
                : location.name}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <div aria-label={label} className="flex flex-wrap gap-2" role="tablist">
      {locations.map((location) => (
        <LocationTab
          archived={location.archived}
          id={location.id}
          key={location.id}
          name={location.name}
          onChange={onChange}
          selected={location.id === value}
        />
      ))}
    </div>
  );
}

function LocationTab({
  id,
  name,
  archived,
  selected,
  onChange,
}: {
  id: string;
  name: string;
  archived: boolean;
  selected: boolean;
  onChange: (id: string) => void;
}) {
  const handleClick = useCallback(() => {
    onChange(id);
  }, [id, onChange]);
  return (
    <button
      aria-selected={selected}
      className={cn(
        "h-11 min-h-11 rounded-lg px-3 text-sm font-medium transition-colors",
        selected
          ? "bg-primary text-primary-fg"
          : "bg-surface text-fg shadow-line hover:bg-chip"
      )}
      onClick={handleClick}
      role="tab"
      type="button"
    >
      {name}
      {archived ? (
        <span className="ml-2 text-xs font-normal opacity-70">Archivada</span>
      ) : null}
    </button>
  );
}
