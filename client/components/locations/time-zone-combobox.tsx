"use client";

import React, { useId, useMemo, useState } from "react";
import { Check, ChevronDown, Globe } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  getTimeZoneCatalog,
  getTimeZoneOffsetLabel,
  type TimeZoneOption,
} from "@/lib/locations/time-zones.mjs";
import { cn } from "@/lib/utils";

interface TimeZoneComboboxProps {
  id?: string;
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  ariaDescribedBy?: string;
  placeholder?: string;
  className?: string;
}

function detectBrowserTimeZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

function TimeZoneItemRow({
  option,
  selected,
  onSelect,
}: {
  option: TimeZoneOption;
  selected: boolean;
  onSelect: (value: string) => void;
}) {
  return (
    <CommandItem
      value={option.value}
      keywords={option.keywords}
      onSelect={() => onSelect(option.value)}
      title={option.value}
      className={cn(
        "min-h-[56px] gap-3 px-2.5 py-2",
        selected && "bg-[var(--surface-4)]",
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Check
          className={cn(
            "h-4 w-4 shrink-0 text-[var(--color-yellow)]",
            selected ? "opacity-100" : "opacity-0",
          )}
          aria-hidden="true"
        />
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate font-mono text-[13px] text-[var(--text-strong)]">
              {option.value}
            </span>
            {option.isLocal ? (
              <span className="shrink-0 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--surface-2)] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--text-secondary)]">
                Local
              </span>
            ) : null}
          </div>
          <span className="mt-0.5 block truncate text-xs text-[var(--text-muted)]">
            {option.region === "Universal"
              ? "Universal time"
              : `${option.region} region`}
          </span>
        </div>
      </div>
      <span className="shrink-0 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--surface-2)] px-2 py-1 font-mono text-[11px] tabular-nums text-[var(--text-secondary)]">
        {option.offset}
      </span>
    </CommandItem>
  );
}

export function TimeZoneCombobox({
  id,
  value,
  onValueChange,
  disabled = false,
  invalid = false,
  ariaDescribedBy,
  placeholder = "Select IANA time zone",
  className,
}: TimeZoneComboboxProps) {
  const [open, setOpen] = useState(false);
  const listboxId = useId();
  const referenceDate = useMemo(() => new Date(), []);

  const catalog = useMemo(() => {
    const detectedTimeZone = detectBrowserTimeZone();
    return getTimeZoneCatalog({
      date: referenceDate,
      detectedTimeZone,
      selectedTimeZone: value,
    });
  }, [referenceDate, value]);

  const selectedOffset = useMemo(
    () => (value ? getTimeZoneOffsetLabel(value, referenceDate) : null),
    [value, referenceDate],
  );

  function handleSelect(nextTimeZone: string) {
    onValueChange(nextTimeZone);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-haspopup="listbox"
          aria-invalid={invalid || undefined}
          aria-describedby={ariaDescribedBy}
          disabled={disabled}
          className={cn(
            "group flex min-h-[44px] w-full cursor-pointer items-center justify-between gap-2 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-2)] px-3.5 py-2.5 text-start text-base leading-5 text-[var(--text-strong)] transition-[background-color,border-color] duration-150 hover:border-[var(--border-strong)] hover:bg-[var(--surface-3)] focus-visible:border-[var(--border-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] data-[state=open]:border-[var(--border-strong)] data-[state=open]:bg-[var(--surface-3)] disabled:cursor-not-allowed disabled:opacity-55 aria-[invalid=true]:border-[var(--status-critical)] aria-[invalid=true]:hover:border-[var(--status-critical)] sm:text-sm",
            className,
          )}
        >
          <span className="flex min-w-0 items-center gap-2">
            <Globe
              className="h-4 w-4 shrink-0 text-[var(--text-muted)]"
              aria-hidden="true"
            />
            {value ? (
              <span className="truncate font-mono">{value}</span>
            ) : (
              <span className="truncate text-[var(--text-muted)]">
                {placeholder}
              </span>
            )}
          </span>
          <span className="flex shrink-0 items-center gap-2">
            {selectedOffset ? (
              <span className="hidden rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--surface-3)] px-1.5 py-0.5 font-mono text-[11px] tabular-nums text-[var(--text-secondary)] sm:inline-flex">
                {selectedOffset}
              </span>
            ) : null}
            <ChevronDown
              className="h-4 w-4 shrink-0 text-[var(--text-muted)] transition-transform duration-200 group-data-[state=open]:rotate-180"
              aria-hidden="true"
            />
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="grid max-h-[var(--radix-popover-content-available-height)] w-[var(--radix-popover-trigger-width)] max-w-[calc(100vw-2rem)] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden p-0"
      >
        <Command label="Time zones" defaultValue={value} loop className="contents">
          <CommandInput
            aria-label="Search time zones"
            placeholder="Search city, region, or UTC offset..."
            autoComplete="off"
            spellCheck={false}
          />
          <CommandList
            id={listboxId}
            aria-label="Time zones"
            className="min-h-0 p-1.5"
          >
            <CommandEmpty>
              <span className="block text-sm text-[var(--text-secondary)]">
                No matching time zones
              </span>
              <span className="mt-1 block text-xs">
                Try a city, region, or UTC offset.
              </span>
            </CommandEmpty>
            <CommandGroup heading="Common & local">
              {catalog.recommended.map((option) => (
                <TimeZoneItemRow
                  key={option.value}
                  option={option}
                  selected={option.value === value}
                  onSelect={handleSelect}
                />
              ))}
            </CommandGroup>
            {catalog.all.length > 0 ? (
              <>
                <CommandSeparator />
                <CommandGroup heading="All IANA time zones">
                  {catalog.all.map((option) => (
                    <TimeZoneItemRow
                      key={option.value}
                      option={option}
                      selected={option.value === value}
                      onSelect={handleSelect}
                    />
                  ))}
                </CommandGroup>
              </>
            ) : null}
          </CommandList>
          <div
            className="flex items-center justify-between gap-3 border-t border-[var(--border-subtle)] px-3 py-2 text-[11px] text-[var(--text-muted)]"
            aria-hidden="true"
          >
            <span>IANA time zones</span>
            <span className="hidden items-center gap-1.5 sm:flex">
              <kbd className="rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--surface-3)] px-1 py-0.5 font-mono text-[10px] text-[var(--text-secondary)]">
                ↑
              </kbd>
              <kbd className="rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--surface-3)] px-1 py-0.5 font-mono text-[10px] text-[var(--text-secondary)]">
                ↓
              </kbd>
              <span>navigate</span>
              <kbd className="rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--surface-3)] px-1 py-0.5 font-mono text-[10px] text-[var(--text-secondary)]">
                ↵
              </kbd>
              <span>select</span>
            </span>
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
