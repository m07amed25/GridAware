"use client";

import React, { useId, useMemo, useState } from "react";
import { Check, ChevronsUpDown, Globe } from "lucide-react";
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
      className={cn(
        "flex items-center justify-between gap-3",
        selected &&
          "bg-[var(--surface-4)] font-medium text-[var(--text-strong)]",
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <Check
          className={cn(
            "h-4 w-4 shrink-0 text-[var(--color-yellow)]",
            selected ? "opacity-100" : "opacity-0",
          )}
          aria-hidden="true"
        />
        <span className="truncate font-mono text-[13px]">{option.value}</span>
        {option.isLocal ? (
          <span className="shrink-0 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--surface-2)] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--text-secondary)]">
            Local
          </span>
        ) : null}
      </div>
      <span className="shrink-0 font-mono text-xs tabular-nums text-[var(--text-muted)]">
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
          aria-invalid={invalid || undefined}
          aria-describedby={ariaDescribedBy}
          disabled={disabled}
          className={cn(
            "flex min-h-[44px] w-full cursor-pointer items-center justify-between gap-2 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-2)] px-3.5 py-2.5 text-start text-base leading-5 text-[var(--text-strong)] sm:text-sm transition-colors duration-150 hover:border-[var(--border-strong)] focus-visible:border-[var(--border-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-55 aria-[invalid=true]:border-[var(--status-critical)] aria-[invalid=true]:hover:border-[var(--status-critical)]",
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
              <span className="font-mono text-xs tabular-nums text-[var(--text-muted)]">
                {selectedOffset}
              </span>
            ) : null}
            <ChevronsUpDown
              className="h-4 w-4 shrink-0 text-[var(--text-muted)]"
              aria-hidden="true"
            />
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] min-w-[300px] p-0"
      >
        <Command>
          <CommandInput placeholder="Search city, region, or UTC offset..." />
          <CommandList id={listboxId}>
            <CommandEmpty>No matching IANA time zone.</CommandEmpty>
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
        </Command>
      </PopoverContent>
    </Popover>
  );
}
