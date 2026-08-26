"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ITEM_TYPES, type ItemType } from "@/lib/item-types";

export function ItemTypeSelect({
  value,
  onChange,
}: {
  value: ItemType;
  onChange: (value: ItemType) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="item-type">Type</Label>
      <Select value={value} onValueChange={(v) => onChange(v as ItemType)}>
        <SelectTrigger id="item-type" className="w-full rounded-[5px]">
          <SelectValue>
            {(value: string) => {
              const selected = ITEM_TYPES.find(
                (type) => type.value === value || type.label === value
              );
              if (!selected) return value;
              return (
                <>
                  <selected.icon className="size-4" style={{ color: selected.color }} />
                  {selected.label}
                </>
              );
            }}
          </SelectValue>
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false}>
          {ITEM_TYPES.map((type) => (
            <SelectItem key={type.value} value={type.value}>
              <type.icon className="size-4" style={{ color: type.color }} />
              {type.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
