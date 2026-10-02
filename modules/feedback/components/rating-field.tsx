"use client";

import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";

export function RatingField({
  value,
  onChange,
  label = "Sua nota",
}: {
  value: number;
  onChange: (rating: number) => void;
  label?: string;
}) {
  return (
    <div>
      <p className="text-sm font-medium">{label}</p>
      <div className="mt-2 flex gap-1" role="radiogroup" aria-label={label}>
        {[1, 2, 3, 4, 5].map((rating) => (
          <Button
            key={rating}
            type="button"
            size="icon"
            variant="ghost"
            role="radio"
            aria-checked={value === rating}
            aria-label={`${rating} ${rating === 1 ? "estrela" : "estrelas"}`}
            onClick={() => onChange(rating)}
            className={rating <= value ? "text-primary" : "text-muted-foreground/45"}
          >
            <Star className={rating <= value ? "fill-current" : ""} />
          </Button>
        ))}
      </div>
    </div>
  );
}
