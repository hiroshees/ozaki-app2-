import type { Metadata } from "next";
import { APPNAME } from "@/config/data";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

export const metadata: Metadata = {
  title: `Home | ${APPNAME}`,
};

export default function Home() {
  return (
    <>
      <Header />
      <div className="mt-16 mb-16">
        <h1 className="p-5 text-center text-2xl font-semibold">{APPNAME}</h1>
      </div>
      <Footer />
    </>
  );
}
