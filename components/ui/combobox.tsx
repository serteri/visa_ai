"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ComboboxProps<T extends React.ComponentType<any>> {
  items: { value: string; label: string }[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function Combobox<T extends React.ComponentType<any>>({
  items,
  value,
  onChange,
  placeholder = "Select...",
  className,
  disabled = false,
}: ComboboxProps<T>) {
  const [open, setOpen] = React.useState(false);
  const scrollYRef = React.useRef(0);

  const handleOpenChange = (next: boolean) => {
    if (next) {
      scrollYRef.current = window.scrollY;
    }
    setOpen(next);
  };

  React.useLayoutEffect(() => {
    if (!open) return;
    const targetY = scrollYRef.current;
    // Base UI's opening focus/positioning sequence can force a native scroll after
    // this effect runs, so keep correcting for a couple of frames instead of once.
    let frames = 0;
    let rafId: number;
    const correct = () => {
      if (window.scrollY !== targetY) window.scrollTo(0, targetY);
      frames += 1;
      if (frames < 5) rafId = requestAnimationFrame(correct);
    };
    rafId = requestAnimationFrame(correct);
    return () => cancelAnimationFrame(rafId);
  }, [open]);

  return (
    <Popover open={open} onOpenChange={handleOpenChange} modal={false}>
      <PopoverTrigger
        disabled={disabled}
        render={
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn("w-full justify-between font-normal", className, disabled && "opacity-50 cursor-not-allowed")}
            disabled={disabled}
          >
            {value
              ? items.find((item) => item.value === value)?.label
              : placeholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        }
      />
      <PopoverContent side="bottom" align="start" sideOffset={4} collisionAvoidance={{ side: "none", align: "shift", fallbackAxisSide: "none" }} initialFocus={false} className="w-[--radix-popover-trigger-width] bg-background z-50 shadow-md border">
        <Command>
          <CommandInput placeholder={placeholder} autoFocus={false} />
          <CommandList>
            <CommandEmpty>No item found.</CommandEmpty>
            <CommandGroup>
              {items.map((item) => (
                <CommandItem
                  key={item.value}
                  value={item.label}
                  onSelect={() => {
                    onChange(item.value);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === item.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {item.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
