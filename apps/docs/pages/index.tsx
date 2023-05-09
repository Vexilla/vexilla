import Header from "components/header";
import Footer from "components/footer";
import Hero from "components/home/hero";
import HowItWorks from "components/home/how-it-works";
import WhatAreFeatureFlags from "components/home/what-are-feature-flags";
import Documentation from "components/home/documentation";
import Features from "components/home/features";

import Link from "components/link";
import Head from "next/head";

import { Nav, InnerLink } from "components/common/header";

export default function HomePage() {
  return (
    <>
      <Head>
        <title>Vexilla</title>
      </Head>
      <Header>
        <Nav>
          <Link href="/#feature-flags">
            <InnerLink>Feature Flags</InnerLink>
          </Link>

          <Link href="/#how-it-works">
            <InnerLink>How It Works</InnerLink>
          </Link>

          <Link href="/#features">
            <InnerLink>Features</InnerLink>
          </Link>

          <Link href="/#license">
            <InnerLink>License</InnerLink>
          </Link>
        </Nav>
      </Header>
      <Hero />
      <WhatAreFeatureFlags />
      <HowItWorks />
      <Features />
      <Documentation />
      <Footer />
    </>
  );
}
