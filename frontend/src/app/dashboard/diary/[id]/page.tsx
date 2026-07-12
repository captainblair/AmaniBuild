import { DiaryEntryDetailPage } from "@/components/diary/DiaryEntryDetailPage";
import "@/styles/diary.css";

export const metadata = { title: "Diary entry" };

type Props = {
  params: Promise<{ id: string }>;
};

export default async function DiaryEntryRoutePage({ params }: Props) {
  const { id } = await params;
  return <DiaryEntryDetailPage entryId={id} />;
}
