import type { Metadata } from "next";
import { APPNAME } from "@/config/data";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { CalendarNav } from "@/components/calendar/calendar-nav";
import { resolveCalendarState, VIEW_LABELS } from "@/lib/calendar/navigation";

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
        <CalendarNav view={view} date={date} />
        <p className="p-8 text-center text-gray-500">
          {VIEW_LABELS[view]}ビューの表示は今後実装します。
        </p>
      </div>
      <Footer />
    </>
  );
}
