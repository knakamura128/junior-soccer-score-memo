import { CalendarExportClient } from "@/components/calendar-export-client";

type CalendarExportPageProps = {
  searchParams: Promise<{
    month?: string;
    tag?: string;
  }>;
};

export default async function CalendarExportPage({ searchParams }: CalendarExportPageProps) {
  const params = await searchParams;

  return <CalendarExportClient month={params.month || ""} tag={params.tag || ""} />;
}
