import { XIcon } from "lucide-react";
import { DialogClose } from "@/components/ui/dialog";

// Shared by dialogs rendering with showCloseButton={false} (CreateCollectionDialog's
// predecessor, EditCollectionDialog's predecessor, CreateItemDialog) — those
// dialogs turn off shadcn's built-in close button and render this instead,
// positioned after DialogHeader rather than nested inside it, for FocusLock
// ordering.
export function DialogCloseXButton() {
  return (
    <DialogClose className="absolute top-2 right-2 inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground">
      <XIcon className="size-4" />
      <span className="sr-only">Close</span>
    </DialogClose>
  );
}
