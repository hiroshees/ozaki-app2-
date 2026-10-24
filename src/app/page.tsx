import type { Metadata } from "next";
import { APPNAME } from "@/config/data";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { EventCalendar } from "@/components/calendar/event-calendar";
import { resolveCalendarState } from "@/lib/calendar/navigation";

export const metadata: Metadata = {
  title: `Home | ${APPNAME}`,
};

type HomeProps = {
  searchParams: Promise<{
    view?: string | string[];
    date?: string | string[];
  }>;
};

export default async function Home({ searchParams }: HomeProps) {
  // 表示状態は URL の searchParams が唯一の情報源。不正な値は月ビュー・今日にそろえる
  const { view, date } = resolveCalendarState(await searchParams, new Date());

  return (
    <>
      <Header />
      <div className="mt-16 mb-16">
        <EventCalendar view={view} date={date} />
      </div>
      <Footer />
    </>
  );
}
