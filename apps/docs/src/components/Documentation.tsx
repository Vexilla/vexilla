import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

import { Icon } from "@iconify/react";
import roundDoubleAltArrowRightLinear from "@iconify/icons-solar/round-double-alt-arrow-right-linear";

import { buttonVariants } from "@/components/ui/button";
import {
  ChefHatIcon,
  BookIcon,
  RocketIcon,
  DocumentIcon,
  NextIcon,
} from "@/components/Icons";
interface HelpSection {
  icon: () => JSX.Element;
  title: string;
  description: string;
  link: string;
  linkText: string;
}

const sections: HelpSection[] = [
  {
    title: "Getting Started",
    description:
      "We have put in a lot of effort to make sure that you can get up and running as quickly as possible.",
    link: "/documentation/getting-started",
    linkText: "Get Started",
    icon: RocketIcon,
  },

  {
    title: "Core Concepts",
    description:
      "There are a couple fundamental concepts to understand about Vexilla",
    link: "/documentation/core-concepts",
    linkText: "Learn More",
    icon: BookIcon,
  },

  {
    title: "Recipes",
    description:
      "Vexilla is fairly unopinionated about how you wire it up to your application. Here are a couple recipes to get you up and running.",
    link: "/documentation/recipes",
    linkText: "Start Cooking",
    icon: ChefHatIcon,
  },

  {
    title: "Contributing",
    description:
      "There is always more work to do. We would love it if you wanted to help improve the docs, translations, or Client SDK support.",
    link: "/documentation/contributing",
    linkText: "Join the Party",
    icon: DocumentIcon,
  },
];

export function Documentation() {
  return (
    <>
      <h1>Documentation</h1>

      <Icon
        icon={roundDoubleAltArrowRightLinear}
        width={48}
        className="w-[48px]  min-w-[48px]"
      />

      <div className="flex flex-wrap">
        {sections.map((section) => (
          <div className="w-full xl:w-1/2 p-2">
            <Card className="h-full flex flex-col">
              <CardHeader>
                <CardTitle className="!m-0 flex flex-row items-center">
                  <section.icon />
                  <a href={section.link} className="no-underline ml-2">
                    {section.title}
                  </a>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col h-full">
                <p className="flex flex-1">{section.description}</p>
                <div className="flex flex-row justify-end mt-auto">
                  <a
                    className={`flex flex-row items-center no-underline ${buttonVariants(
                      {
                        variant: "outline",
                      }
                    )}`}
                    href={section.link}
                    aria-hidden="true"
                  >
                    {section.linkText}

                    <div className="ml-2">
                      <Icon icon={roundDoubleAltArrowRightLinear} />
                    </div>
                  </a>
                </div>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    </>
  );
}
