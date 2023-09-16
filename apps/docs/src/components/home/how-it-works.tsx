import type { PropsWithChildren, ReactNode } from "react";

import { Icon, type IconifyIcon } from "@iconify/react";
import settingsLinear from "@iconify/icons-solar/settings-linear";
import importOutline from "@iconify/icons-solar/import-outline";
import boxLinear from "@iconify/icons-solar/box-linear";
import moneyBagOutline from "@iconify/icons-solar/money-bag-outline";

function ListNumber({ children }: PropsWithChildren<{}>) {
  return (
    <div className="z-1 flex-shrink-0 w-6 h-6 rounded-full mt-10 sm:mt-0 inline-flex items-center justify-center bg-primary-500 text-white relative font-medium text-sm">
      {children}
    </div>
  );
}

interface StepContent {
  title: string;
  description: string;
  image: any;
}

const steps: StepContent[] = [
  {
    title: "Configure your settings",
    description: "Using the app create your environments and features.",
    image: <Icon className="w-12 h-12" icon={settingsLinear} />,
  },

  {
    title: "Import a client",
    description: "Choose the client library that applies to your backend.",
    image: <Icon className="w-12 h-12" icon={importOutline} />,
  },

  {
    title: "Wrap your feature",
    description:
      "Using the client library in your frontend and/or backend, write if statements that decide what to do.",
    image: <Icon className="w-12 h-12" icon={boxLinear} />,
  },

  {
    title: "Profit!",
    description:
      "You now have a feature flag. Wire it up to analytics and you basically have A/B testing.",
    image: <Icon className="w-12 h-12" icon={moneyBagOutline} />,
  },
];

export function HomeHowItWorks() {
  return (
    <section className="text-normal body-font" id="how-it-works">
      <div className="container px-5 py-24 mx-auto flex flex-wrap">
        {steps.map((step, index) => (
          <div
            className="flex relative pt-10 pb-20 sm:items-center md:w-2/3 mx-auto"
            key={step.title}
          >
            <div className="h-full w-6 absolute inset-0 flex items-center justify-center">
              <div className="h-full w-1 bg-gray-200 pointer-events-none"></div>
            </div>
            <ListNumber>{index + 1}</ListNumber>
            <div className="flex-grow md:pl-8 pl-6 flex sm:items-center items-start flex-col sm:flex-row">
              <div className="flex-shrink-0 w-24 h-24 bg-slate-100 text-primary-500 rounded-full inline-flex items-center justify-center">
                {/* <Icon className="w-12 h-12" icon={step.image} /> */}
                {step.image}
              </div>
              <div className="flex-grow sm:pl-6 mt-6 sm:mt-0">
                <h2 className="font-medium title-font text-emphasis mb-1 text-xl">
                  {step.title}
                </h2>
                <p className="leading-relaxed">{step.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
