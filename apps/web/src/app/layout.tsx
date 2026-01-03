import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import {NavAuth} from "@/components/NavAuth";
import NavSearch from "@/components/NavSearch";
import ToastHost from "@/components/ToastHost";
import { BookOpenIcon } from "@heroicons/react/24/outline";
import SidebarPrimaryMenu from "@/components/SidebarPrimaryMenu";
import SidebarUserMenu from "@/components/SidebarUserMenu";
import Footer from "@/components/Footer";
import "./globals.css";

const nunito = Nunito({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: "nukBook",
  description: "Your nook book shelve.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="cupcake" className={nunito.className}>
    <body className="min-h-screen latte bg-ctp-crust text-ctp-text">
      <div className="flex h-screen overflow-hidden">
        <header
          className="sidebar fixed top-0 left-0 pl-5 z-9999 flex h-screen w-62.5 flex-col overflow-y-auto bg-ctp-crust transition-all duration-300 xl:static xl:translate-x-0 -translate-x-full">
          <div className="sidebar-header flex items-center gap-2 pt-3 pb-0 justify-between">
            <a href="/" className="btn btn-ghost btn-xl text-xl">
              <BookOpenIcon className="h-7 w-7"/>
              nukBook
            </a>
          </div>
          <SidebarPrimaryMenu/>
          <SidebarUserMenu/>
        </header>
        <div className="relative flex flex-1 flex-col overflow-x-hidden overflow-y-auto">
          <div className="navbar bg-ctp-crust/50 backdrop-blur-md sticky top-0 justify-between z-9999 px-5 gap-4">
            <div className="flex-1">
              <NavSearch/>
            </div>
            <div className="flex-none">
              <NavAuth/>
            </div>
          </div>
          <div className="p-5 pt-0">
            {children}
          </div>
          <Footer/>
        </div>
      </div>
      <ToastHost/>
    </body>
    </html>
  );
}
