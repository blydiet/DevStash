import type { ItemDetail } from "@/lib/db/items-queries";
import type { UploadedFile } from "@/components/dashboard/FileUpload";

export interface EditForm {
  title: string;
  description: string;
  content: string;
  url: string;
  language: string;
  file: UploadedFile | null;
  tags: string;
  collectionIds: string[];
}

export function toEditForm(item: ItemDetail): EditForm {
  return {
    title: item.title,
    description: item.description ?? "",
    content: item.content ?? "",
    url: item.url ?? "",
    language: item.language ?? "plaintext",
    file: item.fileUrl
      ? { fileUrl: item.fileUrl, fileName: item.fileName ?? "", fileSize: item.fileSize ?? 0 }
      : null,
    tags: item.tags.join(", "),
    collectionIds: item.collections.map((collection) => collection.id),
  };
}

export function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
