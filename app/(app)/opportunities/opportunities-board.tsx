"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Flame, Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MatchCard, type MatchCardData } from "@/components/data/match-card";
import { EmptyState } from "@/components/data/empty-state";

export interface OpportunityItem {
  card: MatchCardData;
  sportKey: string;
  sportLabel: string;
  unlocked: boolean;
}

const CATEGORY_ORDER = ["football", "basketball"];

export function OpportunitiesBoard({
  items,
  pro,
  totalLimit,
  freeLimit,
}: {
  items: OpportunityItem[];
  pro: boolean;
  totalLimit: number;
  freeLimit: number;
}) {
  const categories = useMemo(() => {
    const seen = new Map<string, string>();
    for (const item of items) seen.set(item.sportKey, item.sportLabel);
    return CATEGORY_ORDER.filter((key) => seen.has(key)).map((key) => ({
      key,
      label: seen.get(key)!,
    }));
  }, [items]);

  const [selected, setSelected] = useState<string>("all");

  const visibleItems = selected === "all" ? items : items.filter((item) => item.sportKey === selected);

  const grouped = useMemo(() => {
    const map = new Map<string, OpportunityItem[]>();
    for (const item of visibleItems) {
      const list = map.get(item.sportLabel) ?? [];
      list.push(item);
      map.set(item.sportLabel, list);
    }
    return Array.from(map.entries());
  }, [visibleItems]);

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">לוח משחקים</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {totalLimit} המשחקים עם הפער האיכותי ביותר בין המודל לשוק, מדורגים לפי Opportunity Score.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={() => setSelected("all")}
          className={cn(
            "rounded-md border px-3 py-1.5 text-sm transition-colors",
            selected === "all"
              ? "border-primary/40 bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:bg-muted/50"
          )}
        >
          הכל
        </button>
        {categories.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setSelected(cat.key)}
            className={cn(
              "rounded-md border px-3 py-1.5 text-sm transition-colors",
              selected === cat.key
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:bg-muted/50"
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {!pro && items.length > 0 && (
        <Card className="mt-6 border-dashed">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Lock className="size-4" strokeWidth={1.75} />
              <span>
                {freeLimit} ההזדמנויות המובילות פתוחות בחינם. שאר {totalLimit - freeLimit} דורשות Pro.
              </span>
            </div>
            <Link href="/account/billing" className={cn(buttonVariants({ size: "sm" }))}>
              שדרג ל-Pro
            </Link>
          </CardContent>
        </Card>
      )}

      {items.length === 0 ? (
        <EmptyState
          icon={Flame}
          title="אין עדיין הזדמנויות"
          description="ברגע שהמודל יעבד משחקים קרובים, ההזדמנויות המובילות יופיעו כאן."
          className="mt-6"
        />
      ) : visibleItems.length === 0 ? (
        <EmptyState
          icon={Flame}
          title="אין הזדמנויות בקטגוריה הזו כרגע"
          description="נסה קטגוריה אחרת, או חזור מאוחר יותר."
          className="mt-6"
        />
      ) : (
        grouped.map(([sportLabel, entries]) => (
          <section key={sportLabel} className="mt-10">
            <h2 className="text-lg font-semibold tracking-tight">{sportLabel}</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {entries.map(({ card, unlocked }) => (
                <MatchCard key={card.matchId} match={card} locked={!unlocked} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
