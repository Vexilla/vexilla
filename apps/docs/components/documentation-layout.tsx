import Link from "components/link";
import Head from "next/head";

import styled from "styled-components";
import tw from "twin.macro";

import Header from "components/header";
import { Nav, InnerLink } from "components/common/header";

const PageWrapper = styled.div`
  ${tw`flex`}
`;

const Sidebar = styled.div`
  ${tw`p-4 w-1/4 overflow-scroll sticky`}

  top: 80px;
  max-height: calc(100vh - 80px);
`;

const SidebarNav = styled.nav`
  ${tw`flex flex-col bg-gray-100 rounded-lg py-4 px-8`}
`;

const SidebarLink = styled.a`
  ${tw`py-4`}
`;

const Content = styled.div`
  ${tw`flex-grow w-3/4 p-4`}
`;

export default function DocumentationLayout({ children, meta }) {
  return (
    <>
      <Head>
        <title>{meta.pageTitle}</title>
      </Head>
      <Header>
        <Nav>
          <Link href="/documentation#api">
            <InnerLink>API Docs</InnerLink>
          </Link>
        </Nav>
      </Header>
      <PageWrapper>
        <Sidebar>
          <SidebarNav>
            <div className="prose flex flex-col">
              <h3>Table of Contents</h3>
              <ul>
                <li>
                  <Link href="/documentation#getting-started">
                    <SidebarLink>Getting Started</SidebarLink>
                  </Link>
                </li>

                <li>
                  <Link href="/documentation#client-libraries">
                    <SidebarLink>Client Libraries</SidebarLink>
                  </Link>
                </li>

                <li>
                  <Link href="/documentation#config-schema">
                    <SidebarLink>Config Schema</SidebarLink>
                  </Link>
                </li>

                <li>
                  <Link href="/documentation#feature-types">
                    <SidebarLink>Feature Types</SidebarLink>
                  </Link>
                </li>

                <li>
                  <Link href="/documentation#recipes">
                    <SidebarLink>Recipes</SidebarLink>
                  </Link>
                </li>
              </ul>
            </div>
          </SidebarNav>
        </Sidebar>
        <Content className="prose">{children}</Content>
      </PageWrapper>
    </>
  );
}
