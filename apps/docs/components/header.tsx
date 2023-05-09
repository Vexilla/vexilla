// import Link from "next/link";

import Link from "components/link";

import { Nav, InnerLink } from "components/common/header";

export default function Header(props) {
  return (
    <header className="text-gray-600 body-font fixed top-0 left-0 right-0 bg-white z-10">
      <div className="container mx-auto flex flex-wrap p-5 flex-col md:flex-row items-center max-w-screen-lg">
        <Link href="/">
          <a className="flex title-font font-medium items-center text-gray-900 mb-4 md:mb-0">
            <div className="rounded-full bg-blue-500 p-2 w-12 h-12">
              <img className="max-h-full w-auto mx-auto" src="/logo-white.svg" />
            </div>
            <span className="ml-3 text-xl">Vexilla</span>
          </a>
        </Link>
        <Nav>
          <Link href="/documentation">
            <InnerLink>Documentation</InnerLink>
          </Link>
        </Nav>

        {{ ...props.children }}

        <a
          className="inline-flex items-center bg-gray-100 border-0 py-1 px-3 focus:outline-none hover:bg-gray-200 rounded text-base mt-4 md:mt-0"
          href="/app"
        >
          App
          <svg
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            className="w-4 h-4 ml-1"
            viewBox="0 0 24 24"
          >
            <path d="M5 12h14M12 5l7 7-7 7"></path>
          </svg>
        </a>
      </div>
    </header>
  );
}
