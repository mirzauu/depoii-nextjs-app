"use client";

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { OwnerDossierView, type OwnerDetailData } from "@/components/owner-dossier-view";

export type { OwnerDetailData };

export function OwnerPortfolioDrawer({
  ownerId,
  onClose,
}: {
  ownerId: string | null;
  onClose: () => void;
}) {
  return (
    <Sheet open={!!ownerId} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-full sm:w-[90vw] md:w-[80vw] lg:w-[65vw] xl:w-[60vw] 2xl:w-[55vw] min-w-[50vw] sm:max-w-none p-0 flex flex-col h-full overflow-hidden border-l border-border dark:border-neutral-800 shadow-2xl bg-background"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Owner & REIT Portfolio Dossier</SheetTitle>
          <SheetDescription>Comprehensive commercial asset portfolio, roof lifecycle, and executive contacts.</SheetDescription>
        </SheetHeader>
        {ownerId && (
          <OwnerDossierView
            ownerId={ownerId}
            onBack={onClose}
            backLabel="Close"
            isDrawer={true}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
